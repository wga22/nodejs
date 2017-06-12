#!/bin/env node
var express = require('express');
var fs  = require('fs');
var util = require('util');
var bodyParser = require('body-parser');
var nhlcommon = require('./nhl_common');

var ConfigJSON = nhlcommon.loadConfig();

//http://www.nicetimeonice.com/api

 var GetInfoSite = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


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
        var fWriteChanges = false;
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
			res.setHeader('Content-Type', 'text/html');
			res.append("teams",JSON.stringify(nhlcommon.teams) );
			res.append("myteam",ConfigJSON.myteam );
			res.append("timezones",JSON.stringify(nhlcommon.timezones) );
			res.append("mytimezone",ConfigJSON.mytimezone );
			res.send(self.cache_get('index.html') );
        };
		
        self.routes['/nhlsettings.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/plain');
			//res.send( 'var teams=' + JSON.stringify(nhlcommon.teams) + ";\n");
			//res.send( 'var timezones=' + JSON.stringify(nhlcommon.timezones) + ";\n");
			//res.append("teams", );
			res.send(nhlcommon.teams);
			//res.send
        };
    };
	
	function handleWIFI(sSSID, sPasswrd)
	{
		//TODO
	}
	
	function handleTimeZone(sTZ)
	{
		if(ConfigJSON.mytimezone != sTZ)
		{
			ConfigJSON.mytimezone = sTZ;
			//TODO: update the rpi code
			fWriteChanges = true;			
		}
	}
	
	function handleTeamChange(sTeamID)
	{
		if(ConfigJSON.myteam != sTeamID)
		{
			ConfigJSON.myteam = sTeamID;
			fWriteChanges = true;
		}
	}
	
	function persistJSON()
	{
		if(fWriteChanges)
		{
			nhlcommon.writeConfig(ConfigJSON);
			fWriteChanges = false;
		}
	}
	
	
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
			self.app.get(r, self.routes[r]);
			self.app.post(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
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

function loadConfig()
{
	/* SAMPLE FILE
		see header 
	*/
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var oJSON =  {};
	try 
	{
		var jsonString = fs.readFileSync("./nhl_config.json").toString();
		oJSON = JSON.parse(jsonString);
	} 
	catch (err) 
	{
		oJSON = ConfigJSON;
		console.warn("The file 'nhl_config.json' does not exist or contains invalid arguments!");
		console.warn("Going with the best team, instead: " + ConfigJSON.myteam);
		//process.exit(1);
	}
	return oJSON;
}
