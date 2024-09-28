import { Cache } from "quantumhub-sdk";
import { Hub } from "../hub";
import { PackageProvider } from "./package-provider";

export class ProviderCache implements Cache {
    constructor(private readonly hub: Hub, private readonly provider: PackageProvider) { }

    set = async (key: string, value: any): Promise<void> => {
        return this.hub.cache.set(this.provider, key, value);
    }

    get = async (key: string): Promise<any> => {
        return this.hub.cache.get(this.provider, key);
    }

    delete = async (key: string): Promise<void> => {
        return this.hub.cache.delete(this.provider, key);
    }

    all = async (): Promise<{
        [key: string]: any;
    }> => {
        return this.hub.cache.all(this.provider);
    }
}