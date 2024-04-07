// Tmp to create a temporary file to store the messages
// Fs to write the messages in the temporary file
import { fileSync } from 'tmp';
import { writeFileSync, promises, readdirSync, statSync } from 'fs';

// Util to promisify the exec function
// Child process to execute python script
import { promisify } from 'util';
import { exec as callbackExec } from 'child_process';
const exec = promisify(callbackExec);

// Url and path to get the __filename and __dirname variables 
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get API key from .env file
// OpenAI to send the request to the API
import { config } from 'dotenv';
config({ path: __dirname + '/.env' })
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Readline interface to get user input from the console
// Chalk to color the console output
import chalk from 'chalk';
import { createInterface } from 'readline';
const rl = createInterface({
	input: process.stdin,
	output: process.stdout
});


// Check your OpenAI account to get your tier rate
// The tier rate affect the number of tokens you can send in a minute, it's important to customize it to get a faster result
const tierRate = {
	"Tier 1": {
		"tpm": 60000
	},"Tier 2": {
		"tpm": 80000
	},"Tier 3": {
		"tpm": 160000
	},"Tier 4": {
		"tpm": 1000000
	},"Tier 5": {
		"tpm": 2000000
	},"custom": {
		"tpm": "custom value"
	}
}

// *------------------------------------*
// |                                    |
// |         CUSTOMIZE VARIABLES        |
// |                                    |
// *------------------------------------*
const enableTokenizer = true; // enable it will execute a python script to count the tokens, make sure to have python installed

const openaiTier = "Tier 1"; // Don't forget to custom the openai tier, it refers to the tierRate object
const projectPath = './project/ChartMyTime/'; // Don't forget to custom the project path
const avoid = ['.git', 'icons', 'package-lock.json', 'composer.lock' ]; // Don't forget to custom the avoid table to avoid some files or directories
const description = 'This is an vscode extension that allow user to generate conventionnals commit from his inputs.'; // Don't forget to custom the description of your project


// *------------------------------------*
// |                                    |
// |           GLOBAL VARIABLES         |
// |                                    |
// *------------------------------------*
let fileStack = [];
let context = {};
const tpm = tierRate[openaiTier].tpm - 1500;
const MAX_TOKENS = 15000;
let messages = [
	{ role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files. Here is a short description of my project : ' + description + '. Here are my project files so that you can generate a custom README for me :' },
];


// *------------------------------------*
// |                                    |
// |           FUNCTIONS                |
// |                                    |
// *------------------------------------*
/**
 * Process the message and create the requests list
 * @param {string} message
 * 
 * @returns {void}
 */
async function processMessage(message, listRequest, listMessages, listMessagesSize, totalMessages, ignoredFiles) {
	// TODO: Write the message in a temporary file and rename the file with his name
	let tmpMessage = fileSync();
	writeFileSync(tmpMessage.name, JSON.stringify([message]));

	// Count the number of tokens in the message with a python script
	let stdout = (await exec(`python3 tokenCounter.py "${tmpMessage.name}"`)).stdout;

	// If the message is too big, it will be ignored (based on the MAX_TOKENS variable)
	if (Number(stdout) > MAX_TOKENS) {
		console.log(chalk.red('Message too big, it will be ignored.'));
		ignoredFiles += 1;
	} else {
		// If the message is too big to be added to the request, it will be added to the listRequest
		if (listMessagesSize + Number(stdout) > MAX_TOKENS) {
			// Push the request to the listRequest and update overview variables
			listRequest.push(listMessages);
			totalMessages += listMessages.length;
			
			// Clear variables for the next request
			listMessages = [];
			listMessagesSize = 0;

			console.log(chalk.magenta('Request added to the list with ' + listMessages.length + ' messages ' + '( ' + listRequest.length + ' requests )'));
		}
		// Push the message to the listMessages and update overview variables
		listMessages.push(message);
		listMessagesSize += Number(stdout);
	}

	return Promise.resolve({ listRequest, listMessages, listMessagesSize, totalMessages, ignoredFiles });
}

/**
 * Send the request to OpenAI
 * @param {string} projectPath
 * @param {string[]} messages
 * 
 * @returns {void}
 */
async function sendRequest(projectPath, messages) {
	// Get the message content without all the object properties (without filename)
	const footer = "<br><br> This README was generated by [DocMyFiles](https://github.com/eliooooooo/DocMyFiles).";
	let bigRequest = false;
	let longRequest = false;
	let requestSize = 0;
	try {
		if (enableTokenizer) {
			let tmpMessage = fileSync();
			writeFileSync(tmpMessage.name, JSON.stringify(messages)); 
			await new Promise((resolve, reject) => {
				exec(`python3 tokenCounter.py "${tmpMessage.name}"`, (error, stdout, stderr) => {
					if (error) {
						console.error(`exec error: ${error}`);
						reject(error);
						return;
					}
					if (Number(stdout) > MAX_TOKENS ) {
						if (Number(stdout) > tpm) longRequest = true;
						bigRequest = true;
						requestSize = Number(stdout);
						console.log("");
						console.log(chalk.red('/---------------------------------------------------------------------------\\'));
						console.log(chalk.red('Your request is too big, the request will be send in multiple parts.'));
						if (longRequest) {
							console.log(chalk.red('You are using the ' + openaiTier + ' with a tpm (tokens per minute) of ' + tpm + ' tokens'));
							console.log(chalk.red('To respect this restriction, requests will be delayed.' + chalk.bold(' Estimated time : ' + Math.ceil(requestSize/tpm) + ' minutes')));
						}
						console.log(chalk.red('Please make sure you have correctly customize the avoid table in the script.'))
						console.log(chalk.red('\\--------------------------------------------------------------------------/'));
					} 
					let estimatedPrice = (stdout/1000)*0.0005;
					let price = stdout.trim() + ' ( ' + chalk.red('+- ' + estimatedPrice.toFixed(3) + ' $') + ' )';
					console.log(chalk.bold('Estimated tokens price : '), price);
					console.log("");
					resolve();
				});
			});
		}

		const answer = await new Promise((resolve) => {
			rl.question('Do you want to send the request? ' + chalk.gray('(yes/no) [yes] '), (answer) => {
				resolve(answer);
			});
		});

		if (answer.toLowerCase() === 'yes' ||  answer === ''){
			if (bigRequest) {
				let listRequest = [];
				let listMessages = [];
				let listMessagesSize = 0;
				let totalMessages = 0;
				let ignoredFiles = 0;
				
				// Define the number of request to send
				let estimatedNumber = Math.ceil(requestSize/MAX_TOKENS);
				console.log('');
				console.log(chalk.cyan('Request will be send in approx. ' + estimatedNumber + ' parts.'));
				console.log(chalk.cyan('Parsing request...'));
				console.log('');
				console.log('---------------');

				// Split the messages in multiple parts
				for (let message of messages) {
					let messageVar = await processMessage(message, listRequest, listMessages, listMessagesSize, totalMessages, ignoredFiles);
					listRequest = messageVar.listRequest;
					listMessages = messageVar.listMessages;
					listMessagesSize = messageVar.listMessagesSize;
					totalMessages = messageVar.totalMessages;
					ignoredFiles = messageVar.ignoredFiles;
				};
				// Push the last request and Show the overview of the process
				listRequest.push(listMessages);
				totalMessages += listMessages.length;
				console.log(chalk.magenta('Request added to the list with ' + listMessages.length + ' messages ' + '( ' + listRequest.length + ' requests )'));
				console.log("---------------");
				console.log("");
				console.log(chalk.bold(chalk.green("Parsing done ! ")) + "Overview of the request : ");
				console.log('Request parsed in ' + chalk.cyan(listRequest.length + ' parts.'));
				console.log('With a total of ' + chalk.cyan(totalMessages + ' messages.'));
				console.log(chalk.red(ignoredFiles) + ' files have been ignored because they were too big.');
				console.log("");

				const answer = await new Promise((resolve) => {
					rl.question('Requests ready to be submitted, go ? ' + chalk.gray('(yes/no) [yes] '), (answer) => {
						resolve(answer);
					});
				});
				
				if (answer.toLowerCase() === 'yes' ||  answer === ''){
					console.log("");
					// Send the requests
					let i = 1;
					let tokensUsed = 0;
					let price = 0;
					let requestPerMin = Math.ceil(tpm/MAX_TOKENS);
					console.log(chalk.bold('Requests per minute : ' + chalk.cyan(requestPerMin)));
					console.log("------------------");
					for (let request of listRequest) {
						console.log(chalk.magenta('Sending request ' + i + ' for processing...'));
						const response = await openai.chat.completions.create({
							model: 'gpt-3.5-turbo',
							messages: request,
							context: context
						});
						tokensUsed += Number(response.usage.total_tokens);
						price += Number((tokensUsed/1000)*0.0005);
						if (i === listRequest.length) {
							try {
								writeFileSync(join(__dirname, projectPath, 'README.md'), response.choices[0].message.content + footer);
								console.log("------------------")
								console.log('README generated in : ' , chalk.green(join(__dirname, projectPath, 'README.md')));
								console.log('Tokens used : ', tokensUsed , '( ' + chalk.red('+- ' + price.toFixed(3) + ' $') + ' )');
							} catch (err) {
								console.error(err);
							}
						} else {
							if (longRequest && i % requestPerMin === 0) {
								console.log(chalk.cyan(requestPerMin + ' requests sent, waiting 1 minute to respect the tpm...'));
								await new Promise((resolve) => {
									setTimeout(resolve, 60000);
								});
							}
						}
						i += 1;
					}
				} else {
					console.log(chalk.yellow('Requests not sent.'));
				}


			} else {
				console.log('Sending request to OpenAI...');
				const response = await openai.chat.completions.create({
					model: 'gpt-3.5-turbo',
					messages: messages
				});
				const tokensUsed = response.usage.total_tokens;
				const price = (tokensUsed/1000)*0.0005;
				writeFileSync(join(__dirname, projectPath, 'README.md'), response.choices[0].message.content + footer);
				console.log("------------------")
				console.log('README generated in : ' , chalk.green(join(__dirname, projectPath, 'README.md')));
				console.log('Tokens used : ', tokensUsed , '( ' + chalk.red('+- ' + price.toFixed(3) + ' $') + ' )');
			}

		} else {
			console.log(chalk.yellow('Request not sent.'));
		}
		rl.close();
	} catch (err) {
		console.error(err);
	}
}

/**
 * Process the file
 * @param {string} filePath
 * 
 * @returns {void}
 */
async function processFile(filePath) {
	try {
		// Collect the data from the file and json stringify it to send it to the API
		let data = await promises.readFile(join(__dirname, filePath), 'utf8');
		data = JSON.stringify(data);

		// Push the message to the messages array
		messages.push({ role: 'user', content: 'Here is my ' + filePath + ' file : ' + data + '' });
	} catch (err) {
		console.error(err);
	}
}

/**
 * Process the project directory (recursive)
 * @param {string} projectPath
 * @param {string[]} avoid
 * 
 * @returns {void}
 */
async function processDirectory(projectPath, avoid) {
	try {
		const childs = readdirSync(projectPath);
	
		for (const child of childs) {		
			const childPath = join(projectPath, child);

			if (avoid.some(av => childPath.includes(av))) continue;
			
			if (statSync(childPath).isFile()) {
				fileStack.push(childPath);
			} else {
				processDirectory(childPath, avoid);
			}
		}
		
	} catch (err) {
		console.error(err);
	}
}


// *------------------------------------*
// |                                    |
// |           MAIN PROGRAM             |
// |                                    |
// *------------------------------------*

// get all files (- avoid) in the project directory
processDirectory(projectPath, avoid);

console.log(chalk.bold('Files to process : '), fileStack);

// process all files
Promise.all(fileStack.map(element => processFile(element)))
.then(() => { sendRequest(projectPath, messages); })
.catch(err => console.error(err));