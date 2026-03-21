import chalk from "chalk";
import cliProgress from "cli-progress";

export function createProgressBar(total: number, options: cliProgress.Options = {}) {
    const multiBar = new cliProgress.MultiBar({
        format:
            `${chalk.blueBright("{bar}")} ${chalk.gray("|")} ${chalk.whiteBright("{percentage}")}% ${chalk.gray("|")} ` +
            `${chalk.whiteBright("{value}")} ${chalk.gray("/")} {total} ${chalk.gray("|")} ` +
            `{duration_formatted} ${chalk.gray("/")} ${chalk.whiteBright("{eta_formatted}")}`,
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        forceRedraw: true,
        ...options
    });
    const progressBar = multiBar.create(total, 0);
    return { progressBar, multiBar };
}

/** Returns a {@linkcode Promise} that resolves after the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Returns a random number between `0` (inclusive) and `max` (exclusive). */
export function randint(max: number) {
    return Math.floor(Math.random() * max);
}
