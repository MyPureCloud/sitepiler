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
		this.app.use(require('cors')());
		const router = express.Router();

		// this.app.use(bodyParser.json());
		router.use(express.static(sitepiler.config.settings.stages.compile.outputDirs.content));
		router.use('/localeditor', express.static(path.join(__dirname, './static')));

		// Serve local editor
		// router.get('/localeditor', (req, res) => {
		// 	res.sendFile('./static/index.html');
		// });

		// Return source file listing
		router.get('/localapi/sources', (req, res) => {
			res.send('sitemap');
		});

		// Render the post body and return the output
		router.post('/localapi/render', textPlainBodyParser, (req, res) => {
			res.send(sitepiler.render(req.body));
		});

		// Retrieve a source file
		router.get('/localapi/sources/:contentDirId/*', (req, res) => {
			if (req.originalUrl.includes('../')) return res.status(400).send('No cheating in the path!');

			// Join content dir path and requested path (just the * portion)
			const requestedPath = req.path.substring(19 + req.params.contentDirId.toString().length);
			const sourcePath = path.join(sitepiler.config.settings.stages.compile.contentDirs[req.params.contentDirId], requestedPath);

			if (fs.existsSync(sourcePath)) {
				log.debug(`Serving source: ${sourcePath}`);
				res.sendFile(sourcePath);
			} else {
				log.warn(`Source not found: ${sourcePath}`);
				res.status(404).send(`Source not found: ${sourcePath}`);
			}
		});

		// Save a source file
		router.post('/localapi/sources/:contentDirId/*', textPlainBodyParser, (req, res) => {
			if (req.originalUrl.includes('../')) return res.status(400).send('No cheating in the path!');

			// Join content dir path and requested path (just the * portion)
			const requestedPath = req.path.substring(19 + req.params.contentDirId.toString().length);
			const sourcePath = path.join(sitepiler.config.settings.stages.compile.contentDirs[req.params.contentDirId], requestedPath);

			// Save source to disk
			log.info(`Writing source file: ${sourcePath}`);
			fs.ensureDirSync(path.dirname(sourcePath));
			fs.writeFileSync(sourcePath, req.body);

			// Render and save
			//TODO: don't think this code is necessary due to file system watchers in sitepiler
			const output = sitepiler.render(req.body);
			let destPath = path.join(sitepiler.config.settings.stages.compile.outputDirs.content, requestedPath);
			log.debug('destPath=', destPath);
			destPath = sitepiler.prepareOutputFileName(destPath);
			log.debug('destPath=', destPath);
			log.info(`Writing output file: ${destPath}`);
			fs.ensureDirSync(path.dirname(destPath));
			fs.writeFileSync(destPath, output);

			// TODO: render contents and write output
			res.sendStatus(204);
		});

		// Error page
		router.use('*', (req, res) => {
			let errorPage = path.join(sitepiler.config.settings.stages.compile.outputDirs.content, 'error.html');
			if (fs.existsSync(errorPage)) res.sendFile(errorPage);

			// Do nothing if the site doesn't have the page. Use default.
		});

		// Add routes
		if (sitepiler.config.settings.siteSubdir) {
			// Add routes to subdir
			this.app.use(sitepiler.config.settings.siteSubdir, router);

			// Redirect all requests to root to the subdir
			this.app.all('/', (req, res) => {
				res.redirect(sitepiler.config.settings.siteSubdir);
			});
		} else {
			// Add routes to root
			this.app.use('/', router);
		}
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
	req.on('end', function() {
		next();
	});
}
