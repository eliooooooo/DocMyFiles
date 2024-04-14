// Dependencies
import { fileSync, writeFileSync, promises, readdirSync, readFileSync, statSync, promisify, exec, fileURLToPath, join, dirname, __filename, __dirname, config, OpenAI, openai, chalk, rl } from './dependencies.js';

// Variables
export let fileStack = [];
export let messageList = [];

/**
 * Count the number of tokens in a message
 * @param {array} messages 
 * 
 * @returns 
 */
export async function countTokens(messages) {
	const tmpFile = fileSync();
	writeFileSync(tmpFile.name, JSON.stringify(messages));
	const tokens = Number((await exec(`python3 tokenCounter.py "${tmpFile.name}"`)).stdout);
	return tokens;
}

/**
 * Ask a question to the user
 * @param {string} question
 * 
 * @returns {Promise<string>}
 */
export async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

/**
 * Process the file
 * @param {string} filePath
 * 
 * @returns {void}
 */
export async function processFile(filePath) {
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
export async function processDirectory(projectPath, avoid) {
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

/**
 * Process the message and create the requests list
 * @param {string} message
 * 
 * @returns {void}
 */
export async function processMessage(message, listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles) {
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