import { Provider } from "quantumhub-sdk";

export class ProviderTimeout {
    private timeouts: NodeJS.Timeout[] = [];

    constructor(private readonly provider: Provider) { }

    set = (callback: () => Promise<void>, timeout: number): NodeJS.Timeout => {
        const id = setTimeout(() => {
            callback()
                .catch((error) => {
                    this.provider.logger.warn('Device crashed during setTime', error);
                })
                .finally(() => {
                    this.timeouts = this.timeouts.filter((id) => id !== id);
                });
        }, timeout);

        this.timeouts.push(id);
        return id;
    };

    clear = (timeout: NodeJS.Timeout): void => {
        clearTimeout(timeout);
        this.timeouts = this.timeouts.filter((id) => id !== timeout);
    };

    clearAll = (): void => {
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }

        this.timeouts = [];
    };
}
