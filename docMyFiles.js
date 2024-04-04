const dotenv = require('dotenv');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
dotenv.config({ path: __dirname + '/.env' })

// Choose to enable or not Tokenizer (count the cost of the API call in tokens)
// enable it will execute a python script to count the tokens, make sure to have python installed
const enableTokenizer = false;

const OpenAI = require('openai');
// const Tokenizer = require('tiktoken');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const tokenizer = new Tokenizer();

async function docmyfile(file) {
	const filePath = path.join(__dirname, file);
	// console.log('Processing file: ', filePath);

	try {
		const data = await fs.promises.readFile(filePath, 'utf8');
		const extension = path.extname(filePath);

		const message = 'Please, document my' + extension + ' file for me : ' + data;

		if (enableTokenizer) {
			exec(`python3 tokenCounter.py "${data}"`, (error, stdout, stderr) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}
				console.log(`Number of tokens: ${stdout}`);
			});
		}
		// console.log(file);
		
		// const response = await openai.chat.completions.create({
		// 	model: 'gpt-3.5-turbo',
		// 	messages: [
		// 		{role: 'system', content: 'You are a helpful assistant, specialized in programming.'},
		// 		{role: 'user', content: 'Please, document my file for me : '.data }
		// 	]
		// });
		
		// console.log('API Response: ', response.choices[0].message.content);

	} catch (err) {
		console.error(err);
	}
}

// Don't forget to custom the avoid table to avoid some files or directories
const avoid = ['node_modules', '.git', '.env', 'docMyFiles.js', 'tokenCounter.py'];

function processDirectory(directory, avoid) {
    const childs = fs.readdirSync(directory);

    for (const child of childs) {		
		const childPath = path.join(directory, child);
		if (avoid.some(av => childPath.includes(av))) continue;
		console.log('Processing file: ', childPath);
        if (fs.statSync(childPath).isFile()) {
            docmyfile(childPath);
        } else {
            processDirectory(childPath, avoid);
        }
    }
}

processDirectory('./project/Js-animation', avoid);