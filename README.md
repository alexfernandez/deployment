
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

Right now `deployment' needs to be run from the command line:

    $ node lib/deployment.js

Will launch a deployment, using the current directory as deployment directory.
The temp directory will be called like current, but reside in `../test'.
For instance, if your current directory is `/home/af/projects/x', the default
test directory will be `/home/af/projects/test/x'.

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

First, `deployment' can be configured to run a specified command.

Second, the service could be run using `supervisor', which would restart the service automatically
right after downloading the new code.

Another option is to run your services in cluster mode, rebooting each worker after a specified time.
This scheme does not mesh well with database schema updates, or any other irreversible changes.

