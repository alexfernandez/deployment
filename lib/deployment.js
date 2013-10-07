'use strict';

/**
 * Deploy a software package.
 * (C) 2013 Alex Fernández.
 */

// requires
var childProcess = require('child_process');
var util = require('util');
var async = require('async');
var testing = require('testing');
var Log = require('log');

// globals
var log = new Log('info');
var originalLog = log;

// constants
var DEFAULT_TIMEOUT_SECONDS = 10;


/**
 * A deployment of a software package, using the same options as exports.run().
 */
var Deployment = function(options, log)
{
	// self-reference
	var self = this;

	// init
	if (options.quiet)
	{
		log.level = 'notice';
	}
	if (!options.testDirectory && !options.directory)
	{
		log.warning('No directories given; no deployment done');
	}

	/**
	 * Run the deployment.
	 */
	self.run = function(callback)
	{
		var tasks = [];
		if (options.testDirectory)
		{
			tasks.push(self.updateTestDirectory);
			tasks.push(self.runTests);
		}
		if (options.directory)
		{
			tasks.push(self.updateDeploymentDirectory);
		}
		if (options.deploymentCommand)
		{
			tasks.push(self.runDeploymentCommand);
		}
		async.waterfall(tasks, callback);
	};

	/**
	 * Update the test directory.
	 */
	self.updateTestDirectory = function(callback)
	{
		update(options.testDirectory, callback);
	};

	/**
	 * Run package tests.
	 */
	self.runTests = function(callback)
	{
		execIn('npm test', options.testDirectory, callback);
	};

	/**
	 * Update the deployment directory.
	 */
	self.updateDeploymentDirectory = function(callback)
	{
		update(options.directory, callback);
	};

	/**
	 * run a deployment command, if configured.
	 */
	self.runDeploymentCommand = function(callback)
	{
		var directory = options.directory || process.cwd();
		execIn(options.deploymentCommand, directory, callback);
	};

	/**
	 * Update the given directory.
	 */
	function update(directory, callback)
	{
		log.info('Updating %s', directory);
		execIn('git pull', directory, function(error)
		{
			if (error)
			{
				return callback(error);
			}
			execIn('npm install', directory, callback);
		});
	}

	/**
	 * Exec a command in the given directory.
	 */
	function execIn(command, directory, callback)
	{
		var params = {
			cwd: directory,
			timeout: 1000 * (options.timeout || DEFAULT_TIMEOUT_SECONDS),
		};
		childProcess.exec(command, params, function(error, stdout, stderr)
		{
			if (error)
			{
				return callback(command + ': ' + stdout + '\n' + error + ', ' + stderr);
			}
			log.info(command + ': ' + stdout);
			callback(null);
		});
	}
};

/**
 * Run a test deployment.
 */
function testDeployment(callback)
{
	var options = {
		directory: '.',
		testDirectory: '.',
		deploymentCommand: 'ls .',
	};
	var deployment = new Deployment(options, new Log('error'));
	var tasks = [
		deployment.updateTestDirectory,
		deployment.updateDeploymentDirectory,
		deployment.runDeploymentCommand,
	];
	async.waterfall(tasks, callback);
}

/**
 * Run a deployment. Options has these attributes:
 *	- directory: the directory where the package currently resides.
 *	- testDirectory: the directory where the test version of the package resides.
 *	- deploymentCommand: a command to run after a successful deployment,
 *	e.g. "sudo restart myService".
 *	- packageName: the name of the package to show in logs.
 *	- timeout: seconds to wait for all comands, default 10 seconds.
 * An optional log object is used to send messages.
 * An optional callback will be called after the deployment finishes.
 */
exports.run = function(options, log, callback)
{
	if (typeof log == 'function')
	{
		callback = log;
		log = null;
	}
	if (!log)
	{
		log = originalLog;
	}
	var start = Date.now();
	if (options.packageName)
	{
		log.notice('Starting deployment for %s', options.packageName);
	}
	var deployment = new Deployment(options, log);
	deployment.run(function(error)
	{
		var message;
		if (error)
		{
			log.error(error);
			message = 'Error running deployment; finishing';
			if (callback)
			{
				return callback(message);
			}
			log.error(message);
			return;
		}
		var elapsed = Math.round((Date.now() - start) / 10) / 100;
		message = util.format('Deployment success! in %s seconds', elapsed);
		if (callback)
		{
			return callback(null, message);
		}
		log.notice(message);
	});
};

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	testing.run({
		run: testDeployment,
	}, 10000, callback);
};

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

