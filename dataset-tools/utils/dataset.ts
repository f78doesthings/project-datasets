import * as path from "node:path";
import * as fs from "node:fs/promises";

interface Dataset {
    name: string;
    entries: DatasetEntry[];
}

interface DatasetEntry {
    dataType: string;
    data: DatasetValue;
}

interface DatasetValue {
    id: string | number;

    [key: string]: unknown;
}

export async function getDataset(datasetPath: string): Promise<Dataset> {
    const dataPath = path.join(datasetPath, "data");
    const entries: DatasetEntry[] = [];

    for (const file of await fs.readdir(dataPath)) {
        const extension = path.extname(file);
        if (extension.toLowerCase() === ".json") {
            const filePath = path.join(dataPath, file);
            const dataType = file.replace(extension, "");
            const json = await fs.readFile(filePath, "utf-8");
            const data = JSON.parse(json);

            if (Array.isArray(data)) {
                for (const value of data) {
                    entries.push({ dataType, data: value });
                }
            } else {
                throw new Error(`Invalid data, expected an array: ${filePath}`);
            }
        }
    }

    return {
        name: path.basename(datasetPath),
        entries
    };
}
