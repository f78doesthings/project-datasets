import {program} from "@commander-js/extra-typings";
import {generateImages} from "./commands/generate-images";
import {convertImages} from "./commands/convert-images";
import {fixDataset} from "./commands/fix-dataset";

program
	.addCommand(generateImages)
	.addCommand(convertImages)
	.addCommand(fixDataset)
	.parse();
