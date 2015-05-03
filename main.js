var origDir = __dirname;
var fs = require('fs');
var child_process = require('child_process').exec;
var path = require('path');
var rmdir = require('rimraf');

var libraryData;
function writeData() {
	process.chdir(origDir);
	fs.writeFile('data.json', JSON.stringify(libraryData), function (err) {
		if (err) console.log('Error writing to data file');
	});
}
fs.readFile('data.json', function (err, data) {
	if (err) {
		libraryData = {
			git: [],
			links: []
		};
		writeData();
	}
	else libraryData = JSON.parse(data);
	if (!process.argv[2]) process.argv[2] = 'help';
	switch (process.argv[2]) {
		case 'help':
			displayHelp();
			break;
		case 'set-dir':
			if (!process.argv[3]) {
				console.log('A directory is needed, e.g.:');
				console.log('\tset-dir /home/user/Arduino');
				break;
			}
			libraryData = {
				dir: process.argv[3] + '/libraries',
				git: [],
				links: []
			};
			writeData();
			console.log('Arduino directory set to ' + process.argv[3] + '.');
			break;
		case 'add-git':
			if (!process.argv[3]) {
				console.log('A git repo address is needed, e.g.:');
				console.log('\tadd-git https://github.com/adafruit/Adafruit_VS1053_Library');
				break;
			}
			if (!libraryData.dir) {
				console.log('Must run set-dir first.');
				break;
			}
			process.chdir(libraryData.dir);
			var gitProcess = child_process('git clone ' + process.argv[3], function (err, stdout, stderr) {
				console.log(stdout);
				console.log(stderr);
				if (!err) {
					fs.readdir(libraryData.dir, function (err, data) {
						if (err) throw err;
						var lastTime = 0;
						var name;
						for (var i = 0; i < data.length; i++) {
							(function () {
								return function (i, length) {
									fs.stat(libraryData.dir + '/' + data[i], function (err, stats) {
										if (err) throw err;
										if (stats.isDirectory() && stats.ctime && stats.ctime.getTime() > lastTime) {
											lastTime = stats.ctime;
											name = data[i];
										}
										if (i == length - 1) {
											if (name) libraryData.git.push(name);
											writeData();
											console.log('Added library ' + name + '.');
										}
									});
								}
							})()(i, data.length);
						}
					});
				}
			});
			break;
		case 'add-dir':
			if (!process.argv[3]) {
				console.log('Must specify library to remove, e.g.:');
				console.log('\trm Adafruit_VS1053_Library');
				break;
			}
			if (!libraryData.dir) {
				console.log('Must run set-dir first.');
				break;
			}
			process.chdir(origDir);
			var splitdir = process.argv[3].split(path.sep);
			var folderName = splitdir[splitdir.length - 1];
			fs.symlink(path.resolve(process.argv[3]), libraryData.dir + '/' + folderName, 'junction', function (err) {
				if (err) throw err;
				else {
					libraryData.links.push(folderName);
					writeData();
					console.log('Added library ' + folderName + '.');
				}
			});
			break;
		case 'update':
			if (!process.argv[3]) {
				console.log('Must specify library to update, e.g.:');
				console.log('\tupdate Adafruit_VS1053_Library');
				break;
			}
			if (libraryData.git.indexOf(process.argv[3]) == -1) {
				console.log(process.argv[3] + ' is not a library installed with git.');
				break;
			}
			if (!libraryData.dir) {
				console.log('Must run set-dir first.');
				break;
			}
			process.chdir(libraryData.dir + '/' + process.argv[3]);
			var gitProcess = child_process('git pull', function (err, stdout, stderr) {
				console.log(stdout);
				console.log(stderr);
				if (!err) console.log('Successfully updated ' + process.argv[3] + '.');
			});
			break;
		case 'rm':
			if (!process.argv[3]) {
				console.log('Must specify library to remove, e.g.:');
				console.log('\trm Adafruit_VS1053_Library');
				break;
			}
			if (!libraryData.dir) {
				console.log('Must run set-dir first.');
				break;
			}
			process.chdir(libraryData.dir);
			var index;
			if ((index = libraryData.git.indexOf(process.argv[3])) != -1) {
				rmdir(process.argv[3], function (err) {
					if (err) throw err;
					else {
						libraryData.git.splice(index, 1);
						writeData();
						console.log('Successfully removed ' + process.argv[3] + '.');
					}
				});
			}
			else if ((index = libraryData.links.indexOf(process.argv[3])) != -1) {
				fs.unlink(process.argv[3], function (err) {
					if (err) console.log('Error removing');
					else {
						libraryData.links.splice(index, 1);
						writeData();
						console.log('Successfully removed ' + process.argv[3] + '.');
					}
				})
			}
			else console.log('No such library installed.');
	}
});

function displayHelp() {
	console.log('Usage:');
	console.log('\tset-dir: set the directory for Arduino files (e.g. /home/user/Arduino)');
	console.log('\tadd-git: add a new library from a remote git repo');
	console.log('\tadd-dir: add a new library from a local directory');
	console.log('\tupdate: update a library installed with git');
	console.log('\trm: remove a library');
}