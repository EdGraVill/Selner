import * as vscode from 'vscode';

export function runScript(script: string, sel = 'lorem ipsum dolor') {
	const result = eval(script);

	return result;
}

export function replaceSelection(selection: vscode.Selection, newText: string) {
	vscode.window.activeTextEditor?.edit((txt) => {
		txt.replace(selection, newText);
	});
}
