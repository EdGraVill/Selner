/* eslint-disable @typescript-eslint/naming-convention */
import { ExtensionContext, InputBoxValidationMessage, InputBoxValidationSeverity, QuickPickItem, QuickPickItemKind, window } from 'vscode';
import Storage from './Storage';

interface TextInput {
  title: string;
  prompt?: string;
  step?: number;
  totalSteps?: number;
  validate?(text: string): string | InputBoxValidationMessage | undefined;
}

export enum Option {
  new,
  remove,
  run,
  script,
}

const mapOptionWithLabel = {
  'New Script': Option.new,
  'Remove Script': Option.remove,
  'Run Script Without Saving': Option.run,
};

export interface OnSelected {
  (option: Option.script, scriptName: string): void;
  (option: Option.new | Option.remove | Option.run): void;
}

export default class Menu {
  private readonly queue: OnSelected[] = [];
  private readonly storage: Storage;

  constructor(private readonly context: ExtensionContext) {
    this.storage = new Storage(this.context);
  }

  private async getScriptItems(): Promise<QuickPickItem[]> {
    const scripts = await this.storage.getAllScripts();

    const scriptsItems: QuickPickItem[] = scripts.length === 0 ? [] : [
      {
        label: 'All scripts',
        kind: QuickPickItemKind.Separator,
      },
      ...scripts.map(({ description, name }) => ({
        description,
        label: name,
      })),
    ];

    return scriptsItems;
  }

  private async getRecentlyUsedItems(): Promise<QuickPickItem[]> {
    const recentlyUsed = await this.storage.getRecentlyUsedScripts();

    const recentlyUsedItems: QuickPickItem[] = recentlyUsed.length === 0 ? [] : [
      {
        label: 'Rencently used',
        kind: QuickPickItemKind.Separator,
      },
      ...recentlyUsed.map(({ description, name }) => ({
        detail: description,
        label: name,
      })),
    ];

    return recentlyUsedItems;
  }

  private async getMainMenuItems(): Promise<QuickPickItem[]> {
    const recentlyUsedItems = await this.getRecentlyUsedItems();
    const scriptsItems = await this.getScriptItems();

    return [
      ...recentlyUsedItems,
      {
        label: 'Actions',
        kind: QuickPickItemKind.Separator,
      },
      ...Object.keys(mapOptionWithLabel).map((label) => ({
        label
      })),
      ...scriptsItems,
    ];
  }

  private async openTextInput({ title, prompt, step, totalSteps, validate }: TextInput) {
    return new Promise<string>((resolve) => {
      const input = window.createInputBox();
  
      input.prompt = prompt;
      input.title = title;
      input.step = step;
      input.totalSteps = totalSteps;
      input.validationMessage = validate?.('');
  
      input.onDidChangeValue((val) => {
        input.validationMessage = validate?.(val);
      });
  
      input.onDidAccept(() => {
        const value = input.value;
  
        const validated = validate?.(value);
  
        if (!validated || (typeof validated === 'object' && validated.severity !== InputBoxValidationSeverity.Error)) {
          resolve(value);
  
          input.hide();
        }
      });
  
      input.onDidHide(() => resolve(''));

      input.show();
    });
  }

  public async openScriptCodeInput(runner: (script: string, sel: string) => string, selection: string, step?: [number, number]): Promise<string | undefined> {
    return this.openTextInput({
      prompt: 'Script\'s code. Remember the selected text is represented with the "sel" variable. Example: sel.toUpperCase()',
      title: 'Script',
      step: step?.[0],
      totalSteps: step?.[1],
      validate(val) {
        if (!val) {
          return 'Script is required. Remember the selected text is represented with the "sel" variable. Example: sel.toUpperCase()';
        }
  
        try {
          const result = runner(val, selection);
  
          return {
            message: `"${selection}" -> "${result}"`,
            severity: InputBoxValidationSeverity.Info,
          };
        } catch (error) {
          return `Script throw an error: ${error}`;
        }
      }
    });
  }

  public async openScriptNameInput(step?: [number, number]): Promise<string | undefined> {
    const storage = this.storage;
    
    return this.openTextInput({
      title: 'Name',
      prompt: 'Script\'s name. Must be unique',
      step: step?.[0],
      totalSteps: step?.[1],
      validate(val) {
        if (!val) {
          return 'Name is required';
        }
  
        if (storage.getScript(val, true)) {
          return `"${val}" script already exists`;
        }	
  
        return undefined;
      }
    });
  }

  public async openScriptDescriptionInput(step?: [number, number]): Promise<string | undefined> {
    return this.openTextInput({
      prompt: 'Script\'s description. Useful for understanding the script behavior',
      title: 'Description',
      step: step?.[0],
      totalSteps: step?.[1],
    });
  }

  public async openScriptSelector(): Promise<string | undefined> {
    const scriptsItems = await this.getScriptItems();

    const item = await window.showQuickPick(scriptsItems);

    return item?.label;
  }

  public async openMainMenu() {
    const mainMenuItems = await this.getMainMenuItems();

    const selectedItem = await window.showQuickPick(mainMenuItems);

    if (selectedItem) {
      let option = mapOptionWithLabel[selectedItem.label as keyof typeof mapOptionWithLabel] ?? Option.script;

      this.queue.forEach((fn) => {
        if (option === Option.script) {
          fn(option, selectedItem.label);
        } else {
          fn(option);
        }
      });
    }
  }

  public onSelected(callback: OnSelected) {
    this.queue.push(callback);
  }
}
