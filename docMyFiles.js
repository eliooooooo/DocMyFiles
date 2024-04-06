const dotenv = require('dotenv');
const { exec } = require('child_process');
const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
dotenv.config({ path: __dirname + '/.env' })

const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// *------------------------------------*
// |                                    |
// |         CUSTOMIZE VARIABLES        |
// |                                    |
// *------------------------------------*
const enableTokenizer = true; // enable it will execute a python script to count the tokens, make sure to have python installed

const projectPath = './project/PocketTimer/'; // Don't forget to custom the project path
const avoid = ['.git', 'icons', 'public']; // Don't forget to custom the avoid table to avoid some files or directories
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
			let tmpMessage = tmp.fileSync();
			fs.writeFileSync(tmpMessage.name, JSON.stringify(messages)); 
			console.log('tmpMessage: ', tmpMessage.name);			
			exec(`python3 tokenCounter.py "${tmpMessage.name}"`, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				price = (stdout/1000)*0.0005;
				price = price.toFixed(3);
				console.log(`Estimated tokens price: ${stdout} (${price} $)`);
			});
			// tmpMessage.removeCallback();
		}

		const answer = await new Promise((resolve) => {
			rl.question('Do you want to send the request? (yes/no) ', (answer) => {
				resolve(answer);
			});
		});

		if (answer.toLowerCase() === 'yes') {
			const response = await openai.chat.completions.create({
				model: 'gpt-3.5-turbo',
				messages: messages
			});
		
			fs.writeFileSync(path.join(__dirname, projectPath, 'README.md'), response.choices[0].message.content + footer);
			console.log('README generated in : ' + path.join(__dirname, projectPath, 'README.md'));
		} else {
			console.log('Request not sent.');
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
		let data = await fs.promises.readFile(path.join(__dirname, filePath), 'utf8');
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
		const childs = fs.readdirSync(projectPath);
	
		for (const child of childs) {		
			const childPath = path.join(projectPath, child);

			if (avoid.some(av => childPath.includes(av))) continue;
			// console.log('Processing file: ', childPath);
			
			if (fs.statSync(childPath).isFile()) {
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

console.log('Files to process : ', fileStack);

// process all files
Promise.all(fileStack.map(element => processFile(element)))
.then(() => { sendRequest(projectPath, messages); })
.catch(err => console.error(err));