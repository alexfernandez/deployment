#!/usr/bin/env node
'use strict';

/**
 * Binary to run deployment server.
 * (C) 2013 Alex Fernández.
 */

// requires
var args = require('optimist').argv;
var server = require('../lib/server');

var optionMap = {
	dir: 'directory',
	testdir: 'testDirectory',
	name: 'packageName',
	exec: 'deploymentCommand',
	noinst: 'noInstall',
	user: 'emailUser',
	password: 'emailPassword',
	host: 'emailHost',
	ssl: 'emailSsl',
	from: 'emailFrom',
	to: 'emailTo',
};

// init
if(args.help || args.h)
{
	help();
}
if(args._.length > 0)
{
    if(!isNaN(args._[0]))
	{
        args.port = parseInt(args._[0], 10);
    }
	else
	{
		console.log('Invalid port %s', args._[0]);
		help();
	}
}
for (var shortOption in optionMap)
{
	var longOption = optionMap[shortOption];
	args[longOption] = args[shortOption];
}
server.startServer(args);

/**
 * Show online help.
 */
function help()
{
	console.log('Usage: deployment-server [options] [port]');
	console.log('  starts a deployment server on the given port, default 3470.');
	console.log('At least one of these options should be enabled:');
	console.log('    --dir [path]      Directory to deploy to');
	console.log('    --testdir [path]  Directory with a test environment');
	console.log('Optional options:');
	console.log('    --token [token]   Security token for the URL');
	console.log('    --name [name]     Package name to show in messages');
	console.log('    --noinst          Do not run npm install.');
	console.log('    --exec [command]  Command to run after success');
	console.log('    --quiet           Do not show log messages');
	console.log('    --detail          Show log and diff of code to deploy.');
	console.log('Email-related options:');
	console.log('    --user [user]     User for email server');
	console.log('    --password [pwd]  Password for email server');
	console.log('    --host [host]     Host for email server');
	console.log('    --ssl [boolean]   "true" to enable SSL');
	console.log('    --from [email]    Email address that generates the message');
	console.log('    --to [email]      Destination for deployment message');
	process.exit(0);
}

