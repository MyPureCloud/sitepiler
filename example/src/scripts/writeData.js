const fs = require('fs-extra');
const path = require('path');

const outputDir = path.resolve(process.argv[2]);

console.log(`Ensuring directory exists: ${outputDir}`);
fs.ensureDirSync(outputDir);

const outputFile = path.join(outputDir, 'exampleData.json');
console.log(`Writing data to ${outputFile}`);
fs.writeFileSync(outputFile, JSON.stringify({
	buildTime: (new Date()).toString()
}));
