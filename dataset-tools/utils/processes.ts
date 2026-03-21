import * as child_process from "node:child_process";
import { sleep } from "./misc";

export class ProcessManager {
    /** The number of processes spawned by this instance. */
    count = 0;

    /**
     * Creates a new ProcessManager instance.
     * @param max The maximum number of processes this instance can spawn at once.
     * @param waitTime The number of milliseconds to wait before checking the process count,
     * when the limit has been reached.
     */
    constructor(public max: number = 8, public waitTime: number = 10) {
    }

    /**
     * Spawns a new process, and returns a Promise that resolves with its standard output.
     *
     * If an error occurs, or the spawned process output something to stderr,
     * the promise is rejected with the error message.
     */
    async spawn(command: string) {
        while (this.count >= this.max) {
            await sleep(this.waitTime);
        }

        this.count++;
        return new Promise<string>((resolve, reject) => {
            child_process.exec(command, (error, stdout, stderr) => {
                this.count--;
                if (error) {
                    reject(error);
                } else if (stderr) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            })
        })
    }
}
