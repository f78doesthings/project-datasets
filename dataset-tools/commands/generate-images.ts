import {Command} from "@commander-js/extra-typings";
import chalk from "chalk";
import {getDataset} from "../utils/dataset";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {createProgressBar, randint, sleep} from "../utils/misc";
import readlineSync from "readline-sync";

interface ComfyQueue {
	queue_running: unknown[];
	queue_pending: unknown[];
}

type Prompts = Record<string, string>;
type DefaultPrompts = Record<string, Prompts>;

interface ParsedPrompts {
	positive?: Prompts;
	negative?: Prompts;
	seed?: Record<string, number>;
}

const defaultPrompts: DefaultPrompts = {
	"pet-shelter": {
		pets:
			"A photograph of a very cute, <characteristics:t><age>-year-old <:young><gender:t> domestic <species:tfl><:breed><:fur>, " +
			"<:scenery>, alone{|, looking slightly toward camera}{|, side angle}",
		shelters:
			'A photograph of the outside of a {fairly large|somewhat long|somewhat long}{||, modern} animal shelter ' +
			'and its entrance, with an indoors reception area, and with kennels both inside and outside, ' +
			'located in a town in Flanders, Belgium',
	}
}

const baseNegativePrompt =
	"cartoon, anime, illustration, CGI, 3D render, plastic skin, waxy, porcelain, doll-like, oversmoothed, " +
	"airbrushed, uncanny, mangled anatomy, unrealistic reflections, melted objects, " +
	"low-res, compression artifacts, banding, oversharpened halos, text, watermark, logo, ";

const defaultNegativePrompts: DefaultPrompts = {
	"pet-shelter": {
		shelters: "warped lines or bricks, signs, humans outside the reception area, animals outside the kennels"
	}
};

const translations = new Map<string, string>([
	// Species
	["kat", "cat"],
	["hond", "dog"],
	["konijn", "rabbit"],
	["cavia", "guinea pig"],

	// Gender
	["mannelijk", "masculine"],
	["vrouwelijk", "feminine"],

	// Characteristics
	["vrolijk", "cheerful"],
	["speels", "playful"],
	["rustig", "calm"],
	["knuffelig", "cuddly"],
	["energiek", "energetic"],
	["actief", "active"],
	["vriendelijk", "friendly"],
	["nieuwsgierig", "curious"],
	["loyaal", "loyal"],
	["sociaal", "social"],
	["gezellig", "sociable"],
	["slim", "clever"],
	["zachtaardig", "gentle"],
	["avontuurlijk", "adventurous"],
	["terughoudend", "reluctant"],
	["waakzaam", "vigilant"],

	// Breed
	["europees korthaar", "European Shorthair"],
	["noorse boskat", "Norwegian Forest Cat"],
	["duitse herder", "German Shepherd"],
	["staffordshire-bulterriër", "Staffordshire Bull Terrier"],
	["bordercollie", "Border Collie"],
	["nederlandse hangoordwerg", "Holland Lop"],
	["tankonijn", "Tan rabbit"],
	["gladhaar", "American guinea pig"],
	["engels gekruind", "English Crested, with a distinctive crest of hair on its head in the same color as its body"],
	["goudhamster", "golden hamster"],
	["russische dwerghamster", "winter white dwarf hamster"],
]);

const DONE_TEXT = `
███████    ██████   ███   ██  ████████  ██
██    ██  ██    ██  ████  ██  ██        ██
██    ██  ██    ██  ██ ██ ██  ██████    ██
██    ██  ██    ██  ██  ████  ██
███████    ██████   ██   ███  ████████  ██
`;

/**
 * A list of possible flags (case-insensitive, and always applied in this order):
 * - `t` - Attempts to translate the text (see {@linkcode translations}).
 * - `f` - If `t` is given, falls back to the original text instead of returning an empty string.
 * - `l` - Makes the text lowercase.
 */
function applyFlags(value: unknown, flags: string): string {
	let text = `${value}`;

	if (flags.includes("t")) {
		text = translations.get(text.toLowerCase()) ?? (flags.includes("f") ? text : "");
	}

	if (flags.includes("l")) {
		text = text.toLowerCase();
	}

	return text;
}

export const generateImages = new Command("generate-images")
	.description("Generates images for a dataset. Intended for use with a local, unconfigured ComfyUI server.")
	.aliases(["gi", "gen", "generate", "genimg", "genimgs"])
	.argument("<dataset>", "The path to the dataset to generate images for.")
	.option("-y, --yes", "Prevents asking any questions.")
	.option(
		"-w, --whitelist <patterns>",
		"A comma-separated list of IDs that should have images generated. Defaults to all images.\n" +
		'For example: "pets/2, pets/10, shelters/1" or "shelters"'
	)
	.option(
		"-b, --blacklist <patterns>",
		"A comma-separated list of IDs that should be skipped. Works with the whitelist."
	)
	.option(
		"-p, --prompts <JSON>",
		"Overrides the (positive) prompts for each given data type in the dataset, in JSON format.\n" +
		"Prompts can have placeholders in the form of <property:flags> or <:special_property>.",
		"{}"
	)
	.option(
		"-r, --retry",
		"If specified, the previous prompts will be re-used. Useful in case of a crash."
	)
	.option(
		"-n, --negative-prompts <JSON>",
		"Same as --prompts, but for negative prompts instead. Ignored if the workflow does not support them.",
		"{}"
	)
	.option(
		"-u, --url <URL>",
		"The address that ComfyUI is listening on.",
		"http://localhost:8188"
	)
	.option(
		"-W, --workflow <path>",
		"The path to the workflow to run, relative to the current working directory.\n" +
		"The workflow must be in API format (enable Developer Mode in ComfyUI and choose File -> Export (API) in the main menu), " +
		"and must contain the $PROMPT$ and $PATH$ templates, which will be replaced with the prompt and the file name, respectively. " +
		"It can also contain the $NEGATIVE_PROMPT$ template for models that support negative prompts.",
		"workflows/z-image-turbo.json"
	)
	.action(async (datasetPath, options) => {
		const dataset = await getDataset(datasetPath);
		const whitelist = options.whitelist ? options.whitelist.split(/, */) : undefined;
		const blacklist = options.blacklist ? options.blacklist.split(/, */) : undefined;

		const workflowTemplate = await fs.readFile(options.workflow, "utf-8");
		const workflows: Record<string, string> = {};

		const prompts: Record<string, unknown> = JSON.parse(options.prompts);
		const negativePrompts: Record<string, unknown> = JSON.parse(options.negativePrompts);
		const promptsPath = path.join(datasetPath, "images", "prompts.json");
		const oldParsedPrompts: ParsedPrompts = JSON.parse(await fs.readFile(promptsPath, "utf-8"));
		const parsedPrompts: ParsedPrompts = {};

		let total = 0;
		let queued = 0;
		let coatColorIndex = 0;
		let quitting = true; // Set this to true initially to indicate we haven't submitted a prompt to ComfyUI yet

		// Event handlers
		const onInterrupt = async () => {
			if (quitting) {
				return;
			}

			quitting = true;
			console.info(chalk.yellowBright("Telling ComfyUI to abort..."));

			await fetch(options.url + "/queue", {
				method: "POST",
				body: '{"clear":true}'
			});

			await fetch(options.url + "/interrupt", {
				method: "POST"
			});

			process.exit(1);
		};

		const onError = async (e: unknown) => {
			console.error(chalk.redBright("\n\nUnhandled exception:\n"), e, "\n");
			await onInterrupt();
		};

		process.on("SIGINT", async () => {
			if (quitting) {
				return;
			}

			console.info(chalk.yellowBright("\n\nReceived interrupt!"));
			await onInterrupt();
		});
		process.on("uncaughtException", onError);
		process.on("unhandledRejection", onError);

		for (const {dataType, data} of dataset.entries) {
			const name = `${dataType}/${data.id}`;
			const promptTemplate = prompts?.[dataType] ?? defaultPrompts[dataset.name]?.[dataType];
			if (typeof promptTemplate !== "string") {
				throw new Error(`Missing or invalid prompt for ${dataType}: ${promptTemplate}`);
			}

			// Prompts
			const prompt = (options.retry && oldParsedPrompts.positive?.[name]) ?? promptTemplate
				// Placeholders
				.replace(/<(?<property>\w*)(?::(?<flags>\w*))?>/g,
					(_, property: string, flags: string) => {
						if (flags) {
							flags = flags.toLowerCase();
						} else {
							flags = "";
						}

						// Special properties
						if (property === "") {
							const description = `${data.description}`;
							switch (flags) {
								case "young":
									return /(jong|klein)/.test(description) || data.age === 1 ? "young " : "";

								case "scenery": {
									const inside = "inside an animal shelter";
									const outOrInside = `outside in an animal shelter|${inside}`;

									switch (data.species) {
										case "Konijn":
											return `{${outOrInside}}`;

										case "Hond":
											return `{outside in a park|outside near an animal shelter's entrance|${outOrInside}}`;

										default:
											return inside;
									}
								}

								case "fur": {
									let color: string = "";
									if (data.species === "Kat") {
										const colors = [
											"black ",
											"",
											"white ",
											"red tabby ",
											"cream tabby ",
											"blue tabby ",
										];
										color = colors[coatColorIndex];
										coatColorIndex++;
									} else {
										return "";
									}

									let text = ` with {somewhat smooth|smooth}`;
									if (description.includes("zachte vacht")) {
										text += ", soft";
									} else if (description.includes("halflange vacht")) {
										text += `, fairly long`;
									} else if (description.includes("vacht is kort en glanzend")) {
										text += `, short, shiny`;
									}

									if (color) {
										text += ` ${color}`
									}
									return `${text}fur`;
								}

								case "breed": {
									const text = applyFlags(data.breed, "tf");
									return text ? ` (a ${text}, to be exact)` : "";
								}

								default:
									throw new Error(`Unknown custom property: ${flags}`);
							}
						}

						const value = data[property];
						if (Array.isArray(value)) {
							const text = value
								.map(x => applyFlags(x, flags))
								.filter(x => x !== "")
								.join(", ");

							return text !== "" ? text + " " : text;
						} else {
							return applyFlags(value, flags) ?? "";
						}
					})
				// Random prompts (ComfyUI also supports this, but it didn't work in this case,
				// may be seed related or only supported by the web interface)
				.replace(/\{(.*?(?:\|.*?)*)}/g,
					(_, content: string) => {
						const options = content.split("|");
						return options[randint(options.length)];
					});

			if (
				(whitelist && !whitelist.some(item => name.includes(item))) ||
				blacklist?.some(item => name.includes(item))
			) {
				continue;
			}

			const negativePrompt = (options.retry && oldParsedPrompts.negative?.[name]) ??
				baseNegativePrompt + (negativePrompts?.[dataType] ?? defaultNegativePrompts[dataset.name]?.[dataType] ?? "");

			console.debug(`Positive prompt for ${chalk.white(name)}:`, chalk.green(prompt));
			(parsedPrompts.positive ??= {})[name] = prompt;

			if (workflowTemplate.includes("$NEGATIVE_PROMPT$") && negativePrompt) {
				console.debug(`  Negative prompt:`, chalk.red(negativePrompt));
				(parsedPrompts.negative ??= {})[dataType] = negativePrompt;
			}

			let workflow = workflowTemplate
				.replaceAll("$PROMPT$", prompt.replaceAll('"', '\\"'))
				.replaceAll("$NEGATIVE_PROMPT$", negativePrompt.replaceAll('"', '\\"'))
				.replaceAll("$PATH$", `${dataset.name}/${name}`);

			// Apply a random seed to the workflow
			const seed = randint(Number.MAX_SAFE_INTEGER);
			workflow = workflow.replace(/"seed":\s*\d+/, `"seed":${seed}`);

			console.log(`  Seed: ${chalk.yellow(seed)}\n`);
			(parsedPrompts.seed ??= {})[name] = seed;

			workflows[name] = (workflow);
		}

		if (!options.yes) {
			if (!readlineSync.keyInYNStrict("Are you happy with these prompts?")) {
				console.info("Okay, bye then!");
				return;
			}
			console.info(`Alright, submitting the prompts to the ComfyUI server at ${options.url}...`);
		} else {
			console.info(`Submitting the prompts to the ComfyUI server at ${options.url}...`);
		}

		for (const [name, workflow] of Object.entries(workflows)) {
			const response = await fetch(options.url + "/prompt", {
				method: "POST",
				body: `{"prompt":${workflow}}`
			});

			if (!response.ok) {
				console.error(
					chalk.redBright(`The ComfyUI server returned an error for ${name}, skipping (status code ${response.status}):\n`) +
					await response.text()
				);
			} else {
				queued++;

				// Now that we have submitted a prompt, set this to false so that
				// crashes and interrupts will tell ComfyUI to stop generating images
				if (quitting) {
					quitting = false;
				}
			}

			total++;
			await sleep(15); // This isn't really needed in my case, but just to be sure...
		}

		let done = queued === 0;
		if (!done) {
			// TODO: write a deep copy function to fix prompt saving
			//await fs.writeFile(promptsPath, JSON.stringify({...oldParsedPrompts, ...parsedPrompts}, null, 2));

			console.info(
				`${chalk.green(queued)} of the ${chalk.white(total)} prompts have been submitted.`,
				"\n\nThis is going to take a while, so sit back, relax and watch some YouTube on your phone.",
				"\nOr go outside. Or anything that doesn't involve using your computer or staring at progress bars.",
				`\n\nPress ${chalk.yellow("Control+C")} at any time to abort.`,
				chalk.cyan("\nTip:"),
				chalk.white("Refer to the ComfyUI web interface and console output to see progress in detail.\n")
			);

			const {progressBar, multiBar} = createProgressBar(queued, {
				fps: 1,
				etaAsynchronousUpdate: true,
				etaBuffer: 200,
			});

			do {
				const response = await fetch(options.url + "/queue");
				if (response.ok) {
					const data = await response.json() as ComfyQueue;
					const remaining = data.queue_running.length + data.queue_pending.length;

					done = remaining <= 0;
					progressBar.update(total - remaining);
				} else {
					multiBar.log(
						chalk.yellow(
							`The ComfyUI server returned an error while trying to fetch queue status (status code ${response.status}):\n`
						) + await response.text() + "\n"
					);
				}

				if (!done) {
					await sleep(2000);
				}
			} while (!done && !quitting);

			multiBar.stop();
			console.log(chalk.green(DONE_TEXT) + "\x07");
		}
	});
