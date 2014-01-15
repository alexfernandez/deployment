'use strict';

/**
 * Token generation.
 * (C) 2013 Alex Fernández.
 */

// requires
require('prototypes');
var Log = require('log');
var crypto = require('crypto');
var testing = require('testing');

// globals
var log = new Log('info');

// constants
var SHORT_LENGTH = 4;
var TOKEN_LENGTH = 16;


/**
 * Generate a random token in base 36 with length 16.
 */
exports.createToken = function()
{
	var ids = Math.floor(TOKEN_LENGTH / SHORT_LENGTH);
	var token = '';
	for (var i = 0; i < ids; i++)
	{
		token+= generateShortRandomId();
	}
	return token;
};

/**
 * Test token creation.
 */
function testToken(callback)
{
	var token = exports.createToken();
	testing.assertEquals(token.length, TOKEN_LENGTH, 'Invalid token length');
	testing.success(callback);
}

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
			bytes = crypto.pseudoRandomBytes(SHORT_LENGTH);
		}
		else
		{
			bytes = crypto.randomBytes(SHORT_LENGTH);
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
	var result = random.toString(36).slice(-SHORT_LENGTH);
	while (result.length < SHORT_LENGTH)
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
	var frequencies = {};
	var characters = '0123456789abcdefghijklmnopqrstuvwxyz';
	var c;
	for (var i = 0; i < characters.length; i++)
	{
		c = characters[i];
		frequencies[c] = 0;
	}
	var TRIALS = 100000;
	for (var trial = 0; trial < TRIALS; trial++)
	{
		var random = generateShortRandomId(true);
		log.debug('Generated: %s', random);
		testing.assertEquals(random.length, SHORT_LENGTH, 'Invalid random length');
		for (i = 0; i < random.length; i++)
		{
			c = random[i];
			testing.assert(c in frequencies, 'Character ' + c + ' not in frequencies', callback);
			frequencies[c] += 1;
		}
	}
	log.debug('Trials: %s', TRIALS);
	var expectedFrequency = SHORT_LENGTH * TRIALS / characters.length;
	var expectedDeviation = 5 * Math.sqrt(expectedFrequency);
	for (c in frequencies)
	{
		var deviation = Math.abs(expectedFrequency - frequencies[c]);
		log.debug('Frequency for %s: %s, deviation: %s', c, frequencies[c], deviation);
		testing.assert(deviation < expectedDeviation, 'Deviation is too high: ' + deviation + ' > ' + expectedDeviation, callback);
	}
	testing.success(callback);
}

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	testing.run([
		testToken,
		testRandomId,
	], callback);
};

// start if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

