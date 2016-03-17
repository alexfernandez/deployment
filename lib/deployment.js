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
var DEFAULT_TIMEOUT_SECONDS = 60;


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
			tasks.push(getRunnerIn('npm test', options.testDirectory));
		}
		if (options.directory)
		{
			tasks.push(self.updateDeploymentDirectory);
		}
		if (options.deploymentCommand)
		{
			var directory = options.directory || process.cwd();
			tasks.push(getRunnerIn(options.deploymentCommand, directory));
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
	 * Update the deployment directory.
	 */
	self.updateDeploymentDirectory = function(callback)
	{
		update(options.directory, callback);
	};

	/**
	 * Update the given directory.
	 */
	function update(directory, callback)
	{
		log.info('Updating %s', directory);
		var tasks = [];
		if (options.detail)
		{
			tasks.push(getRunnerIn('git fetch', directory));
			tasks.push(getRunnerIn('git log HEAD..@{u} --format=oneline', directory));
			tasks.push(getRunnerIn('git diff HEAD..@{u}', directory));
			tasks.push(getRunnerIn('git merge @{u}', directory));
		}
		else
		{
			var updateCommand = options.updateCommand || 'git pull';
			tasks.push(getRunnerIn(updateCommand, directory));
		}
		if (!options.noInstall)
		{
			tasks.push(getRunnerIn('npm install', directory));
		}
		async.waterfall(tasks, callback);
	}

	/**
	 * Get a function to exec the command in the directory.
	 */
	function getRunnerIn(command, directory)
	{
		return function(callback)
		{
			var params = {
				cwd: directory,
				timeout: 1000 * (options.timeout || DEFAULT_TIMEOUT_SECONDS),
				maxBuffer: 1024 * 1024,
			};
			childProcess.exec(command, params, function(error, stdout, stderr)
			{
				if (error)
				{
					return callback(command + ': ' + stdout + '\n' + error + ', ' + stderr);
				}
				log.info(command + ': ' + stdout);
				if (stderr)
				{
					log.error(command + ': ' + stderr);
				}
				return callback(null);
			});
		};
	}
};

/**
 * Run a test deployment.
 */
function testDeployment(callback)
{
	var options = {
		directory: '.',
		updateCommand: 'git pull origin master',
		deploymentCommand: 'ls .',
	};
	var deployment = new Deployment(options, new Log('error'));
	deployment.run(callback);
}

/**
 * Run a deployment. Options has these attributes:
 *	- directory: the directory where the package currently resides.
 *	- testDirectory: the directory where the test version of the package resides.
 *	- deploymentCommand: a command to run after a successful deployment,
 *	e.g. "sudo restart myService".
 *	- packageName: the name of the package to show in logs.
 *	- timeout: seconds to wait for all comands, default 60 seconds.
 *	- detail: show full log and diff of code to deploy.
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
		var elapsed = Math.round((Date.now() - start) / 10) / 100;
		if (error)
		{
			log.error(error);
			message = util.format('Error running deployment after %s seconds; finishing', elapsed);
			if (callback)
			{
				return callback(message);
			}
			log.error(message);
			return;
		}
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
	testing.run([
		testDeployment,
	], 10000, callback);
};

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

