'use strict';

/**
 * Run fake package tests.
 * (C) 2013 Alex Fernández.
 */

// requires
var Log = require('log');

// globals
var log = new Log('info');


/**
 * Run fake module tests.
 */
exports.test = function()
{
	log.notice('Success! in fake tests');
}

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test();
}

