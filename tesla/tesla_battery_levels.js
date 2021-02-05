#!/usr/bin/env node
//Version: 1.2 - Jan 22, 2018
// updated: Feb 4, 2021

//manage the battery level of tesla to vary throughout the week, except when within home base

const debuggerObj = require('debug');
const util = require('util');
const http = require('http');
const fs = require('fs');	//https://nodejs.org/api/fs.html
const querystring = require("querystring");
const teslajs = require('teslajs');	//https://www.npmjs.com/package/teslajs
const tslaFramework = require('./teslaFramework.js');


//CONSTS
const debug = debuggerObj('debug:*');
const info = debuggerObj('info:*');	//always show info
const warnLogger = debuggerObj('warn:*');	//always warn info
const errorLogger = debuggerObj('error:*');	//always show errors

var oConfig = 
{
        "username": "xxxxx",
        "password": "xxxx",
		"mfaPassCode" : "xxx",
		"home" : {"latitude": 38.929997, "longitude":-77.1910347},
		"chargeLevels" : [90,70,75,60,70,90,80]
}



function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	info("-----tesla_batt_levels.js %s ", (new Date()).toLocaleString());
	try 
	{
		var jsonString = fs.readFileSync("./tesla_config.json").toString();
		oConfig = JSON.parse(jsonString);
	} 
	catch (err) 
	{
		errorLogger("The file 'tesla_config.json' does not exist or contains invalid arguments! Exiting...");
		errorLogger(err);
		process.exit(1);
	}
	var tsFramework = new tslaFramework.TeslaFramework(oConfig, setBatteryLevel);
	tsFramework.run();
}

function setBatteryLevel(tjs, options)
{
    tjs.vehicleDataAsync(options).then( 
	function(vehicleData) 
	{
        var vehicle_state = vehicleData.vehicle_state;
        var charge_state = vehicleData.charge_state;
		var drive_state = vehicleData.drive_state;

	if ( drive_state && drive_state.latitude && charge_state )
	{
		var nDistance = distanceFromHome(drive_state.latitude, drive_state.longitude);
		
		debug("Distance from Home: %s", round2(nDistance));
		debug("Lat, Lng: [%s, %s]", drive_state.latitude, drive_state.longitude);
		debug("Bat Level: " + charge_state.battery_level);
		var nCurrentLevel = charge_state.battery_level;
		var nCurrentSetLevel = charge_state.charge_limit_soc;
		//charge_state.metric_battery_range = (charge_state.battery_range * 1.609344).toFixed(2);
		debug("Charge Level: %s % of %s %",  nCurrentLevel, nCurrentSetLevel);
		debug("Range: %s miles ", charge_state.battery_range);
		//debug("charge %: " + nCurrentSetLevel + " ");
		debug("Charge added so far: " + charge_state.charge_miles_added_rated + " KWH");
		//TODO: start storing in a DB the miles added?
		var nPercent = parseInt(nCurrentSetLevel) ? parseInt(nCurrentSetLevel) : 90 ; 	// standard value
		if(nDistance < 50 )	//if more than 50 miles from home, assume driver has made adjustment, and do not make a change.
		{
			var nToday = (new Date()).getDay();
			var nYesterday = (nToday-1)% 7;
			var aDaysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
			//if lots of miles have been added via charging, or the battery level is low, means previous day was big day, so make sure set to 100 for the next day on the weekend
			var fCarUsedHeavilyPreviousDay = (charge_state.charge_miles_added_rated > 70) || (charge_state.battery_level < 50);
			
			//each position is a day of the week, starting with Sunday
			var aDayChargeLevels = (oConfig["chargeLevels"] && oConfig["chargeLevels"].length === 7) ? oConfig["chargeLevels"] : [90,70,75,60,70,90,80];
			if( nPercent >= 95 && !fCarUsedHeavilyPreviousDay )	//did the user manually change the charge level to 100 percent, even though not driven heavily?
			{
				info("looks like the user has made their own update to 100% so leave alone, and car was not driven heavily, so a trip must be upcoming");
			}
			else //automated mode
			{
				nPercent = aDayChargeLevels[nToday];
				debug('Setting range based on %s to %s %', aDaysOfWeek[nToday], nPercent);
			}
			if(nPercent != nCurrentSetLevel)
			{
				tjs.setChargeLimit(options, nPercent, function (err, result) 
				{
					if (result.result) 
					{
						info("completed setting battery level %s", nPercent );
					} 
					else
					{
						warnLogger("issue with setting charge limit: %s", result.reason);
					}
				});
			}
			else
			{
				info("Battery level(%s) is already %s",nCurrentSetLevel, nPercent);
			}
		}
		else
		{
			info("not changing charge percentage (%s %) due to being %s miles from home", nPercent, nDistance)
		}
	}
	else
	{
		warnLogger("missing values needed for changing charge state");
	}
	}).catch(e =>  errorLogger(e));
	//errorLogger("unable to run")
}

main();


function distanceFromHome(a_nLat, a_nLng)
{
	if(oConfig && oConfig.home && oConfig.home.latitude && oConfig.home.longitude)
	{
		var nHomeLat = oConfig.home.latitude;
		var nHomeLng = oConfig.home.longitude;
		debug("%s <> %s , %s <> %s",a_nLat,nHomeLat,a_nLng,nHomeLng )
		var nMilesFactor = 69;
		return Math.sqrt(Math.pow(a_nLat-nHomeLat, 2) + Math.pow(a_nLng-nHomeLng,2))*nMilesFactor;
	}
	else
	{
		warnLogger("distanceFromHome unable to find distance (%s, %s)", a_nLat, a_nLng );
		warnLogger("home: %s", oConfig.home);
	}
}

function round2(nNum)
{
	return Math.round(nNum * 100)/100;
}


/*
//mothballed since doesnt make sense to compare previous level, since car is likely charging,
// and should be back to same level by time program runs
function handleMax(a_nChargeLvl, a_nPrev)
{
	//if the previous level is still there today, must mean car is dormant
	var nLevel = 100;
	if(a_nPrev <= (a_nChargeLvl+4))
	{
		console.log("Looks like car wasnt useddoesn't merit charging the car more, since looks like it was sitting");
		console.log("previous:" + a_nPrev + " current level:" + a_nChargeLvl);
		nLevel = a_nPrev;
	}
	return nLevel;
	
}
*/

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function merge_options(obj1,obj2)
{
    //create a new object, to contain all the attributes from both of the original objects
	var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}


function validField(oObj, sField, sFieldName)
{
	if(!util.isNullOrUndefined(oObj) && !util.isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + oObj[sField];
	}
	return "";
}



/*
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
  

function set_proxy( sProxy ) 
{
	if(sProxy && sProxy !== undefined && sProxy.length > 0)
	{
		//exports.proxy = sProxy;
		request.defaults({'proxy': sProxy});		
	}
}
exports.set_proxy = set_proxy;

  
*/

