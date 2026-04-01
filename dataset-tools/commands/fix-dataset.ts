import {Command} from "@commander-js/extra-typings";
import {getDataset, WithId} from "../utils/dataset";
import chalk from "chalk";
import {Pet, Shelter} from "../../pet-shelter/types";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const fixDataset = new Command("fix-dataset")
	.description("Bulk edits a dataset. Cannot be configured; edit the commands/fix-dataset.ts file to change its behaviour.")
	.aliases(["fix"])
	.argument("<dataset>", "The path to the dataset to correct.");

fixDataset.action(async (datasetPath) => {
	const dataset = await getDataset(datasetPath);
	const newData: { [dataType: string]: WithId[] } = {};

	switch (dataset.name) {
		case "pet-shelter": {
			const petsPerShelter = [0, 0, 0, 0, 0, 0, 0];
			const entries = [...dataset.entries];
			entries.sort((a, b) => a.dataType.localeCompare(b.dataType));

			for (const {dataType, data} of dataset.entries) {
				switch (dataType) {
					case "pets": {
						const pet = data as unknown as Pet;
						pet.characteristics.sort();

						const shelter = dataset.entries.find(
							entry => entry.dataType === "shelters" && entry.data.id === pet.shelter.id
						);
						if (!shelter) {
							throw new Error(`Invalid shelter ID for pet ${pet.id}`);
						}

						petsPerShelter[pet.shelter.id - 1]++;
						pet.shelter = shelter.data as unknown as Shelter;

						(newData[dataType] ??= []).push(pet);
						break;
					}

					case "shelters": {
						const shelter = {...data} as unknown as Shelter;
						shelter.address = shelter.address.replace(", Vlaanderen", "");
						shelter.openHours = shelter.openHours
							.replaceAll(", ", "\n")
							.replaceAll(" (", "\n(");

						if (!shelter.openHours.includes("zo")) {
							shelter.openHours += "\nzo gesloten";
						}

						(newData[dataType] ??= []).push(shelter);
						break;
					}
				}
			}
			console.log(`Pets per shelter: ${petsPerShelter}`);
			break;
		}

		default:
			console.error(chalk.red("The dataset you've given is not yet supported by this command."));
			break;
	}

	for (const [dataType, entries] of Object.entries(newData)) {
		entries.sort((a, b) => {
			if (typeof a.id === "string" && typeof b.id === "string") {
				return a.id.localeCompare(b.id);
			} else if (typeof a.id === "number" && typeof b.id === "number") {
				return a.id - b.id;
			} else {
				return 0;
			}
		});
		await fs.writeFile(
			path.join(datasetPath, `data/${dataType}.json`),
			JSON.stringify(entries, null, 2) + "\n"
		);
	}
	console.log(chalk.green("Done!"));
});
