import * as vscode from 'vscode';
import Storage, { Script } from './storage';

type Picked = 'New Script' | 'Remove Script' | 'Run Script Without Saving' | Script | undefined;

export default async function showMenu(storage: Storage): Promise<Picked> {
  const rencentlyUsed: vscode.QuickPickItem[] = storage.getLastUsed().map(({ name, description }) => ({
    detail: description,
    label: name,
  }));

  if (rencentlyUsed.length > 0) {
    rencentlyUsed.push({
      label: 'Rencently used',
      kind: vscode.QuickPickItemKind.Separator,
    });
  }

  const scripts: vscode.QuickPickItem[] = storage.getScriptList().map(({ name, description }) => ({
    description,
    label: name,
  }));

  if (scripts.length > 0) {
    scripts.unshift({
      label: 'All scripts',
      kind: vscode.QuickPickItemKind.Separator,
    });
  }

  const item = await vscode.window.showQuickPick([
    ...rencentlyUsed.reverse().slice(0, 4), {
      label: 'Actions',
      kind: vscode.QuickPickItemKind.Separator,
    }, {
      label: 'New Script',
    }, {
      label: 'Remove Script'
    }, {
      label: 'Run Script Without Saving'
    },
    ...scripts,
  ], { title: 'Selner' });

  if (item?.label && storage.getScript(item.label)) {
    return storage.getScript(item.label);
  }

  return item?.label as Picked;
}
