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
var GREEN = '\u001b[32m';
var RED = '\u001b[1;31m';
var BLACK = '\u001b[0m';


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
			var filteredLog = new FilteredLog(log);
			if (manual)
			{
				var pageLog = new WebPageLog('Manual Deployment', filteredLog, response);
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
				if (options.emailUser)
				{
					var emailLog = new EmailLog(options, filteredLog);
					deployment.run(options, emailLog, function(error, result)
					{
						emailLog.sendEmail(error, result, function(error, result)
						{
							if (error)
							{
								log.error('Email not sent: %s', error);
							}
							return log.info('Email sent: %s', result);
						});
					});
					return;
				}
				deployment.run(options, filteredLog);
			}
		});
	}
}

/**
 * A log that filters color codes.
 */
var FilteredLog = function(log)
{
	// self-reference
	var self = this;

	// attributes
	self.levels = ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'];
	var forbidden = [GREEN, RED, BLACK];

	// init
	self.levels.forEach(function(level)
	{
		self[level] = function()
		{
			var replaced = util.format.apply(util, arguments);
			var filtered = filter(replaced);
			log[level].call(log, filtered);
			return filtered;
		};
	});

	/**
	 * Filter a message.
	 */
	function filter(message)
	{
		forbidden.forEach(function(string)
		{
			message = message.replaceAll(string, '');
		});
		return message;
	}
};

/**
 * Test the filtered log.
 */
function testFilteredLog(callback)
{
	var filteredLog = new FilteredLog(log);
	testing.assertEquals(filteredLog.info(RED + 'Here' + GREEN), 'Here', 'Should filter colors out', callback);
	testing.success(callback);
}

/**
 * A log object that writes to the response for a web page.
 */
var WebPageLog = function(title, log, response)
{
	// self-reference
	var self = this;

	// attributes
	self.levels = {
		'debug': 'color: grey',
		'info': 'color: black',
		'notice': 'color: black; font-weight: bold',
		'warning': 'color: orange',
		'error': 'color: red',
		'critical': 'color: red; font-style: italic',
		'alert': 'color: red; font-weight: bold',
		'emergency': 'color: red; font-weight: bold; font-style: italic',
	};
	var replacements = {
		'\n': '<br>\n',
	};
	replacements[GREEN] = '<span style="color: green">';
	replacements[RED] = '<span style="color: red">';
	replacements[BLACK] = '</span>';

	// init
	response.writeHead(200, 'OK', {
		'Content-Type': 'text/html',
	});
	response.write('<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>');
	response.write(title);
	response.write('</title></head>\n<body>\n');
	response.write('<h1>Deployment Launched</h1>\n');
	for (var level in self.levels)
	{
		self[level] = getShow(level, self.levels[level]);
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
 * A response that stores every message and returns them as a web page.
 */
var  WebPageResponse = function()
{
	// self-reference
	var self = this;

	// attributes
	self.statusCode = 0;
	self.result = '';
	self.finished = false;

	/**
	 * Write the head first.
	 */
	self.writeHead = function(code)
	{
		self.statusCode = code;
	};

	/**
	 * Write any message.
	 */
	self.write = function(message)
	{
		self.result += message;
	};

	/**
	 * End the web page.
	 */
	self.end = function(message)
	{
		self.result += message;
		self.finished = true;
	};
};

/**
 * Test the web page log.
 */
function testWebPageLog(callback)
{
	var response = new WebPageResponse();
	var webPage = new WebPageLog('Test', log, response);
	testing.assertEquals(response.statusCode, 200, 'Invalid status code', callback);
	webPage.info('Here');
	webPage.error('There');
	testing.assert(!response.finished, 'Should not have finished the page yet', callback);
	webPage.close();
	testing.assert(response.finished, 'Should have finished the page by now', callback);
	testing.assert(response.result.contains('Here'), 'Should contain first message', callback);
	testing.assert(response.result.contains('There'), 'Should contain second message', callback);
	testing.success(callback);
}

/**
 * A log that stores everything in a web page, then sends an email.
 */
var EmailLog = function(options, log)
{
	// self-reference
	var self = this;

	// attributes
	var response = new WebPageResponse();
	var pageLog = new WebPageLog('Automatic Deployment', log, response);
	var mailServer = emailjs.server.connect({
		user: options.emailUser,
		password: options.emailPassword,
		host: options.emailHost,
		ssl: (options.emailSsl == 'true'),
	});
	// init
	log.debug('Connected to mail server %s', options.emailHost);
	for (var level in pageLog.levels)
	{
		self[level] = getShow(level);
	}

	/**
	 * Get a function to show the given level.
	 */
	function getShow(level)
	{
		return function()
		{
			// send to original log
			var fn = pageLog[level];
			fn.apply(pageLog, arguments);
		};
	}

	/**
	 * Send an email with the result of the deployment.
	 */
	self.sendEmail = function(error, result, callback)
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
			pageLog.alert(params.text);
		}
		else
		{
			params.subject = 'Deployment for ' + options.packageName + ' successful';
			params.text += 'Deployment successful: ' + result;
			pageLog.notice(params.text);
		}
		pageLog.close();
		var attachments = [ {
			data: response.result,
			alternative: true,
		}];
		params.attachment = attachments;
		mailServer.send(params, function(error)
		{
			if (error)
			{
				return callback('Email not sent: ' + error);
			}
			return callback(null, '"' + params.subject + '" sent to ' + params.to);
		});
	};
};

/**
 * Tests sending email. For a functional test you have to supply your own credentaials:
 * emailHost, emailUser, emailPassword, emailSsl (true or false), emailFrom, emailTo.
 * Place them in a JSON file called .email-credentails.json in the root of the package.
 */
function testEmailLog(callback)
{
	var credentials;
	try
	{
		credentials = require('../.email-credentials.json');
	}
	catch(exception)
	{
		log.info('Not testing email: %s', exception);
		return callback(null);
	}
	credentials.packageName = "test";
	var emailLog = new EmailLog(credentials, log);
	emailLog.sendEmail(null, 'Testing', function(error, sent)
	{
		testing.check(error, 'Could not send mail', callback);
		testing.assert(sent, 'Did not send mail', callback);
		testing.success(callback);
	});
}

/**
 * Start a deployment server. Options can contain:
 *	- port:          Port to use, default 3470.
 *	- token:         Unique, random string needed in the path, for security reasons.
 *		See the docs for details.
 *	- packageName:   Name of the package for messages.
 *	- quiet:         Do not log any messages.
 *  - directory:     Directory where the package currently resides.
 *  - testDirectory: Directory where the test version of the package resides.
 *  - deploymentCommand: a command to run after a successful deployment,
 *    e.g. "sudo restart myService".
 *	- timeout:       Seconds to wait for all commands including tests, default 10 seconds.
 *	- detail:        If true, show full log and diff of code to deploy.
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
	testing.run([
		testEmailLog,
		testWebPageLog,
		testFilteredLog,
	], 10000, callback);
};

// run tests if invoked directly
if (__filename == process.argv[1])
{
	log = new Log('debug');
	exports.test(testing.show);
}

