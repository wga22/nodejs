#!/usr/bin/env node

//libraries
const debuggerObj = require('debug');	//https://www.npmjs.com/package/debug
//const util = require('util');	//https://nodejs.org/docs/latest-v8.x/api/util.html
const axios = require('axios');	//https://github.com/axios/
const fs = require('fs');	//https://nodejs.org/api/fs.html
const querystring = require("querystring");
const teslajs = require('teslajs');	//https://www.npmjs.com/package/teslajs
const tslaFramework = require('./teslaFramework.js');

//const axios = require('axios');	//https://github.com/axios/
//const { Client } = require('pg'); //npm install -g pg	//https://www.npmjs.com/package/pg

//CONSTS
const debug = debuggerObj('debug:*');
const info = debuggerObj('info:*');	//always show info
const errorLogger = debuggerObj('error:*');	//always show errors

//globals
var tsFramework = null;

var oConfig = {
        "portal_url": "https://owner-api.teslamotors.com/api/1/vehicles/",
        "stream_url": "https://streaming.vn.teslamotors.com/stream/",
        "username": "xxxx",
        "password": "xxxxx",
		"mfaPassCode" : "xxxx",
		"debug": "1",
		"newurl": "https://auth.tesla.com",
		"tp_api": ""
}

function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	debug("-----tesla_thingspeak.js %s ", (new Date()).toLocaleString());
	try 
	{
		var jsonString = fs.readFileSync("./tesla_config.json").toString();
		oConfig = JSON.parse(jsonString);
		fTesting = (oConfig.debug == "1" || oConfig.debug == "true");
	} 
	catch (err) 
	{
		errorLogger("The file 'tesla_config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}

	tsFramework = new tslaFramework.TeslaFramework(oConfig, writeToThingspeak);
	holdForLogin();
}

function holdForLogin()
{
	if(tsFramework.maxTries > 0)
	{
		debug("trying again for login.... %s", tsFramework.maxTries--);
		tsFramework.run();
		setTimeout(holdForLogin, 15000);
	}
}

function writeToThingspeak(tjs, options)
{
	console.log("writeToThingspeak")
    tjs.vehicleDataAsync(options).then( function(vehicleData) 
	{
        var vehicle_state = vehicleData.vehicle_state;
        var charge_state = vehicleData.charge_state;
		var drive_state = vehicleData.drive_state;

		/*
		//TODO: this is redundant, will add debugging to the validField func
		debug("battery_level %s", charge_state.battery_level);
		debug("battery_range %s", charge_state.battery_range);
		debug("est_battery_range %s", charge_state.est_battery_range);
		debug("ideal_battery_range %s", charge_state.ideal_battery_range);
		debug("speed %s", drive_state.speed);
		debug("odometer %s", vehicle_state.odometer);
		debug("latitude %s", drive_state.latitude);
		debug("longitude %s", drive_state.longitude);
		debug("car_version %s", vehicle_state.car_version);
		*/
		
		var aFields = [];
		//charge_state
		aFields.push(validField(charge_state, "battery_level", "field1") );
		aFields.push(validField(charge_state, "battery_range", "field4") );
		aFields.push(validField(charge_state, "est_battery_range", "field5") );
		aFields.push(validField(charge_state, "ideal_battery_range", "field6") );

		//vehicle
		aFields.push(validField(vehicle_state, "odometer", "field3") );
		aFields.push(validField(vehicle_state, "car_version", "status") );
		
		//drive state
		aFields.push(validField(drive_state, "latitude", "field7") );
		aFields.push(validField(drive_state, "longitude", "field8") );
		aFields.push(validField(drive_state, "speed", "field2") );
		
		//console.log(aFields.join(""));
		//return;
		//&field1=80&field2=0&field3=321&field4=239.02&field5=155.79&field6=275.09&field7=33&field8=23&status=6.3
		var sQS = aFields.join("");
		//dont bother writing to TP if not enough useful values
		if(sQS.length > 10)
		{
			var sURL = 'http://api.thingspeak.com/update?api_key='+ oConfig["tp_api"] + sQS
			debug(sURL);
			axios.get(sURL)
			  .then(function (response) 
			  {
				info("Successfully contacted thingspeak: %s" + sURL);
				//debug(response);
				process.exit(0);//HACK - end here
			  })
			  .catch(function (error) {
				// handle error
				errorLogger("issue uploading to QS %s", sURL);
				errorLogger(error);
			  })
			  .then(function () 
			  {
				// always executed
			  });			
			
			req.on('end', function(e) 
			{
				debug("fields: " + sQS);
				info("completed writing to thingspeak");
				process.exit(0);//HACK - end here
			});			
		}
	});
}


function validField(oObj, sField, sFieldName)
{
	if(!isNullOrUndefined(oObj) && !isNullOrUndefined(oObj[sField]))
	{
		debug("Adding field[%s]:=%s",sField, oObj[sField]  );
		return "&" + sFieldName + "=" + querystring.escape(oObj[sField]);
	}
	return "";
}

function isNullOrUndefined(oObj)
{
	return !((oObj && true) || oObj == 0)
}

main();


/*

function validField(oObj, sField, sFieldName)
{
	if(!isNullOrUndefined(oObj) && !isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + querystring.escape(oObj[sField]);
	}
	return "";
}

function merge_options(obj1,obj2)
{
    //create a new object, to contain all the attributes from both of the original objects
	var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}



function isNullOrUndefined(oObj)
{
	return !((oObj && true) || oObj == 0)
}

//TODO Change to support pg
function writeValuesToAwardspace(tslaVals)
{
//INSERT INTO `teslaresponse`(`createtime`, `est_battery_range`, `battery_level`, `speed`, `latitude`, `longitude`, `heading`, `gps_as_of`, `car_verson`) VALUES //([value-1],[value-2],[value-3],[value-4],[value-5],[value-6],[value-7],[value-8],[value-9])

	var aFields = [];
	aFields.push(validField(tslaVals, "battery_level", "battery_level") );
	aFields.push(validField(tslaVals, "speed", "speed") );
	aFields.push(validField(tslaVals, "odometer", "field3") );
	aFields.push(validField(tslaVals, "battery_range", "field4") );
	aFields.push(validField(tslaVals, "est_battery_range", "est_battery_range") );
	aFields.push(validField(tslaVals, "ideal_battery_range", "field6") );
	aFields.push(validField(tslaVals, "latitude", "latitude") );
	aFields.push(validField(tslaVals, "longitude", "longitude") );
	aFields.push(validField(tslaVals, "car_version", "car_version") );
	aFields.push(validField(tslaVals, "heading", "heading") );
	aFields.push(validField(tslaVals, "gps_as_of", "heading") );
	
	//its a problem if no fields are valid!
	var sFields = aFields.join("");
	//&field1=80&field2=0&field3=321&field4=239.02&field5=155.79&field6=275.09&field7=33&field8=23&status=6.3
	if(sFields.length < 6)
	{
		console.log("ERROR - No fields retrieved");
		return -1;
	}
	
	
	var options = {
	  host: 'api.thingspeak.com',
	  port: 80,
	  path: ('/update?api_key=MD1PLM36IK1LO9NZ' + sFields),
	  method: 'GET'
	};

	var req = http.request(options, function(res) 
	{
	  if(fTesting) console.log('STATUS: ' + res.statusCode);
	  if(fTesting) console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) 
	  {
		if(fTesting) console.log('BODY: ' + chunk);
	  });
	});

	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});

	// write data to request body
	req.write('data\n');
	req.write('data\n');
	req.end();
	if(fTesting) console.log("fields: " + sFields);
}












NOTES: 
get_charge_state:
	{ charging_state: null,
  charge_limit_soc: 84,
  charge_limit_soc_std: 90,
  charge_limit_soc_min: 50,
  charge_limit_soc_max: 100,
  charge_to_max_range: false,
  battery_heater_on: null,
  not_enough_power_to_heat: null,
  max_range_charge_counter: 0,
  fast_charger_present: false,
  fast_charger_type: '<invalid>',
  battery_range: 185.97,
  est_battery_range: 204.26,
  ideal_battery_range: 232.06,
  battery_level: 78,
  usable_battery_level: 78,
  battery_current: 0,
  charge_energy_added: 22.66,
  charge_miles_added_rated: 79,
  charge_miles_added_ideal: 98.5,
  charger_voltage: 1,
  charger_pilot_current: null,
  charger_actual_current: 0,
  charger_power: 0,
  time_to_full_charge: 0,
  trip_charging: null,
  charge_rate: 0,
  charge_port_door_open: false,
  motorized_charge_port: true,
  scheduled_charging_start_time: null,
  scheduled_charging_pending: false,
  user_charge_enable_request: null,
  charge_enable_request: true,
  eu_vehicle: false,
  charger_phases: null }
get_drive_state
{ shift_state: null,
  speed: null,
  latitude: 38.895555,
  longitude: -77.069788,
  heading: 266,
  gps_as_of: 1444400448 }
  
  
  			// USE teslams.get_charge_state( vid, pr );
			// USE teslams.get_drive_state( vid, pr );
			// USE teslams.get_vehicle_state( vid, pr );

			// teslams.wake_up( vid, pr );
			//
			// get some info
			//
			// teslams.mobile_enabled( vid, pr );
			// teslams.get_climate_state( vid, pr );
			 
			// teslams.get_gui_settings( vid, pr );
			//
			// cute but annoying stuff while debugging
			//
			// teslams.flash( vid, pr ); 
			// teslams.honk( vid, pr ); 
			// teslams.open_charge_port( vid, pr ) 
			//
			// control some stuff
			//
			// teslams.door_lock( { id: vid, lock: "lock" }, pr );
			// teslams.sun_roof( { id: vid, roof: "close" }, pr );
			// teslams.auto_conditioning( { id: vid, climate: "off" }, pr ); 
			// teslams.charge_range( { id: vid, range: "standard" }, pr ); 
			// teslams.charge_state( { id: vid, charge: "on" }, pr ); 
			// teslams.set_temperature( { id: vid, dtemp: 20 }, pr ); 
  
  
*/

