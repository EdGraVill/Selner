import * as vscode from 'vscode';

export interface Script {
	name: string;
	description?: string;
	script: string;
}

export interface Selner {
	lastUsed: string[];
	scripts: Record<string, Script>;
}

export default class Storage {
  private projection: Selner;

  constructor(private readonly memento: vscode.Memento) {
    this.projection = this.update();
  }

  private save(): Storage {
    const stringified = JSON.stringify(this.projection);
  
    this.memento.update('selner', stringified);
    this.update();
  
    return this;
  }

  public update(): Selner {
    const raw = this.memento.get<string>('selner');

    const obj: Selner = JSON.parse(raw || JSON.stringify({ lastUsed: [], scripts: {} }));

    this.projection = obj;
    return obj;
  }

  public getScript(name: string): Script | undefined {
    return this.projection.scripts[name];
  }

  public getScriptList(): Script[] {
    return Object.keys(this.projection.scripts).map((name) => this.projection.scripts[name]);
  }

  public getLastUsed(): Script[] {
    const scripts = this.projection.lastUsed.map((name) => this.getScript(name)).filter(Boolean);

    return scripts as Script[];
  }

  public pushLastUsed(name: string): Storage {
    const alreadyUsed = this.projection.lastUsed.findIndex((n) => n === name);
    if (alreadyUsed >= 0) {
      this.projection.lastUsed.splice(alreadyUsed, 1);
    }
    this.projection.lastUsed.push(name);

    return this.save();
  }

  public addScript(name: string, script: string, description?: string): Storage {
    this.projection.scripts[name] = {
      name,
      script,
      description: description || undefined,
    };

    this.pushLastUsed(name);

    return this.save();
  }

  public removeScript(name: string): Storage {
    if (this.projection.scripts[name]) {
      delete this.projection.scripts[name];
  
      const lastUsedIx = this.projection.lastUsed.findIndex((n) => n === name);
  
      if (lastUsedIx >= 0) {
        this.projection.lastUsed.splice(lastUsedIx, 1);
      }
    }

    return this.save();
  }
}
