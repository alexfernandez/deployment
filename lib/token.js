'use strict';

/**
 * Token generation.
 * (C) 2013 Alex Fernández.
 */

// requires
var Log = require('log');
var crypto = require('crypto');
var testing = require('testing');

// globals
var log = new Log('info');


/**
 * Generate a random token in base 36 with length 16.
 */
exports.createToken = function()
{
	var start = generateShortRandomId() + generateShortRandomId();
	return start + generateShortRandomId() + generateShortRandomId();
};

/**
 * Generate a 4-character long random id.
 * For tests generate a pseudo-random value.
 */
function generateShortRandomId(test)
{
	var bytes;
	try
	{
		if (test)
		{
			bytes = crypto.pseudoRandomBytes(4);
		}
		else
		{
			bytes = crypto.randomBytes(4);
		}
		log.debug('Generated %d bytes of random data', bytes.length);
	}
	catch (exception)
	{
		log.error('Could not generate random bytes: %s', exception);
		// handle error
	}
	var random = Math.abs(intFromBytes(bytes));
	log.debug('Integer: %s', random);
	var result = random.toString(36).slice(-4);
	while (result.length < 4)
	{
		result = '0' + result;
	}
	return result;
}

/**
 * Generate an int from an array of bytes.
 */
function intFromBytes(bytes)
{
	var val = 0;
	for (var i = 0; i < bytes.length; ++i)
	{
		val += bytes[i];
		if (i < bytes.length - 1)
		{
			val = val << 8;
		}
	}
	return val;
}

/**
 * Test randomicity.
 */
function testRandomId(callback)
{
	for (var i = 0; i < 10; i++)
	{
		var random = generateShortRandomId(true);
		log.debug('Generated: %s', random);
		testing.assertEquals(random.length, 4, 'Invalid random length');
	}
	testing.success(callback);
}

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	testing.run({
		randomId: testRandomId,
	}, callback);
};

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

