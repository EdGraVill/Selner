import { commands, ExtensionContext, Selection, TextDocument, TextEditor, window } from 'vscode';
import Menu, { Option } from './Menu';
import Storage, { Script } from './Storage';

export default class Selner {
  private readonly document: TextDocument;
  private readonly editor: TextEditor;
  private readonly menu: Menu;
  private readonly storage: Storage;
  private readonly activeTextEditor: TextEditor;

  constructor(private readonly context: ExtensionContext) {
    const editor = window.activeTextEditor;
    const document = editor?.document;
    const activeTextEditor = window.activeTextEditor;

    if (!editor || !document || !activeTextEditor) {
      throw new Error('Unexpected error');
    }

    this.document = document;
    this.editor = editor;
    this.activeTextEditor = activeTextEditor;
    this.storage = new Storage(this.context);

    this.menu = new Menu(this.context);
    this.menu.onSelected(this.handleSelection.bind(this));
  }

  private get selections(): readonly Selection[] {
    return this.editor.selections.filter((selection) => !selection.isEmpty);
  }

  private get firstSelectionText(): string {
    return this.document.getText(this.selections[0]);
  }

  private runner(script: string, sel: string): string {
    const safeRunner = Function(`with({
      globalThis: {},
      global: {},
      window: {},
      document: {},
      eval: {},
      setTimeout:{},
      setInterval: {},
      XMLHttpRequest: {},
      Function: {},
      sel: '${sel}',
    }) {
      const closure = {
        fn() {
          try {
            return ${script};
          } catch (e) {
            return e.toString();
          }
        }
      };

      return closure.fn();
    }`);

    return safeRunner();
  }

  private async runScript(scriptName: string | Script) {
    let script: Script | undefined;

    if (typeof scriptName === 'string') {
      script = await this.storage.getScript(scriptName);
    } else {
      script = scriptName;
    }

    if (!script) {
      return;
    }

    this.activeTextEditor.edit((builder) => {
      for (const selected of this.selections) {
        if (!selected.isEmpty) {
          const sel = this.document.getText(selected);
    
          const result = this.runner(script!.code, sel);
    
          builder.replace(selected, result);
        }
      }
    });

    if (script.name) {
      await this.storage.recordScript(script);
    }
  }

  private async newScript() {
    const name = await this.menu.openScriptNameInput();

    if (!name) {
      return;
    }

    const description = await this.menu.openScriptDescriptionInput();
    const code = await this.menu.openScriptCodeInput(this.runner.bind(this), this.firstSelectionText);

    if (code) {
      await this.storage.saveScript({ code, name, description });
      await this.runScript(name);
    }
  }

  private async removeScript() {
    const scriptName = await this.menu.openScriptSelector();

    if (scriptName) {
      await this.storage.removeScript(scriptName);
    }
  }

  private async runSingleScript() {
    const code = await this.menu.openScriptCodeInput(this.runner.bind(this), this.firstSelectionText);

    if (code) {
      this.runScript({ code, name: '' });
    }
  }

  private async handleSelection(option: Option, scriptName?: string) {
    switch (option) {
      case Option.new:
        await this.newScript();
        break;
      case Option.remove:
        await this.removeScript();
        break;
      case Option.run:
        await this.runSingleScript();
        break;
      case Option.script:
        if (scriptName) {
          await this.runScript(scriptName);
        }
        break;
      default:
        break;
    }
  }

  private showMenu() {
    if (!this.selections.length) {
      throw new Error('No selection found');
    }

    this.menu.openMainMenu();
  }

  public register() {
    const disposable = commands.registerCommand('selner.selner', () => this.showMenu());

    this.context.subscriptions.push(disposable);
  }
}
