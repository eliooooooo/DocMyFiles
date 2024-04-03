// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/.env' })

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
	const completion = await openai.chat.completions.create({
		messages : [{role: 'system', content: 'You are a helpful assistant.'}],
		model: 'gpt-3.5-turbo',
	});

	console.log(completion.data.choices[0].message.content);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('========================================================');
	console.log('Congratulations, your extension "docmyfiles" is now active!');
	console.log(dotenv.config({ path: __dirname + '/.env' }));
	console.log(process.env.OPENAI_API_KEY);
	main();
	console.log('========================================================');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('docmyfiles.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from DocMyFiles!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
