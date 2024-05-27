// *------------------------------------*
// |                                    |
// |         VARIABLES CONFIG           |
// |                                    |
// *------------------------------------*
// Do not customize the variable config
export const tierRate = {
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
};

// *------------------------------------*
// |                                    |
// |         CUSTOMIZE VARIABLES        |
// |                                    |
// *------------------------------------*
export const openaiTier = 'Tier 1'; // Don't forget to custom the openai tier, it refers to the tierRate object
export const projectPath = './project/ChartMyTime/'; // Don't forget to custom the project path
export const avoid = ['.git', 'icons', '.vscode' ]; // Don't forget to custom the avoid table to avoid some files or directories
export const description = 'A vscode extension to generate conventionnals commits based on user inputs.'; // Don't forget to custom the description of your project