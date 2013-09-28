'use strict';

/**
 * Server to listen for deployment intents.
 * (C) 2013 Alex Fernández.
 */


// requires
require('./prototypes.js');
var testing = require('testing');
var http = require('http');
var util = require('util');
var url = require('url');
var Log = require('log');
var deployment = require('./deployment.js');

// globals
var log = new Log('info');

// constants
var PORT = 3470;
var TOKEN = 'sm6xrhnmij88qhg1';


/**
 * A deployment server, with options.
 */
function DeploymentServer(options)
{
	// self-reference
	var self = this;

	// attributes
	var port = options.port || PORT;
	if (!options.token)
	{
		log.warning('Using default token %s', TOKEN);
	}
	var token = options.token || TOKEN;
	var server;

	// init
	if (options.quiet)
	{
		log.level = 'notice';
	}
	
	/**
	 * Start the server.
	 * An optional callback will be called after the server has started.
	 */
	self.start = function(callback)
	{
		server = http.createServer(listen);
		server.on('error', function(error)
		{
			if (error.code == 'EADDRINUSE')
			{
				return createError('Port ' + port + ' in use, please free it and retry again', callback);
			}
			return createError('Could not start server on port ' + port + ': ' + error, callback);
		});
		server.listen(port, function()
		{
			log.info('Listening on endpoint http://localhost:' + port + '/' + token + '/deploy');
			if (callback)
			{
				callback();
			}
		});
		return server;
	};

	/**
	 * Log an error, or send to the callback if present.
	 */
	function createError(message, callback)
	{
		if (!callback)
		{
			return log.error(message);
		}
		callback(message);
	}

	/**
	 * Listen to an incoming request.
	 */
	function listen(request, response)
	{
		var parsed = url.parse(request.url, true);
		var manual = false;
		if (parsed.path == '/' + token + '/manual')
		{
			manual = true;
		}
		else if (parsed.path != '/' + token + '/deploy')
		{
			response.statusCode = 403;
			response.end('Bad request');
			return;
		}
		var start = Date.now();
		request.body = '';
		request.on('data', function(data)
		{
			request.body += data.toString();
		});
		request.on('end', function()
		{
			var elapsed = Date.now() - start;
			log.info('Request finished in %s ms', elapsed);
			if (manual)
			{
				var pageLog = new WebPageLog(response);
				deployment.run(options, pageLog, function(error, result)
				{
					if (error)
					{
						pageLog.error(error);
					}
					else if (result)
					{
						pageLog.notice(result);
					}
					pageLog.close();
				});
			}
			else
			{
				response.end('OK');
				deployment.run(options);
			}
		});
	}
}

/**
 * A log object that writes to the response for a web page.
 */
var WebPageLog = function(response)
{
	// self-reference
	var self = this;

	// attributes
	var levels = {
		'info': 'black',
		'notice': 'black',
		'warning': 'orange',
		'error': 'red',
		'alert': 'red',
	};
	var replacements = {
		'\u001b[32m': '<span style="color: green">',
		'\u001b[1;31m': '<span style="color: red">',
		'\u001b[0m': '</span>',
		'\n': '<br>',
	};

	// init
	response.writeHead(200, 'OK', {
		'Content-Type': 'text/html',
	});
	response.write('<html>\n<head><meta charset="UTF-8"><title>Manual Deployment</title></head>\n<body>\n');
	response.write('<h1>Started Deployment</h1>\n');

	for (var level in levels)
	{
		self[level] = getShow(level, levels[level]);
	}

	/**
	 * Get a function to show a message for a log level, in the given color.
	 */
	function getShow(level, color)
	{
		return function()
		{
			// first, to original log
			var fn = log[level];
			fn.apply(log, arguments);
			// now show in web page
			var replaced = util.format.apply(util, arguments);
			for (var original in replacements)
			{
				replaced = replaced.replaceAll(original, replacements[original]);
			}
			response.write('<p style="color: ' + color + '">\n' + replaced + '\n</p>\n');
		};
	}

	/**
	 * Finish the web page.
	 */
	self.close = function()
	{
		response.end('</body>\n</html>');
	};
};

/**
 * Test the web page log.
 */
function testWebPageLog(callback)
{
	var result = '';
	var statusCode = 0;
	var finished = false;
	var response = {
		writeHead: function(code)
		{
			statusCode = code;
		},
		write: function(message)
		{
			result += message;
		},
		end: function(message)
		{
			result += message;
			finished = true;
		},
	};
	var webPage = new WebPageLog(response);
	testing.assertEquals(statusCode, 200, 'Invalid status code', callback);
	webPage.info('Here');
	webPage.error('There');
	testing.assert(!finished, 'Should not have finished the page yet', callback);
	webPage.close();
	testing.assert(finished, 'Should have finished the page by now', callback);
	testing.assert(result.contains('Here'), 'Should contain first message', callback);
	testing.assert(result.contains('There'), 'Should contain second message', callback);
	testing.success(callback);
}

/**
 * Start a deployment server. Options can contain:
 *	- port: the port to use, default 3470.
 *	- token: a unique, random string needed in the path, for security reasons.
 *		See the docs for details.
 *	- quiet: do not log any messages.
 *  - directory: the directory where the package currently resides.
 *  - testDirectory: the directory where the test version of the package resides.
 *  - deploymentCommand: a command to run after a successful deployment,
 *    e.g. "sudo restart myService".
 * An optional callback is called after the server has started.
 * In this case the quiet option is enabled.
 */
exports.startServer = function(options, callback)
{
	if (callback)
	{
		options.quiet = true;
	}
	var server = new DeploymentServer(options);
	return server.start(callback);
};

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	testing.run({
		webPageLog: testWebPageLog,
	}, callback);
};

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

