'use strict';

/**
 * Publish API functions to run deployments.
 * (C) 2013 Alex Fernández.
 */


// requires
var deployment = require('./lib/deployment.js');

// exports
exports.deploy = deployment.run;

