import * as vscode from 'vscode';
import { replaceSelection, runScript } from '../util';
import showMenu from './showMenu';
import Storage, { Script } from './storage';
import textInput from './textInput';

async function requestScript(selection: string, step?: [number, number]): Promise<string | undefined> {
	const script = await textInput({
		prompt: 'Script\'s code. Remember the selected text is represented with the "sel" variable. Example: sel.toUpperCase()',
		title: 'Script',
		step: step?.[0],
		totalSteps: step?.[1],
		validate(val) {
			if (!val) {
				return 'Script is required. Remember the selected text is represented with the "sel" variable. Example: sel.toUpperCase()';
			}

			try {
				const result = runScript(val, selection);

				return {
					message: `"${selection}" -> "${result}"`,
					severity: vscode.InputBoxValidationSeverity.Info,
				};
			} catch (error) {
				return `Script throw an error: ${error}`;
			}
		}
	});

	return script;
}

async function newScript(storage: Storage, selection: string): Promise<string | undefined> {
	const name = await textInput({
		title: 'Name',
		prompt: 'Script\'s name. Must be unique',
		step: 1,
		totalSteps: 3,
		validate(val) {
			if (!val) {
				return 'Name is required';
			}

			if (storage.getScript(val)) {
				return `"${val}" script already exists`;
			}	

			return undefined;
		} 
	});

	if (!name) {
		return;
	}

	const description = await textInput({
		prompt: 'Script\'s description. Useful for understanding the script behavior',
		title: 'Description',
		step: 2,
		totalSteps: 3,
	});

	const script = await requestScript(selection, [3, 3]);

	if (!script) {
		return;
	}

	storage.addScript(name, script, description);

	return script;
}

async function removeScript(storage: Storage) {
	const scriptList: vscode.QuickPickItem[] = storage.getScriptList().map(({ name, script, description }) => ({
		label: name,
		detail: script,
		description,
	}));

	const pick = await vscode.window.showQuickPick(scriptList, { title: 'Select a Script to remove' });

	if (pick) {
		storage.removeScript(pick.label);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('selner.selner', async () => {
		const storage = new Storage(context.globalState);

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const document = editor.document;

			const { selections } = editor;

			if (selections.length === 0 || (selections.length === 1 && !document.getText(selections[0]))) {
				throw new Error('No selection found');
			}

			const sel = document.getText(selections[0]);

			const picked = await showMenu(storage);
			let script: string | undefined;

			if (picked === 'New Script') {
				script = await newScript(storage, sel);
			}

			if (picked === 'Remove Script') {
				await removeScript(storage);
			}

			if (picked === 'Run Script Without Saving') {
				script = await requestScript(sel);
			}
			
			if (typeof picked === 'object') {
				script = picked.script;
			}

			if (script) {
				const result = runScript(script, sel);
				replaceSelection(selections[0], result);
			}
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
