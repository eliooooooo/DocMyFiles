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

// Calculate the number of tokens in the description
// Don't modify this part
const TMP_DESCRIPTION = fileSync();
writeFileSync(TMP_DESCRIPTION.name, JSON.stringify([{ role: 'system', content: description }]));
const TOKENS_DESCRIPTION = Number((await exec(`python3 tokenCounter.py "${TMP_DESCRIPTION.name}"`)).stdout);


// *------------------------------------*
// |                                    |
// |           GLOBAL VARIABLES         |
// |                                    |
// *------------------------------------*
let fileStack = [];
let context = [];
let messageList = [];
const TOKENS_PER_MINUTES = tierRate[openaiTier].tpm - 1500;
const MAX_TOKENS = 15000;
let messages = [
	{ role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files. Here is a short description of my project : ' + description + '. Here are my project files so that you can generate a custom README for me :' }
];

// TODO: Create a function to count tokens of the different messages
// Classic instruction to generate a readme for a little project
const CLASSIC_MESSAGE = { role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files. Here is a short description of my project : ' + description + '. Here are my project files so that you can generate a custom README for me :' };
const TMP_CLASSIC_MESSAGE = fileSync();
writeFileSync(TMP_CLASSIC_MESSAGE.name, JSON.stringify([CLASSIC_MESSAGE]));
const TOKENS_CLASSIC_MESSAGE = Number((await exec(`python3 tokenCounter.py "${TMP_CLASSIC_MESSAGE.name}"`)).stdout) + TOKENS_DESCRIPTION;

// Classic instruction to generate a readme for a big project
const BIG_MESSAGE = { role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files for projects. Here is a short description of my project : ' + description + '. I want to send you multiple requests with each multiple files. Please generate a full report of the files so later you can generate a README from multiple report files.' };
const TMP_BIG_MESSAGE = fileSync();
writeFileSync(TMP_BIG_MESSAGE.name, JSON.stringify([BIG_MESSAGE]));
const TOKENS_BIG_MESSAGE = Number((await exec(`python3 tokenCounter.py "${TMP_BIG_MESSAGE.name}"`)).stdout) + TOKENS_DESCRIPTION;

// Last instruction to generate the readme for big project
const LAST_BIG_MESSAGE = { role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files for projects. Here is a short description of my project : ' + description + '. I have sent you multiple requests with each multiple files and you have generate multiple full report from these requests. Please generate a README based on my description and your full reports.' };
const TMP_LAST_BIG_MESSAGE = fileSync();
writeFileSync(TMP_LAST_BIG_MESSAGE.name, JSON.stringify([LAST_BIG_MESSAGE]));
const TOKENS_LAST_BIG_MESSAGE = Number((await exec(`python3 tokenCounter.py "${TMP_LAST_BIG_MESSAGE.name}"`)).stdout) + TOKENS_DESCRIPTION;


// *------------------------------------*
// |                                    |
// |           FUNCTIONS                |
// |                                    |
// *------------------------------------*
/**
 * Ask a question to the user
 * @param {string} question
 * 
 * @returns {Promise<string>}
 */
async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

/**
 * Process the message and create the requests list
 * @param {string} message
 * 
 * @returns {void}
 */
async function processMessage(message, listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles) {
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
			listRequest.push(listRequestMessages);
			totalMessages += listRequestMessages.length;
			
			console.log(chalk.magenta('Request added to the list with ' + listRequestMessages.length + ' messages ' + '( ' + listRequest.length + ' requests )'));
			
			// Clear variables for the next request
			listRequestMessages = [ BIG_MESSAGE ];
			listMessagesSize = 0;
		}
		// Push the message to the listMessages and update overview variables
		listRequestMessages.push(message);
		listMessagesSize += Number(stdout);
	}

	return Promise.resolve({ listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles });
}

/**
 * Send the request to OpenAI
 * @param {string} projectPath
 * @param {string[]} messages
 * 
 * @returns {void}
 */
async function sendRequest(projectPath, messagesList) {
	// TODO: Rename massage/messages variables
	const footer = "<br><br> This README was generated by [DocMyFiles](https://github.com/eliooooooo/DocMyFiles).";
	let bigRequest = false;
	let longRequest = false;
	let requestSize = 0;

	if (enableTokenizer) {
		// Collect the messages in a temporary file
		let tmpMessagesList = fileSync();
		writeFileSync(tmpMessagesList.name, JSON.stringify(messagesList)); 

		// Count the number of tokens in the message with a python script
		let stdout = (await exec(`python3 tokenCounter.py "${tmpMessagesList.name}"`)).stdout;
		requestSize = Number(stdout);
		
		// The price of the request + his firts instruction if it's not too big
		const estimatedClassicPrice = requestSize + TOKENS_CLASSIC_MESSAGE;

		// Check if the request is too big 
		// Display a warning message if it's the case
		if (estimatedClassicPrice > MAX_TOKENS ) {
			// Update request size variables
			if ((estimatedClassicPrice) > TOKENS_PER_MINUTES) longRequest = true;
			bigRequest = true;
			
			// Display a warning message
			// ? Deplace this part in a function
			// TODO: Move the estimated time just before sending the request
			console.log("");
			console.log(chalk.red('/---------------------------------------------------------------------------\\'));
			console.log(chalk.red('Your request is too big, the request will be send in multiple parts.'));
			if (longRequest) {
				console.log(chalk.red('You are using the ' + openaiTier + ' with a tpm (tokens per minute) of ' + TOKENS_PER_MINUTES + ' tokens'));
				console.log(chalk.red('To respect this restriction, requests will be delayed.' + chalk.bold(' Estimated time : ' + Math.ceil(requestSize/TOKENS_PER_MINUTES) + ' minutes')));
			}
			console.log(chalk.red('Please make sure you have correctly customize the avoid table in the script.'))
			console.log(chalk.red('\\--------------------------------------------------------------------------/'));
		} 

		// ? Deplace here the estimated number of requests. So we can estimate more precisely the cost for a big request
		// TODO: Deplace it

		// Display the estimated price of the request
		let estimatedPrice = (estimatedClassicPrice/1000)*0.0005;
		let price = estimatedClassicPrice + ' ( ' + chalk.red('+- ' + estimatedPrice.toFixed(3) + ' $') + ' )';
		console.log(chalk.bold('Estimated tokens price : '), price);
		console.log("");
	}

	// Ask the user if he want to send the request
	const answer = await askQuestion('Do you want to send the request to OpenAI ? ' + chalk.gray('(yes/no) [yes] '));
	console.log('');

	// if user want to send the requests
	if (answer.toLowerCase() === 'yes' ||  answer === ''){
		// if the request is too big
		if (bigRequest) {
			// Initialize variables for the request and overview
			let listRequest = [];
			let listRequestMessages = [	BIG_MESSAGE	];
			let listMessagesSize = 0;
			let totalMessages = 0;
			let ignoredFiles = 0;
			
			// Define the number of request to send
			let estimatedNumber = Math.ceil(requestSize/MAX_TOKENS);
			console.log(chalk.cyan('Request will be send in approx. ' + estimatedNumber + ' parts.'));
			console.log(chalk.cyan('Parsing request...'));
			console.log('');
			console.log('---------------');

			// Processing all messages to split them into several requests
			for (let message of messagesList) {
				({ listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles } = await processMessage(message, listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles));
			};

			// Push the last request and update overview variables
			listRequest.push(listRequestMessages);
			console.log(chalk.magenta('Request added to the list with ' + listRequestMessages.length + ' messages ' + '( ' + listRequest.length + ' requests )'));
			totalMessages += listRequestMessages.length;

			// ! Ici, ajouter la dernière requête pour ajouter le message de fin et les comptes rendus
			// ! Ne pas oublier de mettre à jour les variables pour l'overview

			// Display the overview of the request
			console.log("---------------");
			console.log("");
			console.log(chalk.bold(chalk.green("Parsing done ! ")) + "Overview of the request : ");
			console.log('Request parsed in ' + chalk.cyan(listRequest.length + ' parts.'));
			console.log('With a total of ' + chalk.cyan(totalMessages + ' messages.'));
			console.log(chalk.red(ignoredFiles) + ' files have been ignored because they were too big.');
			console.log("");

			// Ask the user if he want to send the requests
			const answer = await askQuestion('Do you want to send the requests to OpenAI ? ' + chalk.gray('(yes/no) [yes] '));
			console.log("");
			
			// if user want to send the request
			if (answer.toLowerCase() === 'yes' ||  answer === ''){
				// Initialize variables for the request
				let i = 1;
				let tokensUsed = 0;
				let price = 0;
				let requestPerMin = Math.ceil(TOKENS_PER_MINUTES/MAX_TOKENS);

				// Display the estimated time 
				console.log(chalk.bold('Requests per minute : ' + chalk.cyan(requestPerMin)));
				console.log("------------------");

				// Send the requests to OpenAI
				for (let request of listRequest) {
					console.log(chalk.magenta('Sending request ' + i + ' for processing...'));

					// Sending the request to OpenAI
					const response = await openai.chat.completions.create({
						model: 'gpt-3.5-turbo',
						messages: request,
						context: context
					});

					// Update the overview variables
					tokensUsed += Number(response.usage.total_tokens);
					price += Number((tokensUsed/1000)*0.0005);

					// If it's the last request, write the README and display the overview
					// If it's a long request, wait 1 minute to respect the tpm
					if (i === listRequest.length) {
						// Generating the README
						writeFileSync(join(__dirname, projectPath, 'README.md'), response.choices[0].message.content + footer);

						// Display the overview
						console.log("------------------")
						console.log('README generated in : ' , chalk.green(join(__dirname, projectPath, 'README.md')));
						console.log('Tokens used : ', tokensUsed , '( ' + chalk.red('+- ' + price.toFixed(3) + ' $') + ' )');
					} else {
						// If it's a long request, wait 1 minute to respect the tpm
						if (longRequest && i % requestPerMin === 0) {
							console.log(chalk.cyan(requestPerMin + ' requests sent, waiting 1 minute to respect the tpm...'));

							// Wait 1 minute
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
		} 
		// If the request is not too big
		else {
			// Sending the request to OpenAI
			console.log('Sending request to OpenAI...');
			const response = await openai.chat.completions.create({
				model: 'gpt-3.5-turbo',
				messages: messages
			});

			// Update the overview variables
			const tokensUsed = response.usage.total_tokens;
			const price = (tokensUsed/1000)*0.0005;

			// Generating the README
			writeFileSync(join(__dirname, projectPath, 'README.md'), response.choices[0].message.content + footer);

			// Display the overview
			console.log("------------------")
			console.log('README generated in : ' , chalk.green(join(__dirname, projectPath, 'README.md')));
			console.log('Tokens used : ', tokensUsed , '( ' + chalk.red('+- ' + price.toFixed(3) + ' $') + ' )');
		}
	} else {
		console.log(chalk.yellow('Request not sent.'));
	}

	// Close the readline interface
	rl.close();
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

		// Push the message to the messagesList array
		messageList.push({ role: 'user', content: 'Here is my ' + filePath + ' file : ' + data + '' });
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
		// Get all the childs of the project directory
		const childs = readdirSync(projectPath);
	
		for (const child of childs) {		
			const childPath = join(projectPath, child);

			// Avoid some files or directories
			if (avoid.some(av => childPath.includes(av))) continue;
			
			// If the child is a file, push it to the fileStack
			// If the child is a directory, process it
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
.then(() => { sendRequest(projectPath, messageList); })
.catch(err => console.error(err));