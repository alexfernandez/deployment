[![Build Status](https://secure.travis-ci.org/alexfernandez/deployment.png)](http://travis-ci.org/alexfernandez/deployment)

[![Package quality](http://packagequality.com/badge/deployment.png)](http://packagequality.com/#?package=deployment)

# deployment

Continuous Deployment for the masses.

Download the latest version of your git package, run all tests and deploy to the specified directory.
Run a deployment server to launch deployments from the internet, and integrate with GitHub easily.
Send email notifications for every deployment, successful or failed.

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

If you installed the package globally you can just use the command `deployment-run`:

    $ deployment-run

Will launch a deployment, using the current directory as deployment directory.
If no test directory is given, the deployment will just download the latest code
and put it in production.

When a test directory is given:

    $ node bin/deployment --testdir "../test/package/"

then package tests will be run first, and only if they succeed will the deployment
proceed. A deployment directory can also be given:

    $ node bin/deployment --dir "package/"

#### Options

Command line options are:

* --quiet: do not show log messages.

* --dir [path]: deploy to the given directory, defaults to the current directory.
  This directory must already have a copy of the git repository being deployed.

* --testdir [path]: use the given directory as test environment, no default.
  This directory must already have a copy of the git repository being deployed.

* --name [name]: package name to show in messages, default `unnamed`.

* --noinst: do not run `npm install` when installing.

* --exec [command]: run the given command after deployment, to restart the
  service.

* --timeout [seconds]: max time to wait for commands including tests,
  default 60 seconds.

* --detail: show full detail (log and diff) of code to be deployed.

### Web Server

You can start a web server that will listen to deployment requests,
by default on port 3470:

    $ node bin/server.js --dir .

Again, if you installed the package globally you can just use the command
`deployment-server`:

    $ deployment-server --dir .

At the very least a deployment directory must be given with `--dir`.
A token can also be specified:

    $ node bin/server.js --dir . --token wydjzfoytrg4grmy

Otherwise a random token will be automatically generated.
Any requests coming in with the special, magic token will result in a deployment.
From localhost use this URL:

    http://localhost:3470/deploy/wydjzfoytrg4grmy

You should see an OK message, or "Bad request" if an incorrect URL is sent.

#### Options

Options are the same as for deployment, with a little change and a few additions:

* --dir [path]: deploy to the given directory, _no defaults_.
  This directory must already have a copy of the git repository being deployed.

In the case of the server a deployment directory needs to be explicitly given,
or no production deployment will be done. A test deployment may still be done.
This will be explained later, in the section about distributed deployments.
If no test directory and no deployment directory are given,
the server will complain at startup.

* --token [token]: use the given token to secure the access URL.

If no token is passed then a random token will be generated and shown on startup.

Why use a random URL for deployments?
If you use a predictable URL any third parties might guess it
and launch deployments on your server, which may not be what you want.

The following parameters are used to send email notifications.

* --user [user]:     User for email server');
* --password [pwd]:  Password for email server');
* --host [host]:     Host for email server');
* --ssl [boolean]:   "true" to enable SSL');
* --from [email]:    Email address that generates the message');
* --to [email]:      Destination for deployment message');

The deployment server can send emails each time a deployment is run.
These parameters contain the whole configuration to access an SMTP server.
Example:

    --from alexfernandeznpm@gmail.com --to alexfernandeznpm@gmail.com
      --user alexfernandeznpm@gmail.com --password [REDACTED]
      --host smtp.gmail.com --ssl true

to send email using a Gmail account.
The recipient will get a mail with a complete log of the deployment,
and the outcome in the subject.

#### Manual Deployment

A manual deployment can be started using the same URL as before,
but ending in 'manual':

    http://localhost:3470/wydjzfoytrg4grmy/manual

In this case you will see the output of all deployment phases, and the result.

#### Keeping It Running

Ideally you should start your deployment server when your system starts up.

Ubuntu: in samples/upstart-deployment-server.conf you have a sample Upstart task to start
your deployment server running and keep it running. The relevant lines are quoted here:

    cd $DEPLOYMENT_DIR
    exec sudo -u ubuntu "deployment-server --dir . --token ke8mqs3ahdhul3kr

A constant token is used to have a predictable URL to access.

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
* detail: show log and diff of code to deploy.

An optional callback `function(error, result)` is called after the deployment
finishes, either with an error or (if successful) with a result string.

## Tutorials

Now we will review three basic scenarios where the deployment package can help you:
simple deployment from GitHub, deployment with tests, and distributed deployments.
We will see a detailed, step-by-step tutorial for each scenario.

### Tutorial: Simple Deployment

You have a single server where you just want to deploy your latest version after each push
to a GitHub repository. You just need to start the deployment server in the directory where the
deployment is going to happen, say `/home/ubuntu/production`:

    $ cd /home/ubuntu/production
    $ deployment-server --dir . --token vurrbab8rj780faz

You need to supply a fixed token so that the resulting URL can be used as a GitHub webhook.
Your endpoint will now be http://localhost:3470/deploy/vurrbab8rj780faz.

The deployment process will be as follows:
* update code in deployment directory,
* update node modules in deployment directory.

As console commands, the sequence would be:
    $ git pull /home/ubuntu/production
    $ npm install /home/ubuntu/production

#### Generating a Token

To generate a random token just run the deployment server without one:

    $ deployment-server --dir .
    [...] INFO Creating random token: 21wlpjt6ay2liapp

This token should be sufficiently random. You can also just write at your Bash console:

    $ echo "$(head -c 16 /dev/random | base64 | tr '[A-Z]' '[a-z]' | sed 's/\/\+//g' | head -c 16)"

There is a sample Bash command in samples/generate-token.sh, for your convenience.

#### External Access

You can access your deployment server from within your local network,
replacing `localhost` with your local IP address, e.g.:

    http://192.168.1.5:3470/deploy/wydjzfoytrg4grmy

When your server can be reached from the internet you can its your domain name:

    http://myserver.test.com:3470/deploy/wydjzfoytrg4grmy

Make sure that the chosen port (3470 by default) is accessible from the outside.
You can also use nginx or a similar webserver to proxy connections from port 80
to your chosen port. With nginx you would include something like this
in your nginx.conf:

    location /deploy {
        proxy_read_timeout 200s;
        proxy_connect_timeout 2s;
        proxy_pass http://127.0.0.1:3470;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

You have this configuration in samples/nginx-redirection.conf
So you can now use the default HTTP port 80:

    http://myserver.test.com/deploy/wydjzfoytrg4grmy

The resulting external URL can be added as a
[webhook to GitHub](https://help.github.com/articles/post-receive-hooks)
to run an automated deployment every time new code is pushed to the server.
GitHub requests will always come from the ports shown in
[this page](https://api.github.com/meta), so it is easy in nginx
to stop requests that come from other IP addresses.
Just add these lines to your nginx.conf:

        deny all;
        allow 192.168.1.0/24;
        allow 204.232.175.64/27;
        allow 192.30.252.0/22;

Besides port redirection you can also listen on a subdomain,
add basic authentication, limit IP addresses and many more things.
Deployments can be made as safe as desired.

### Tutorial: Deployment with Tests

Now you have grown up, but just a bit: still with a single server, you want to run all package tests
on a test repository before deploying your latest code.
Both test and production directories must be specified; as before the production repo lives at
`/home/ubuntu/production`, and the new test repo at `/home/ubuntu/test`.
Each directory must contain a full git repository with its proper configuration;
since we are using just a single machine
for tests and for production, we should ensure that any resources (e.g. databases)
are adequately isolated.

We now start the server as follows:

    $ cd /home/ubuntu/production
    $ deployment-server --dir . --testdir /home/ubuntu/test --token vurrbab8rj780faz

The server will listen as before at http://localhost:3470/deploy/vurrbab8rj780faz.

#### Process

The deployment process is a bit more convoluted than before:
* update code in test directory,
* update node modules in test directory,
* run package tests in test directory,
* update code in deployment directory,
* update node modules in deployment directory.

As console commands, the sequence would be:
    $ git pull /home/ubuntu/test
    $ npm install /home/ubuntu/test
    $ npm test /home/ubuntu/test
    $ git pull /home/ubuntu/production
    $ npm install /home/ubuntu/production

### Service Restart

You will note that we have not mentioned any restart as part of the deployment process.
By default the deployment package does not deal with service restart, so how does the new code enter into service?
There are several alternatives.

First, the deployment package can be configured to run a specified command, passing it an option `deploymentCommand` from the API.
You can restart an Upstart task, reboot an init.d service or run any other command you need.

Second, the service could be run using a package like `supervisor`,
which will restart the service automatically right after downloading the new code.

Another option is to run your services in cluster mode, rebooting each worker after a specified time.
This last scheme does not mesh well with database schema updates, or any other irreversible changes.

### Tutorial: Distributed Deployment

Our last scenario is the most complex (and realistic) of the set:
one integration machine and a set of production servers.
This is a common setup to withstand high loads.
From a deployment perspective it is also much more flexible than having tests
run on the production machine: separate databases and resources can be used,
so it can also be used even with just one production machine.

This scenario is complex so please bear with us.
For simplicity, we assume one integration server with a git repo for tests,
located at `/home/ubuntu/integration/`; and one production machine
with a production git repo at `/home/ubuntu/production`.

Let us start with the production machine, accessible from the network as production.test.com.
This time we will use an Upstart task to start our production server,
boringly called `production`: this starts up our web server or whatever.
The deployment server will be started with another Upstart task,
equivalent to the following commands:

    $ cd /home/ubuntu/production
    $ deployment-server --dir . --token vurrbab8rj780faz \
      --exec "sudo restart production"

Note that the deployment server restarts the production server.
Note also that we do not specify a test directory, as there is none here!
The server will listen at http://production.test.com:3470/deploy/vurrbab8rj780faz,
so we can trigger a deployment from the command line using this command:

    $ wget http://production.test.com:3470/deploy/vurrbab8rj780faz

However this time we will not be accessing this URL directly,
but from the integration machine integration.test.com.
And here the daemon is started as follows:

    $ cd /home/ubuntu/integration
    $ deployment-server --testdir . --token vurrbab8rj780faz \
      --exec "wget http://production.test.com:3470/deploy/vurrbab8rj780faz"

So we use the same command as before to trigger a deployment on the production machine,
_only if the tests on the integration server go well_.

This integration server will now be listening at
http://integration.test.com:3470/deploy/vurrbab8rj780faz,
which we can use as a GitHub webhook.

#### Process

The deployment process is divided in two parts. On the integration server:
* update code in test directory,
* update node modules in test directory,
* run package tests in test directory,
* access production machine and start a deployment.

On the production server:
* update code in deployment directory,
* update node modules in deployment directory,
* restart the production web server.

As console commands, the sequence would be:

    integration.test.com $ git pull /home/ubuntu/test
    integration.test.com $ npm install /home/ubuntu/test
    integration.test.com $ npm test /home/ubuntu/test
    integration.test.com $ wget http://production.test.com:3470/deploy/vurrbab8rj780faz

    production.test.com $ git pull /home/ubuntu/production
    production.test.com $ npm install /home/ubuntu/production
    production.test.com $ sudo restart production

The process in one server starts the process on the second.

#### Command distribution

It is usual to have multiple servers receiving requests,
to distribute the load.
How can we reach them all from the integration server,
so we can have a coordinated deployment?

A blunt solution would be to change the `--exec` parameter to reach many different URLs:

    $ wget http://production1.test.com:3470/deploy/vurrbab8rj780faz; \
      wget http://production2.test.com:3470/deploy/vurrbab8rj780faz; \
      [...]

It is better to create a simple script and add it to your application's repo,
which will be run after a deployment.
This script (called e.g. `deploy-all.sh`) may run multiple wget commands.

    $ deployment-server --testdir . --exec "bin/deploy-all.sh"

The number of servers may be variable though. More sophisticated versions of this script
would first learn how many servers are running, their locations, and access them in turn.

## License

(The MIT License)

Copyright (c) 2013 Alex Fernández <alexfernandeznpm@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

