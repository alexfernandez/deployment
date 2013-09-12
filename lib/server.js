'use strict';

/**
 * Server to listen for deployment intents.
 * (C) 2013 Alex Fernández.
 */


// requires
var http = require('http');
var util = require('util');
var url = require('url');
var Log = require('log');

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
			log.info('Listening on port %s', port);
			if (callback)
			{
				callback();
			}
		});
		return server
	}

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
		log.info('Request: %s', util.format(parsed));
		var deployPath = '/' + token + '/deploy';
		if (parsed.path != deployPath)
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
			var now = Date.now();
			var elapsed = Date.now() - start;
			log.info('Request finished in %s ms', elapsed);
			response.end('OK');
		});
	}
}

/**
 * Start a deployment server. Options can contain:
 *	- port: the port to use, default 3470.
 *	- token: a unique, random string needed in the path, for security reasons.
 *	  See the docs for details.
 *	- quiet: do not log any messages.
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

// start server if invoked directly
if (__filename == process.argv[1])
{
	exports.startServer({});
}

