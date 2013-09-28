'use strict';

/**
 * Prototypes.
 * (C) 2013 Alex Fernández.
 */

// requires
var testing = require('testing');


/**
 * Find out if the string contains the argument at any position.
 */
String.prototype.contains = function(str)
{
	return this.indexOf(str) != -1;
};

/**
 * Test contains.
 */
function testContains(callback)
{
	testing.assert('abcde'.contains('bcd'), 'Contains included', callback);
	testing.assert(!'abcde'.contains('dcb'), 'Not contains excluded', callback);
	testing.success(callback);
}
/**
 * Replace all occurrences of a string with the replacement.
 */
String.prototype.replaceAll = function(find, replace)
{
	return this.split(find).join(replace);
};

/**
 * Test replace all.
 */
function testReplaceAll(callback)
{
	testing.assertEquals('ababab'.replace('a', 'x'), 'xbabab', 'Invalid replacement', callback);
	testing.assertEquals('ababab'.replaceAll('a', 'x'), 'xbxbxb', 'Invalid replacement for all', callback);
	testing.success(callback);
}

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	testing.run({
		contains: testContains,
		replaceAll: testReplaceAll,
	}, callback);
};

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

