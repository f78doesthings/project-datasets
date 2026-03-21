import { program } from "@commander-js/extra-typings";
import { generateImages } from "./commands/generate-images";
import { convertImages } from "./commands/convert-images";

program
    .addCommand(generateImages)
    .addCommand(convertImages)
    .parse();
