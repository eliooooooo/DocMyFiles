import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import chalk from 'chalk';
import { exec } from 'child_process';
import { writeFileSync, promises, readdirSync, statSync } from 'fs';
import { fileSync } from 'tmp';
import { join, dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: __dirname + '/.env' })

import { createInterface } from 'readline';
const rl = createInterface({
	input: process.stdin,
	output: process.stdout
});

import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// *------------------------------------*
// |                                    |
// |         CUSTOMIZE VARIABLES        |
// |                                    |
// *------------------------------------*
const enableTokenizer = true; // enable it will execute a python script to count the tokens, make sure to have python installed

const projectPath = './project/test/'; // Don't forget to custom the project path
const avoid = ['.git']; // Don't forget to custom the avoid table to avoid some files or directories
const description = 'This is an vscode extension that allow user to generate conventionnals commit from his inputs.'; // Don't forget to custom the description of your project


// *------------------------------------*
// |                                    |
// |           GLOBAL VARIABLES         |
// |                                    |
// *------------------------------------*
let fileStack = [];
let messages = [
	{ role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files. Here is a short description of my project : ' + description + '. Here are my project files so that you can generate a custom README for me :' },
];


// *------------------------------------*
// |                                    |
// |           FUNCTIONS                |
// |                                    |
// *------------------------------------*
/**
 * Send the request to OpenAI
 * @param {string} projectPath
 * @param {string[]} messages
 * 
 * @returns {void}
 */
async function sendRequest(projectPath, messages) {
	const footer = "<br><br> This README was generated by [DocMyFiles](https://github.com/eliooooooo/DocMyFiles).";
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
					let estimatedPrice = (stdout/1000)*0.0005;
					let price = stdout.trim() + ' ( ' + chalk.red('+- ' + estimatedPrice.toFixed(3) + ' $') + ' )';
					console.log(chalk.bold('Estimated tokens price : '), price);
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
		let data = await promises.readFile(join(__dirname, filePath), 'utf8');
		data = JSON.stringify(data);
		messages.push({ role: 'user', content: 'Here is my ' + filePath + ' file : ' + data + '' });
	} catch (err) {
		console.error(err);
	}
}

/**
 * Process the project directory
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
			// console.log('Processing file: ', childPath);
			
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