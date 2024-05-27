// Tmp to create a temporary file to store the messages
// Fs to write the messages in the temporary file
import { fileSync } from 'tmp';
import { writeFileSync, promises, readdirSync, readFileSync, statSync, renameSync } from 'fs';

// Util to promisify the exec function
// Child process to execute python script
import { promisify } from 'util';
import { exec as callbackExec } from 'child_process';
const exec = promisify(callbackExec);

// Url and path to get the __filename and __dirname variables 
import { fileURLToPath } from 'url';
import { join, dirname, basename } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get API key from .env file
// OpenAI to send the request to the API
import { config } from 'dotenv';
config({ path: __dirname + '/../.env' });
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

// Export the variables
export { renameSync, fileSync, writeFileSync, promises, readdirSync, readFileSync, statSync, promisify, exec, fileURLToPath, join, dirname, basename, __filename, __dirname, config, OpenAI, openai, chalk, rl };