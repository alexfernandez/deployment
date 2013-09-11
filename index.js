'use strict';

/**
 * Publish API functions to run deployments.
 * (C) 2013 Alex Fernández.
 */


// requires
var Log = require('log');
var deployment = require('./lib/deployment.js');

// globals
var log = new Log('info');
var concurrency = 100;
var requestsPerSecond = 1;
var agent = true;

// exports
exports.Deployment = deployment.Deployment;
exports.deploy = function(options)
{
	new deployment.Deployment(options).run();
};

