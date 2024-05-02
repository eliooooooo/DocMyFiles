// Dependencies
import { fileSync, writeFileSync, promises, readdirSync, readFileSync, statSync, promisify, exec, fileURLToPath, join, dirname, __filename, __dirname, config, OpenAI, openai, chalk, rl } from './src/dependencies.js';

// Import the custom functions from the project 
import { countTokens, processFile, processDirectory, fileStack, messageList, sendRequest } from './src/functions.js';

// Import the variables from the project
import { projectPath, avoid, description, tierRate, openaiTier } from './src/variables.js';


// *------------------------------------*
// |                                    |
// |           GLOBAL VARIABLES         |
// |                                    |
// *------------------------------------*

// Calculate the number of tokens in the description
// Don't modify this part
const TOKENS_DESCRIPTION = await countTokens([{ role: 'system', content: description }]);

let contextFiles = [];
const TOKENS_PER_MINUTES = tierRate[openaiTier].tpm - 1500;
const MAX_TOKENS = 15000;
let messages = [
	{ role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files. Here is a short description of my project : ' + description + '. Here are my project files so that you can generate a custom README for me :' }
];

// ! The result is not consistent with theses prompts.
// ! Some of the prompts are not returning full reports
// ! For little projects, the result is not consistent, + review on the price or anything else that does not send the messages
// ? Use cont tokens functions ?
// Classic instruction to generate a readme for a little project
const CLASSIC_MESSAGE = { role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files. Here is a short description of my project : ' + description + '. Here are my project files so that you can generate a custom README for me :' };
const TOKENS_CLASSIC_MESSAGE = await countTokens([CLASSIC_MESSAGE]) + TOKENS_DESCRIPTION;

// Classic instruction to generate a readme for a big project
const BIG_MESSAGE = { role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files for projects. Here is a short description of my project : ' + description + '. I want to send you multiple requests with each multiple files. Please generate a full report of the files so later you can generate a README from multiple report files.' };
const TOKENS_BIG_MESSAGE = await countTokens([BIG_MESSAGE]) + TOKENS_DESCRIPTION;

// ? give an exmple of a big project readme ?
// Last instruction to generate the readme for big project
const LAST_BIG_MESSAGE = { role: 'system', content: 'You are a useful assistant, specialized in programming. You\'re mainly used to generate custom readme files for projects. Here is a short description of my project : ' + description + '. I have sent you multiple requests with each multiple files and you have generate multiple full report from these requests. Please generate a README based on my description and your full reports.' };
const TOKENS_LAST_BIG_MESSAGE = await countTokens([LAST_BIG_MESSAGE]) + TOKENS_DESCRIPTION;


// *------------------------------------*
// |                                    |
// |           MAIN PROGRAM             |
// |                                    |
// *------------------------------------*

// Stack of messages to send to the API
let MESSAGES_STACK = {
	"Classic": { "message": CLASSIC_MESSAGE, "tokens": TOKENS_CLASSIC_MESSAGE },
	"Big": { "message": BIG_MESSAGE, "tokens": TOKENS_BIG_MESSAGE },
	"LastBig": { "message": LAST_BIG_MESSAGE, "tokens": TOKENS_LAST_BIG_MESSAGE }
}

// get all files (- avoid) in the project directory
processDirectory(projectPath, avoid);

// Display the files to process
console.log(chalk.bold('Files to process : '), fileStack);

// process all files
Promise.all(fileStack.map(element => processFile(element)))
.then(() => { sendRequest(projectPath, messageList, MESSAGES_STACK, MAX_TOKENS, TOKENS_PER_MINUTES); })
.catch(err => console.error(err));