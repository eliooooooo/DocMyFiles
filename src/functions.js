// Dependencies
import { fileSync, writeFileSync, promises, readdirSync, readFileSync, statSync, promisify, exec, fileURLToPath, join, dirname, __filename, __dirname, config, OpenAI, openai, chalk, rl } from './dependencies.js';
import { openaiTier, tierRate } from './variables.js';

// Variables
export let fileStack = [];
export let messageList = [];
let MAX_TOKENS = 15000;

let TOKENS_PER_MINUTES = tierRate[openaiTier].tpm - 1500;


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
async function askQuestion(question) {
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
 * Display a warning message in the console
 * @param {bool} longRequest 
 * @param {int} requestSize 
 * 
 * @returns {void}
 */
function displayWarning(longRequest, requestSize) {
	console.log("");
	console.log(chalk.red('/---------------------------------------------------------------------------\\'));
	console.log(chalk.red('Your request is too big, the request will be send in multiple parts.'));
	if (longRequest) {
		console.log(chalk.red('You are using the ' + openaiTier + ' with a tpm (tokens per minute) of ' + TOKENS_PER_MINUTES + ' tokens'));
		console.log(chalk.red('To respect this restriction, requests will be delayed.' + chalk.bold(' Estimated time : ' + Math.ceil(requestSize/TOKENS_PER_MINUTES) + ' minutes')));
	}
	console.log(chalk.red('Please make sure you have correctly customize the avoid table in the script.'))
	console.log(chalk.red('\\---------------------------------------------------------------------------/'));
}

/**
 * Send the request to OpenAI
 * @param {string} projectPath
 * @param {string[]} messagesList
 * @param {object} messageStack
 * 
 * @returns {void}
 */
export async function sendRequest(projectPath, messagesList, messageStack) {
	const footer = "<br><br> This README was generated by [DocMyFiles](https://github.com/eliooooooo/DocMyFiles).";
	let bigRequest = false;
	let longRequest = false;
	let requestSize = 0;

	// Collect the messages in a temporary file
	let tmpMessagesList = fileSync();
	writeFileSync(tmpMessagesList.name, JSON.stringify(messagesList)); 

	// Count the number of tokens in the message with a python script
	let stdout = (await exec(`python3 tokenCounter.py "${tmpMessagesList.name}"`)).stdout;
	requestSize = Number(stdout);
	
	// The price of the request + his firts instruction if it's not too big
	const estimatedClassicPrice = requestSize + messageStack.Classic.tokens;

	// Check if the request is too big 
	// Display a warning message if it's the case
	if (estimatedClassicPrice > MAX_TOKENS ) {
		// Update request size variables
		if ((estimatedClassicPrice) > TOKENS_PER_MINUTES) longRequest = true;
		bigRequest = true;
		
		// Display a warning message
		displayWarning(longRequest, requestSize);
	} 

	// ? Deplace here the estimated number of requests. So we can estimate more precisely the cost for a big request
	// TODO: Deplace it

	// Display the estimated price of the request
	let estimatedPrice = (estimatedClassicPrice/1000)*0.0005;
	let price = estimatedClassicPrice + ' ( ' + chalk.red('+- ' + estimatedPrice.toFixed(3) + ' $') + ' )';
	console.log(chalk.bold('Estimated tokens price : '), price);
	console.log("");

	// Ask the user if he want to send the request
	const answer = await askQuestion('Do you want to send the request to OpenAI ? ' + chalk.gray('(yes/no) [yes] '));
	console.log('');

	// if user want to send the requests
	if (answer.toLowerCase() === 'yes' ||  answer === ''){
		// if the request is too big
		if (bigRequest) {
			// Initialize variables for the request and overview
			let listRequest = [];
			let listRequestMessages = [	messageStack.Big.message ];
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
				({ listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles, MAX_TOKENS } = await processMessage(message, listRequest, listRequestMessages, listMessagesSize, totalMessages, ignoredFiles, MAX_TOKENS));
			};

			// Push the last request and update overview variables
			listRequest.push(listRequestMessages);
			console.log(chalk.magenta('Request added to the list with ' + listRequestMessages.length + ' messages ' + '( ' + listRequest.length + ' requests )'));
			totalMessages += listRequestMessages.length;
				
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

				// Display the estimated time for longs requests
				if (longRequest) {
					console.log(chalk.bold('Requests per minute : ' + chalk.cyan(requestPerMin)));
					console.log(chalk.bold('Estimated time : ' + chalk.cyan(Math.ceil(listRequest.length/requestPerMin) + ' minutes')));
				}
				console.log("------------------");

				// Send the requests to OpenAI
				for (let request of listRequest) {
					console.log(chalk.magenta('Sending request ' + i + ' for processing...'));

					// Sending the request to OpenAI
					const response = await openai.chat.completions.create({
						model: 'gpt-3.5-turbo',
						messages: request
					});

					// Update the overview variables
					tokensUsed += Number(response.usage.total_tokens);
					price += Number((tokensUsed/1000)*0.0005);

					// Write the full report in a temporary file and add the url to the contextFiles
					let tmpReport = fileSync();
					writeFileSync(tmpReport.name, JSON.stringify(response.choices[0].message.content));
					contextFiles.push(tmpReport.name);

					// ! Move this part in a function
					// If it's the last request, write the README and display the overview
					// If it's a long request, wait 1 minute to respect the tpm
					if (i === listRequest.length) {
						// Initialize variables for the last request
						let lastRequest = [];
						let contextRequestSize = 0;
						let i = 0;
						
						// Add the last message to the last request
						// If the last request is too big, create a new request
						lastRequest.push(LAST_BIG_MESSAGE);
						for (let contextFile of contextFiles) {
							i += 1;
							let fileContent = readFileSync(contextFile, 'utf8');
							let contextMessage = { role: 'system', content: 'Here is the your full report number ' + i + ' : ' + JSON.stringify([fileContent]) };
							lastRequest.push(contextMessage);
						}
						
						// Count the number of tokens in the message with a python script
						for (let messages of lastRequest) {
							let messageFile = fileSync();
							writeFileSync(messageFile.name, JSON.stringify([messages]));
							let stdout = (await exec(`python3 tokenCounter.py "${messageFile.name}"`)).stdout;
							contextRequestSize += Number(stdout);
						}
						
						if (contextRequestSize  < MAX_TOKENS) {
							console.log(chalk.magenta('Sending instructions (' + lastRequest.length + ' messages )'));
							const response = await openai.chat.completions.create({
								model: 'gpt-3.5-turbo',
								messages: lastRequest
							});

							// Generating the README
							writeFileSync(join(__dirname, projectPath, 'README.md'), response.choices[0].message.content + footer);

							// Update the overview variables
							tokensUsed += Number(response.usage.total_tokens);
							price = Number((tokensUsed/1000)*0.0005);
						} else {
							console.log(chalk.yellow('Too big request, the generation of the README will be stopped.'));
							rl.close();
						}

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
				messages: messagesList
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