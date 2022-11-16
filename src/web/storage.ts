import { ExtensionContext, Memento } from 'vscode';

export interface Script {
  code: string;
  description?: string;
  name: string;
}

export interface Store {
  scripts: Record<string, Script>;
  recentlyUsed: string[];
}

export default class Storage {
  private static readonly storeKey = 'selner:store';
  private static readonly emptyStore: Store = {
    recentlyUsed: [],
    scripts: {},
  };

  private readonly globalState: Memento;
  private store: Store = Storage.emptyStore;

  constructor(private readonly context: ExtensionContext) {
    this.globalState = this.context.globalState;

    this.updateStore();
  }

  private async saveStore() {
    await this.globalState.update(Storage.storeKey, this.store);
  }

  private async updateStore(): Promise<Store> {
    const store = this.globalState.get<Store>(Storage.storeKey);

    if (!store) {
      await this.globalState.update(Storage.storeKey, Storage.emptyStore);
      return Storage.emptyStore;
    }

    return store;
  }

  public async recordScript(script: Script, store?: Store) {
    if (!store) {
      await this.updateStore();
    }
    
    const alreadyUsed = this.store.recentlyUsed.findIndex((name) => name === script.name);

    if (alreadyUsed >= 0) {
      this.store.recentlyUsed.splice(alreadyUsed, 1);
    }

    this.store.recentlyUsed.unshift(script.name);

    if (!store) {
      await this.saveStore();
    }
  }

  public async saveScript(script: Script) {
    await this.updateStore();

    this.store.scripts[script.name] = script;
    this.recordScript(script, this.store);

    await this.saveStore();
  }

  public async removeScript(scriptName: string) {
    await this.updateStore();

    delete this.store.scripts[scriptName];
    const alreadyUsed = this.store.recentlyUsed.findIndex((name) => name === scriptName);

    if (alreadyUsed >= 0) {
      this.store.recentlyUsed.splice(alreadyUsed, 1);
    }

    await this.saveStore();
  }

  public async getAllScripts(): Promise<Script[]> {
    await this.updateStore();

    return Object.values(this.store.scripts);
  }

  public async getRecentlyUsedScripts(): Promise<Script[]> {
    await this.updateStore();

    const { recentlyUsed, scripts } = this.store;

    return recentlyUsed.filter((name) => !!scripts[name]).map((name) => scripts[name]);
  }

  
  public getScript(scriptName: string, isSync: true): Script | undefined;
  public getScript(scriptName: string, isSync?: false): Promise<Script | undefined>;
  public getScript(scriptName: string, isSync: boolean = false): Promise<Script | undefined> | Script | undefined {
    if (!isSync) {
      return new Promise<Script | undefined>(async (resolve) => {
        await this.updateStore();

        resolve(this.store.scripts[scriptName]);
      });
    }

    return this.store.scripts[scriptName];
  }
}
