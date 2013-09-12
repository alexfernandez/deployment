
[![Build Status](https://secure.travis-ci.org/alexfernandez/deployment.png)](http://travis-ci.org/alexfernandez/deployment)

# deployment

Continuous Deployment for the masses.

Download the latest version of any GitHub package, run all tests and deploy to the specified directory.
Can be launched from GitHub webhook or from any other URL. Also includes an API to fire deployment from an external source.

## Installation

Download from GitHub:

    $ git clone https://github.com/alexfernandez/deployment

Install node modules:

    $ cd deployment
    $ npm install

Et voilà!

## Usage

There are three basic ways to start a deployment.

### Command Line

To start a deployment from the command line:

    $ node lib/deployment.js

Will launch a deployment, using the current directory as deployment directory.
The temp directory will be called like current, but reside in `../test'.
For instance, if your current directory is `/home/af/projects/x', the default
test directory will be `/home/af/projects/test/x'.

### Web Server

When your server can be reached from the internet,
you can start a web server that will listen to requests, by default on port 3470.

    $ node lib/server.js --path /wydjzfoytrg4grmy/deploy

Any requests coming in to the special, magic URL will result in a deployment.
From localhost:

    http://localhost:3470/wydjzfoytrg4grmy/deploy

You should see an OK message, or "Bad request" if an incorrect URL is sent.

If a path is not passed and therefore the default path is used, a warning will be shown.
To generate a good, random path just write at your Bash console:

    $ echo "/$(head -c 16 /dev/random | base64 | tr '[A-Z]' '[a-z]' | head -c 16)/deploy"

To access from the outside you can 

    http://localhost:3470/wydjzfoytrg4grmy/deploy

The resulting external URL can be added as a webhook to GitHub, as seen here.

### API

You can also start a deployment using the API.

## Process

The process is standardized as follows:
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
By default `deployment' does not deal with service restart, so how does the new code enter into service?
There are several alternatives.

First, `deployment' can be configured to run a specified command, passing it an option `deploymentCommand' from the API.

Second, the service could be run using `supervisor', which would restart the service automatically
right after downloading the new code.

Another option is to run your services in cluster mode, rebooting each worker after a specified time.
This scheme does not mesh well with database schema updates, or any other irreversible changes.

