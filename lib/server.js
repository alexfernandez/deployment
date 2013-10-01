'use strict';

/**
 * Server to listen for deployment intents.
 * (C) 2013 Alex Fernández.
 */


// requires
require('prototypes');
var testing = require('testing');
var emailjs = require('emailjs');
var http = require('http');
var util = require('util');
var url = require('url');
var Log = require('log');
var deployment = require('./deployment.js');
var token = require('./token.js');

// globals
var log = new Log('info');

// constants
var PORT = 3470;


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
		options.token = token.createToken();
		log.info('Creating random token: %s', options.token);
	}
	var server;
	var mailServer;
	options.packageName = options.packageName || 'unnamed';

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
			log.info('Listening on endpoint http://localhost:' + port + '/deploy/' + options.token);
			if (callback)
			{
				callback();
			}
		});
		if (options.emailUser)
		{
			mailServer = emailjs.server.connect({
				user: options.emailUser,
				password: options.emailPassword,
				host: options.emailHost,
				ssl: (options.emailSsl == 'true'),
			});
			log.info('Connected to mail server %s', options.emailHost);
		}
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
		if (parsed.path == '/deploy/' + options.token + '/manual')
		{
			manual = true;
		}
		else if (!parsed.path.startsWith('/deploy/' + options.token))
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
				if (mailServer)
				{
					deployment.run(options, sendEmail);
					return;
				}
				deployment.run(options);
			}
		});
	}

	/**
	 * Send an email with the result of the deployment.
	 */
	function sendEmail(error, result)
	{
		var params = {
			from: options.emailFrom,
			to: options.emailTo,
			text: 'Package ' + options.packageName + '\n',
		};
		if (error)
		{
			params.subject = 'Deployment for ' + options.packageName + ' failed';
			params.text += 'Deployment failed: ' + error;
		}
		else
		{
			params.subject = 'Deployment for ' + options.packageName + ' successful';
			params.text += 'Deployment successful: ' + result;
		}
		mailServer.send(params, function(error)
		{
			if (error)
			{
				log.error('Email not sent: %s', error);
				return;
			}
			log.info('Email "%s" sent to %s', params.subject, params.to);
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
		'info': 'color: black',
		'notice': 'color: black; font-weight: bold',
		'warning': 'color: orange',
		'error': 'color: red',
		'alert': 'color: red; font-weight: bold',
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
	response.write('<h1>Manual Deployment Launched</h1>\n');

	for (var level in levels)
	{
		self[level] = getShow(level, levels[level]);
	}

	/**
	 * Get a function to show a message for a log level, in the given style.
	 */
	function getShow(level, style)
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
			response.write('<p style="' + style + '">\n' + replaced + '\n</p>\n');
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
 *	- packageName: name of the package for messages.
 *	- quiet: do not log any messages.
 *  - directory: the directory where the package currently resides.
 *  - testDirectory: the directory where the test version of the package resides.
 *  - deploymentCommand: a command to run after a successful deployment,
 *    e.g. "sudo restart myService".
 *	- emailUser:     User for email server');
 *	- emailPassword: Password for email server');
 *	- emailHost:     Host for email server');
 *	- emailSsl:      "true" to enable SSL');
 *	- emailFrom:     Email address that generates the message');
 *	- emailTo:       Destination for deployment message');
 *
 * An optional callback is called after the server has started.
 * In this case the quiet option is enabled.
 */
exports.startServer = function(options, callback)
{
	if (callback)
	{
		options.quiet = true;
	}
	if (!options.testDirectory && !options.directory)
	{
		log.warning('No directories given; no deployment will be done');
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

