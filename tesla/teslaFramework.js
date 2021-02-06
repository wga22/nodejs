//=====================================================================
//framework to access tesla data
//=====================================================================
"use strict";

var fs = require('fs');
var tjs = require('teslajs');
require('colors');

var nRetries = 10;

function logo() {
    console.log("\n");
    console.log("TTTTT EEEEE SSSSS L     AAAAA     J SSSSS");
    console.log("  T   EEEEE S     L     AAAAA     J S");
    console.log(" TTT        s     L               J S");
    console.log("  T   EEEEE SSSSS L     AAAAA     J SSSSS");
    console.log("  T             S L     A   A     J     S");
    console.log("  T   EEEEE     S L     A   A J   J     S");
    console.log("  T   EEEEE SSSSS LLLLL A   A JJJJJ SSSSS");
    console.log("=========================================");
}



exports.TeslaFramework = function TeslaFramework(options, main) {
    this.options = options;
    this.tokenFound = false;
    this.main = main;

    this.login_cb = function (err, result) 
	{
        if (result.error) 
		{
            console.error("Login failed!".red);
            console.warn(JSON.stringify(result.error));
			nRetries--;
			if(nRetries > 0)
			{
				console.warn("retrying..." +  nRetries)
				setTimeout(this.run, 5000);	//wait 5 seconds, and retry
			}
            return;
        }

        logo();

        var options = { authToken: result.authToken };
        tjs.vehicles(options, function (err, vehicles) 
		{
            if (err) {
                console.log("\nError: " + err.red);
                return;
            }

            var vehicle = vehicles[options.index || 0];
            options.vehicleID = vehicle.id_s;
            options.vehicle_id = vehicle.vehicle_id;
            options.tokens = vehicle.tokens;

            if (vehicle.state.toUpperCase() == "OFFLINE") {
                console.log("\nResult: " + "Unable to contact vehicle, exiting!".bold.red);
                return;
            }

            var carType = tjs.getModel(vehicle);
            
            console.log("\nVehicle " + vehicle.vin.green + " - " + carType.green + " ( '" + vehicle.display_name.cyan + "' ) is: " + vehicle.state.toUpperCase().bold.green);

            if (main) 
			{
                main(tjs, options);
            }
        });
    }

    this.run = function () 
	{
        try {
            this.tokenFound = fs.statSync('.token').isFile();
        } catch (e) {
        }

        if (options.uri) {
            console.log("Setting portal URI to: " + options.uri);
            tjs.setPortalBaseURI(options.uri);
        }

        if (this.tokenFound) {
            var fileStr = fs.readFileSync('.token', 'utf8');
            var token = JSON.parse(fileStr);

            if (token.access_token) 
			{
				console.log("found token")
                token = token.access_token;
            }

            this.login_cb(null, { error: false, authToken: token });
        } else {
            var username = options.username || process.env.TESLAJS_USER;
            var password = options.password || process.env.TESLAJS_PASS;

            tjs.login(username, password, this.login_cb);
        }
    }
}