
[![Build Status](https://secure.travis-ci.org/alexfernandez/deployment.png)](http://travis-ci.org/alexfernandez/deployment)

# deployment

Continuous Deployment for the masses.

Download the latest version of your git package, run all tests and deploy to the specified directory.
Run a deployment server to launch deployments from the internet, and integrate with GitHub easily.
Includes an API to fire deployments from an external source.

## Installation

Install from npm:

    $ npm install deployment

Or add to your package.json as a dependency. For easier access to commands,
install the package globally:

    $ npm install -g deployment

For manual installation, download from GitHub:

    $ git clone https://github.com/alexfernandez/deployment

Install node modules:

    $ cd deployment
    $ npm install

And you are done!

## Usage

There are three basic ways to start a deployment.

### Command Line

To start a deployment from the command line:

    $ node bin/deployment.js

If you installed the package globally you can just use the command:

    $ deployment

Will launch a deployment, using the current directory as deployment directory.
The temp directory will be called like current, but reside in `../test`.
For instance, if your current directory is `/home/af/projects/x`, the default
test directory will be `/home/af/projects/test/x`.

#### Options

Command line options are:

* --quiet: do not show log messages.

* --dir [path]: deploy to the given directory. This directory must already have
  a copy of the git repository being deployed.

* --testdir [path]: use the given directory as test environment. This directory
  must already have a copy of the git repository being deployed.

* --exec [command]: run the given command after deployment, to restart the
  service.

### Web Server

You can start a web server that will listen to deployment requests,
by default on port 3470:

    $ node bin/server.js --token wydjzfoytrg4grmy

Again, if you installed the package globally you can just use the command:

    $ serve-deployment

Any requests coming in with the special, magic token will result in a deployment.
From localhost use this URL:

    http://localhost:3470/wydjzfoytrg4grmy/deploy

You should see an OK message, or "Bad request" if an incorrect URL is sent.

#### Options

Options are the same as for deployment, plus:

* --token [token]: use the given token to secure the access URL.

If a token is not passed the default token is used, and a warning will be shown.
To generate a good, random token just write at your Bash console:

    $ echo "$(head -c 16 /dev/random | base64 | tr '[A-Z]' '[a-z]' | sed 's/\/\+//g' | head -c 16)"

Why go through all this trouble? If you use a predictable URL third parties might
start deployments on your server, which may not be what you want.

#### External Access

You can access your deployment server from within your local network,
replacing localhost with your local IP address, e.g.:

    http://192.168.1.5:3470/wydjzfoytrg4grmy/deploy

When your server can be reached from the internet you can its your domain name:

    http://myserver.test.com:3470/wydjzfoytrg4grmy/deploy

The resulting external URL can be added as a
[webhook to GitHub](https://help.github.com/articles/post-receive-hooks)
to run an automated deployment every time new code is pushed to the server.

Make sure that the chosen port (3470 by default) is accessible from the outside.
You can also use nginx or a similar webserver to proxy connections from port 80
to your chosen port. With nginx you would include something like this
in your nginx.conf (replace with your actual token):

    location /wydjzfoytrg4grmy {
        proxy_read_timeout 200s;
        proxy_connect_timeout 2s;
        proxy_pass http://127.0.0.1:3470;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

So you can now use the default HTTP port 80:

    http://myserver.test.com/wydjzfoytrg4grmy/deploy

#### Manual Deployment

A manual deployment can be started using the same URL as before,
but ending in 'manual':

    http://localhost:3470/wydjzfoytrg4grmy/manual

In this case you will see the output of all deployment phases, and the result.

### API

You can also start a deployment using the API:

    var deployment = require('deployment');
    var options = {};
    deployment.deploy(options, function(error, result)
    {
      if (error)
      {
        log.error('Error: %s', error);
        return;
      }
      log.info('Success: %s', result);
    });

The following options are available:

* directory: the directory where the package currently resides.
* testDirectory: the directory where the test version of the package resides.
* deploymentCommand: a command to run after a successful deployment.
* quiet: suppress most log messages.

An optional callback `function(error, result)` is called after the deployment
finishes, either with an error or (if successful) with a result string.

## Process

The deployment process is standardized as follows:
* update code in test directory,
* update node modules in test directory,
* run package tests in test directory,
* update code in deployment directory,
* update node modules in test directory.

As console commands, the sequence would be:
    $ git pull /home/af/projects/test/x
    $ npm install /home/af/projects/test/x
    $ npm test /home/af/projects/test/x
    $ git pull /home/af/projects/x
    $ npm install /home/af/projects/x

### Service Restart

You will note that we have not mentioned any restart as part of the deployment process.
By default `deployment` does not deal with service restart, so how does the new code enter into service?
There are several alternatives.

First, `deployment` can be configured to run a specified command, passing it an option `deploymentCommand` from the API.

Second, the service could be run using `supervisor`, which would restart the service automatically
right after downloading the new code.

Another option is to run your services in cluster mode, rebooting each worker after a specified time.
This scheme does not mesh well with database schema updates, or any other irreversible changes.

