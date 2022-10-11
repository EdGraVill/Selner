import * as vscode from 'vscode';

interface TextInput {
  title: string;
  prompt?: string;
  step?: number;
  totalSteps?: number;
  validate?(text: string): string | vscode.InputBoxValidationMessage | undefined;
}

const textInput = ({ title, prompt, step, totalSteps, validate }: TextInput) => new Promise<string>((resolve, reject) => {
  const input = vscode.window.createInputBox();
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

    if (!validated || (typeof validated === 'object' && validated.severity !== vscode.InputBoxValidationSeverity.Error)) {
      resolve(value);

      input.hide();
    }
	});

  input.onDidHide(() => resolve(''));

	input.show();
});

export default textInput;
