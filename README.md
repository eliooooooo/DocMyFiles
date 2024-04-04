# docmyfiles

## Introduction

The `docmyfiles` extension is a helpful tool specialized in generating custom README files for projects. It is designed to assist developers in creating well-documented projects by automating the process of creating README files.

## Installation

To install `docmyfiles`, please follow these steps:

1. Clone the repository from GitHub.
2. Run `npm install` to install the required dependencies.
3. Set up your `.env` file with the necessary environment variables (OPENAI_API_KEY).
4. Clone your project into the `project` directory.
5. Run the application using `node your_script.js`.

## Usage

To use the `docmyfiles` extension, you need to run the script while providing the project path and avoiding specific files or directories. The extension will process the specified directory, read the files, and generate a README file based on the content.

Here is an example usage of the `docmyfiles` extension:

```js
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
dotenv.config({ path: __dirname + '/.env' })

// Define the project path and files/directories to avoid
const projectPath = './project/GAME/';
const avoid = ['node_modules', 'dist',  '.git', 'img', 'css'];

// Process the directory and generate the README
processDirectory(projectPath, avoid);
```

Remember to customize the avoid table to exclude specific files or directories that should not be included in the README generation.

Enjoy documenting your projects effortlessly with `docmyfiles`! <br><br> Ce README a été généré par [DocMyFiles](https://github.com/eliooooooo/DocMyFiles).