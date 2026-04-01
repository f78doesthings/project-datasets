import {Command} from "@commander-js/extra-typings";
import {getDataset} from "../utils/dataset";
import {ProcessManager} from "../utils/processes";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import {createProgressBar} from "../utils/misc";
import chalk from "chalk";

interface Image {
	inputPath: string;
	outputPath: string;
	command: string;
}

export const convertImages = new Command("convert-images")
	.description(
		"Converts images from ComfyUI output for a dataset.\n" +
		"This requires that you have ImageMagick installed and have its 'magick' executable in your PATH."
	)
	.aliases(["ci", "conv", "convert", "convimg", "convimgs"])
	.argument("<dataset>", "The path to the dataset.")
	.option("-C, --clear", "If specified, the output directory is cleared first.")
	.option(
		"-i, --input <path>",
		"The path to ComfyUI's output directory.",
		"/mnt/Data/Applications/ComfyUI/output"
	)
	.option(
		"-w, --width <pixels>",
		"The desired width of the converted images, in pixels. Defaults to the original width if unspecified."
	)
	.option(
		"-q, --quality <number>",
		"The quality of the converted images. For most formats this is a number between 1 and 100. " +
		"For other formats, refer to the ImageMagick documentation: https://imagemagick.org/script/command-line-options.php#quality",
		"80"
	)
	.option(
		"-f, --format <format>",
		"The format of the converted images, for example \"jpg\", \"webp\" or \"avif\".",
		"webp"
	);

convertImages.action(async (datasetPath, options) => {
	const processes = new ProcessManager();
	const dataset = await getDataset(datasetPath);
	const imagesPath = path.join(datasetPath, "images");
	const images: Image[] = [];

	if (options.clear) {
		try {
			await fs.rm(imagesPath, {recursive: true, force: true});
		} catch (e) {
			console.warn(chalk.yellow("Failed to clear output directory:\n"), e);
		}
	}

	for (const {dataType, data} of dataset.entries) {
		const inputDirectory = path.join(options.input, dataset.name, dataType);
		const outputDirectory = path.join(imagesPath, dataType);

		// Find the most recently modified file
		let mostRecentTime = 0;
		let inputPath: string | undefined;

		for (const fileName of await fs.readdir(inputDirectory)) {
			const filePath = path.join(inputDirectory, fileName);
			const stats = await fs.stat(filePath);
			if (!stats.isFile()) {
				continue;
			}

			// The file name should be <id>_<imageNumber>_.png, where <id> is the ID of the dataset entry.
			// Here we extract the ID and check if it matches.
			const id = fileName.match(/^(?<id>[\w-]+)_\d+/)?.groups?.id;
			if (id !== `${data.id}`) {
				continue;
			}

			if (stats.isFile() && stats.mtimeMs > mostRecentTime) {
				mostRecentTime = stats.mtimeMs;
				inputPath = filePath;
			}
		}

		if (!inputPath) {
			continue;
		}

		// Create the output directory if it doesn't exist yet, as ImageMagick will error out otherwise
		await fs.mkdir(outputDirectory, {recursive: true});

		const outputPath = `${outputDirectory}/${data.id}.${options.format}`;
		let command = `magick ${inputPath} -quality ${options.quality}`;
		if (options.width) {
			command += ` -resize ${options.width}`;
		}
		command += ` ${outputPath}`;

		images.push({
			inputPath,
			outputPath,
			command
		});
	}

	const {progressBar, multiBar} = createProgressBar(images.length);
	let errors = 0;
	let completed = 0;
	for (const image of images) {
		// We don't want to use await here, as that halts the program until the process exits.
		// This allows us to spawn multiple processes at once.
		processes.spawn(image.command)
			.then(async (out) => {
				const stats = await fs.stat(image.outputPath);
				multiBar.log(`${out}${image.inputPath} ${chalk.gray("->")} ${chalk.white(image.outputPath)} (${
					chalk.yellow(Math.floor(stats.size / 10.24) / 100)
				} KiB)\n`);
			})
			.catch(e => {
				multiBar.log(chalk.redBright(`Error converting ${image.inputPath}:\n`) + e + "\n");
				errors++;
			})
			.finally(async () => {
				completed++;
				progressBar.update(completed);

				if (completed >= images.length) {
					// All done!
					multiBar.update(); // Make sure all log messages are written
					multiBar.stop();
					console.info(
						"\nConverted",
						(errors > 0 ? chalk.red : chalk.green)(completed - errors),
						chalk.gray("/"),
						chalk.white(completed),
						"images!"
					);
				}
			});
	}
});
