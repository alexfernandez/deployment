'use strict';

/**
 * Prototypes.
 * (C) 2013 Alex Fernández.
 */

// requires
var testing = require('testing');


/**
 * Replace all occurrences of a string with the replacement.
 */
String.prototype.replaceAll = function(find, replace)
{
	return this.split(find).join(replace);
}

/**
 * Test replace all.
 */
function testReplaceAll(callback)
{
	testing.assertEquals('ababab'.replace('a', 'x'), 'xbabab', 'Invalid replacement');
	testing.assertEquals('ababab'.replaceAll('a', 'x'), 'xbxbxb', 'Invalid replacement for all');
	testing.success(callback);
}

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	testing.run({
		replaceAll: testReplaceAll,
	}, callback);
}

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

