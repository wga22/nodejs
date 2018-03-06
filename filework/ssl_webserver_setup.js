#!/bin/env node
var express = require('express');
var fs  = require('fs');
var util = require('util');
var bodyParser = require('body-parser');

/*		INSTRUCTIONS
	1) change port forwarding on router to monster (enable current rule) (record the old location)
	2) update dns (http://freedns.afraid.org/) to point to "home": https://www.google.com/search?q=whats+my+ip&rlz=1C1CHKZ_enUS430US430&oq=whats+my+ip&aqs=chrome..69i57j0l5.1287j1j7&sourceid=chrome&ie=UTF-8 
	3) run this 
	4) go to https://www.sslforfree.com/
	5) get the manual string to validate
	6) put that string in sValidationString
	7) run the validation from sslforfree
	8) update the two files

nano /etc/letsencrypt/archive/willcloud.crabdance.com/privkey.pem
nano /etc/letsencrypt/archive/willcloud.crabdance.com/fullchain.pem

	9) disable port forwarding rule
	10) update the forwarding back to the old server location

*/


//update this to the string that freessl is expecting
const sValidationString = 'z8CIormWDp5EY5ZomfAig4K_jjn0YEc2kwHYSRMwcUQ.Mi-BKupvlgvgtEIrFk_Y34rZKfixQecJqQvupdvxcIg';
//http://www.nicetimeonice.com/api

 var GetInfoSite = function() 
 {

	//  Scope.
	var self = this;
	var fWriteChanges = false;


	/*  ================================================================  */
	/*  Helper functions.                                                 */
	/*  ================================================================  */

	/**
	 *  Set up server IP address and port # using env variables/defaults.
	 */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.NODEJS_IP;
        self.port      = process.env.NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
	//TODO: do we need this?
	 self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'code.html': '' };
        }

        //  Local cache for static content.
        self.zcache['code.html'] = fs.readFileSync('./code.html');
    };


     */


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() 
	{
		self.routes = { };
			
        self.routes['/'] = function(req, res) 
		{
			if(req.body && req.body.team)
			{
				handleWIFI(req.body.ssid, req.body.pass);
				handleTeamChange(req.body.team);
				handleTimeZone(req.body.timezone);
				persistJSON();
				
			}
			res.setHeader('Content-Type', 'text/plain');
			//TODO: get the ssid choices?
			//res.append("mytimezone",ConfigJSON.mytimezone );
			res.send( "sweet" );
			console.log("/");
        };
		
        self.routes['/nhlsettings.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/plain');
			//res.send( 'var teams=' + JSON.stringify(nhlcommon.teams) + ";\n");
			//res.send( 'var timezones=' + JSON.stringify(nhlcommon.timezones) + ";\n");
			//res.append("teams", );
			res.send(nhlcommon.teams);
			//res.send
        };
		
        self.routes['/code'] = function(req, res) {
            res.setHeader('Content-Type', 'text/plain');
			res.send("asdfasdfasdfasdfasdfsdf");        
			console.log("shutdown");
		};

    };
	
    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
		self.app.use( bodyParser.json() );       					// to support JSON-encoded bodies
		self.app.use(bodyParser.urlencoded({extended: true}));     // to support URL-encoded bodies

	
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) 
		{
			//TODO: fix to just use one, as I think this is causing stuff to be double called
			self.app.get(r, self.routes[r]);
			self.app.post(r, self.routes[r]);
        }

	//add handler for SSL verification
	//http://willasdfasdf.com/.well-known/acme-challenge/U9Vd3jL5sqOsivOukgCo-OkriHTLgcd_zhJk29eEYEw
	//http://localhost:8080/.well-known/acme-challenge/asdfasdf
	self.app.get('/.well*', function (req, res) 
		{
			res.send(sValidationString)
		});
	
	};


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        //self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */


/**
 *  main():  Main code.
 */
var zapp = new GetInfoSite();
zapp.initialize();
zapp.start();