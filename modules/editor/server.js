// const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs-extra');
const log = new (require('lognext'))('editor');
const path = require('path');


class EditorServer {
	constructor(sitepiler, port) {
		this.sitepiler = sitepiler;
		this.port = port;

		this.app = express();
		// this.app.use(bodyParser.json());
		this.app.use(express.static(sitepiler.config.stageSettings.compile.outputDir));
		log.debug(path.resolve('./modules/editor/static'));
		this.app.use('/localeditor', express.static(path.resolve('./modules/editor/static')));

		// Serve local editor
		// this.app.get('/localeditor', (req, res) => {
		// 	res.sendFile('./static/index.html');
		// });

		// Return source file listing
		this.app.get('/localapi/sources', (req, res) => {
			res.send('sitemap');
		});

		// Render the post body and return the output
		this.app.post('/localapi/render', textPlainBodyParser, (req, res) => {
			res.send(sitepiler.render(req.body));
		});

		// Retrieve a source file
		this.app.get('/localapi/sources/:contentDirId/*', (req, res) => {
			if (req.originalUrl.includes('../'))
				return res.status(400).send('No cheating in the path!');

			// Join content dir path and requested path (just the * portion)
			const requestedPath = req.path.substring(19 + req.params.contentDirId.toString().length);
			const sourcePath = path.join(
				sitepiler.config.stageSettings.compile.contentDirs[req.params.contentDirId], 
				requestedPath
			);

			if (fs.existsSync(sourcePath)) {
				log.debug(`Serving source: ${sourcePath}`);
				res.sendFile(sourcePath);
			} else {
				log.warn(`Source not found: ${sourcePath}`);
				res.status(404).send(`Source not found: ${sourcePath}`);
			}
		});

		// Save a source file
		this.app.post('/localapi/sources/:contentDirId/*', textPlainBodyParser, (req, res) => {
			if (req.originalUrl.includes('../'))
				return res.status(400).send('No cheating in the path!');

			// Join content dir path and requested path (just the * portion)
			const requestedPath = req.path.substring(19 + req.params.contentDirId.toString().length);
			const sourcePath = path.join(
				sitepiler.config.stageSettings.compile.contentDirs[req.params.contentDirId], 
				requestedPath
			);

			// Save source to disk
			log.info(`Writing source file: ${sourcePath}`);
			fs.ensureDirSync(path.dirname(sourcePath));
			fs.writeFileSync(sourcePath, req.body);

			// Render and save
			const output = sitepiler.render(req.body);
			let destPath = path.join(
				sitepiler.config.stageSettings.compile.outputDir,
				requestedPath
			);
			log.debug('destPath=',destPath);
			destPath = sitepiler.prepareOutputFileName(destPath);
			log.debug('destPath=',destPath);
			log.info(`Writing output file: ${destPath}`);
			fs.ensureDirSync(path.dirname(destPath));
			fs.writeFileSync(destPath, output);

			// TODO: render contents and write output
			res.sendStatus(204);
		});
	}

	start() {
		this.app.listen(this.port, () => console.log(`Example app listening on port ${this.port}`));
	}
}

module.exports = EditorServer;



// Parses text/plain content into req.body
function textPlainBodyParser(req, res, next) {
	req.setEncoding('utf8');
	req.body = '';
	req.on('data', function(chunk) {
		req.body += chunk;
	});
	req.on('end', function(){
		next();
	});
}