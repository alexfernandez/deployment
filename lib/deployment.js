'use strict';

/**
 * Deploy a software package.
 * (C) 2013 Alex Fernández.
 */


// requires
var child_process = require('child_process');
var util = require('util');
var async = require('async');
var path = require('path');
var Log = require('log');

// globals
var log = new Log('info');
var originalLog = log;

// constants
var TEST_DIRECTORY = '/test/';


/**
 * A deployment of a software package, using the same options as exports.run().
 */
var Deployment = function(options)
{
	// self-reference
	var self = this;

	// attributes
	var directory = options.directory || process.cwd();
	var testDirectory = options.testDirectory;
	var deploymentCommand = options.deploymentCommand;
	var startTime = Date.now();

	// init
	if (options.quiet)
	{
		log.level = 'notice';
	}
	if (!testDirectory)
	{
		testDirectory = path.dirname(directory) + TEST_DIRECTORY + path.basename(directory);
	}

	/**
	 * Run the deployment.
	 */
	self.run = function(callback)
	{
		var tasks = [
			updateTestDirectory,
			runTests,
			updateDeploymentDirectory,
			runDeploymentCommand,
		];
		async.waterfall(tasks, callback);
	}

	/**
	 * Update the test directory.
	 */
	function updateTestDirectory(callback)
	{
		update(testDirectory, callback);
	}

	/**
	 * Run package tests.
	 */
	function runTests(callback)
	{
		execIn('npm test', testDirectory, callback);
	}

	/**
	 * Update the deployment directory.
	 */
	function updateDeploymentDirectory(callback)
	{
		update(directory, callback);
	}

	/**
	 * run a deployment command, if configured.
	 */
	function runDeploymentCommand(callback)
	{
		if (!deploymentCommand)
		{
			return callback(null);
		}
		execIn(deploymentCommand, directory, callback);
	}

	/**
	 * Update the given directory.
	 */
	function update(directory, callback)
	{
		log.info('Updating %s', directory);
		execIn('git pull', directory, function(error, result)
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
		};
		child_process.exec(command, params, function(error, stdout, stderr)
		{
			if (error)
			{
				return callback(command + ': ' + error + ', ' + stderr);
			}
			log.info(command + ': ' + stdout);
			callback(null);
		});
	}
}

/**
 * Run a deployment. Options has these attributes:
 *	- directory: the directory where the package currently resides.
 *	- testDirectory: the directory where the test version of the package resides.
 *	- deploymentCommand: a command to run after a successful deployment,
 *	  e.g. "sudo restart myService".
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
	var deployment = new Deployment(options);
	deployment.run(function(error, result)
	{
		if (error)
		{
			log.error(error);
			var message = 'Error running deployment; finishing';
			if (callback)
			{
				return callback(message);
			}
			log.error(message);
			return;
		}
		var elapsed = Math.round((Date.now() - start) / 10) / 100;
		var message = util.format('Deployment success! in %s seconds', elapsed);
		if (callback)
		{
			return callback(null, message);
		}
		log.notice(message);
	});
}

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.run({});
}

