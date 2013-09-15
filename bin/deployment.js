#!/usr/bin/env node

/**
 * Binary to run a deployment.
 * (C) 2013 Alex Fernández.
 */

// requires
var args = require('optimist').argv;
var deployment = require('../lib/deployment.js');

// init
if(args.help || args.h)
{
	help();
}
if(args._.length > 0)
{
    help();
}
args.directory = args.dir;
args.testDirectory = args.testdir;
args.deploymentCommand = args.exec;
deployment.run(args);

/**
 * Show online help.
 */
function help()
{
	console.log('Usage: deployment [options]');
	console.log('  runs a deployment.');
	console.log('Options are:');
	console.log('    --dir [path]      Directory to deploy to');
	console.log('    --testdir [path]  Directory with a test environment');
	console.log('    --exec [command]  Command to run after success');
	process.exit(0);
}


