
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

Et voilà!

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

Options are:

* --quiet: do not show log messages.

* --dir [path]: deploy to the given directory. This directory must already have
  a copy of the git repository being deployed.

* --testdir [path]: use the given directory as test environment. This directory
  must already have a copy of the git repository being deployed.

* --exec [command]: run the given command after deployment, to restart the
  service.

### Web Server

When your server can be reached from the internet,
you can start a web server that will listen to requests, by default on port 3470.

    $ node bin/server.js --token wydjzfoytrg4grmy

Again, if you installed the package globally you can just use the command:

    $ serve-deployment

Any requests coming in with the special, magic token will result in a deployment.
From localhost use this URL:

    http://localhost:3470/wydjzfoytrg4grmy/deploy

You should see an OK message, or "Bad request" if an incorrect URL is sent.

If a token is not passed and therefore the default token is used, a warning will be shown.
To generate a good, random token just write at your Bash console:

    $ echo "$(head -c 16 /dev/random | base64 | tr '[A-Z]' '[a-z]' | sed 's/\/\+//g' | head -c 16)"

To access from the outside you can 

    http://localhost:3470/wydjzfoytrg4grmy/deploy

The resulting external URL can be added as a
[webhook to GitHub](https://help.github.com/articles/post-receive-hooks).

Options are the same as for deployment, plus:

* --token [token]: use the given token to secure the access URL.

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

