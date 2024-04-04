const dotenv = require('dotenv');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
dotenv.config({ path: __dirname + '/.env' })

const readline = require('readline');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

// Choose to enable or not Tokenizer (count the cost of the API call in tokens)
// enable it will execute a python script to count the tokens, make sure to have python installed
const enableTokenizer = false;

const OpenAI = require('openai');
// const Tokenizer = require('tiktoken');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const tokenizer = new Tokenizer();

async function sendRequest(projectPath, message) {
	try {
		rl.question('Do you want to send the request? (yes/no) ', async (answer) => {
			if (answer.toLowerCase() === 'yes') {
				const response = await openai.chat.completions.create({
					model: 'gpt-3.5-turbo',
					messages: message
				});
				
				console.log('README generated in : ' + projectPath);
				fs.writeFileSync(path.join(__dirname, projectPath, 'README.md'), response.choices[0].message.content);
			} else {
				console.log('Request not sent.');
			}
			rl.close();
		});

	} catch (err) {
		console.error(err);
	}
}

// Don't forget to custom the avoid table to avoid some files or directories
const projectPath = './project/GAME/';
const avoid = ['node_modules', 'dist',  '.git', '.env', 'img', 'css'];

async function processDirectory(projectPath, avoid) {
	try {
		const childs = fs.readdirSync(projectPath);
		const message = [
			{ role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files.' },
		];
	
		for (const child of childs) {		
			const childPath = path.join(projectPath, child);

			if (avoid.some(av => childPath.includes(av))) continue;
			console.log('Processing file: ', childPath);
			
			if (fs.statSync(childPath).isFile()) {
				const filePath = path.join(__dirname, childPath);
				const data = await fs.promises.readFile(filePath, 'utf8');

				message.push({ role: 'user', content: data });
			} else {
				processDirectory(childPath, avoid);
			}
		}

		message.push({ role: 'user', content: 'Could you generate a custom README for my project? It should include an introduction, installation instructions, usage examples' });
		
		if (enableTokenizer) {
			exec(`python3 tokenCounter.py "${data}"`, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				console.log(`Number of tokens: ${stdout}`);
			});
		}

		sendRequest(projectPath, message);
		
	} catch (err) {
		console.error(err);
	}
}

processDirectory(projectPath, avoid);