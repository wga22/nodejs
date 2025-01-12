//=====================================================================
//framework to access tesla data
//=====================================================================

var fs = require('fs');
var tjs = require('teslajs');
require('colors');

process.on('uncaughtException', function (error) 
{
   console.log(error.stack);
});

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
	this.maxTries = 22;

    this.main = main;
	this.login_cb = _login_cb;
    this.process = _process;
    this.run = _run;
	
	function _login_cb(err, result) 
	{
        console.log("login_cb");
		if (result.error) 
		{
			//this.maxTries--;
            console.error(("Login failed! tries left: " + this.maxTries).red );
			console.warn(JSON.stringify(err));
        }
		else
		{
			console.log("login SUCCESS".green);			
			logo();
			var options = { authToken: result.authToken };
			tjs.vehicles(options, function (err, vehicles) 
			{
				if (err) 
				{
					console.log("\nError: " + err.red);
					return;
				}

				var vehicle = vehicles[options.index || 0];
				options.vehicleID = vehicle.id_s;
				options.vehicle_id = vehicle.vehicle_id;
				options.tokens = vehicle.tokens;

				if (vehicle.state.toUpperCase() == "OFFLINE") 
				{	
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
	}
	
	function _process(err, result) 
	{
		logo();
        var options = { authToken: result.authToken };
        tjs.vehicles(options, function (err, vehicles) 
		{
            if (err) 
			{
                console.log("\nError: " + err.red);
                return;
            }

            var vehicle = vehicles[options.index || 0];
            options.vehicleID = vehicle.id_s;
            options.vehicle_id = vehicle.vehicle_id;
            options.tokens = vehicle.tokens;

            if (vehicle.state.toUpperCase() == "OFFLINE") 
			{	
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

	function _run() 
	{
		console.log("run");       
	   try 
		{
            this.tokenFound = fs.statSync('.token').isFile();
        } 
		catch (e) 
		{
			console.log("didnt get token...")
			//console.log(e);
        }

        if (options.uri) 
		{
            console.log("Setting portal URI to: " + options.uri);
            tjs.setPortalBaseURI(options.uri);
        }

        if (this.tokenFound) 
		{
            console.log("token found 1");
			var fileStr = fs.readFileSync('.token', 'utf8');
            var token = JSON.parse(fileStr);

            if (token.access_token) 
			{
				console.log("found token 2")
                token = token.access_token;
            }

            this.login_cb(null, { error: false, authToken: token });
        } 
		else 
		{
			console.log("attempting login else");
            var username = options.username || process.env.TESLAJS_USER;
            var password = options.password || process.env.TESLAJS_PASS;
            tjs.login(username, password, this.login_cb);
        }
    }
}