'use strict';

/**
 * Run complete package tests.
 * (C) 2013 Alex Fernández.
 */

// requires
var Log = require('log');
var testing = require('testing');

// globals
var log = new Log('info');


/**
 * Run module tests.
 */
exports.test = function(callback)
{
	log.debug('Running tests');
	var tests = {};
	var modules = ['deployment', 'server', 'token'];
	modules.forEach(function(name)
	{
		var filename = './lib/' + name + '.js';
		tests[name] = require(filename).test;
	});
	testing.run(tests, 10000, callback);
};

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

