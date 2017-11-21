const ebml = require('ebml');
const globby = require('globby');
const fs = require('fs');
const path = require('path');

const glob = process.argv[2];

const outputFolder = 'output';

async function go() {
	const paths = await globby(glob);
	const pathsCount = paths.length;

	await new Promise((resolve, reject) => {
		fs.mkdir(outputFolder, err => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	}).catch(err => {
		if (err.code != 'EEXIST') {
			console.error(
				'There was an error creating the output directory',
				err
			);
		}
	});

	const promises = await paths.map(
		(p, i) =>
			new Promise((resolve, reject) => {
				const decoder = new ebml.Decoder();
				const encoder = new ebml.Encoder();
				const basename = path.basename(p);
				const fileStream = fs.createWriteStream(
					path.join(outputFolder, basename)
				);
				fileStream.on('finish', () => {
					resolve();
				});
				encoder.pipe(fileStream);

				decoder.on('data', chunk => {
					if (chunk[1].name == 'Title') {
						chunk = [
							'tag',
							{
								name: 'Title',
								data: Buffer.alloc(0)
							}
						];
					}
					encoder.write(chunk);
				});
				decoder.on('finish', () => {
					encoder.end();
				});
				fs.readFile(p, (err, data) => {
					decoder.end(data);
				});

				console.log(
					`Stripping title from ${basename} (${i +
						1} of ${pathsCount})`
				);
			})
	);

	await Promise.all(promises).catch(err => {
		console.error(err);
	});

	console.log(`Stripped titles from ${paths.length} files`);
	console.log(`Wrote to ${outputFolder}`);
}

go();
