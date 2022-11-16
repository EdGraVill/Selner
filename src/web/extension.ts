import { ExtensionContext } from 'vscode';
import Selner from './Selner';

export function activate(context: ExtensionContext) {
	const selner = new Selner(context);

	selner.register();
}

export function deactivate() {}
