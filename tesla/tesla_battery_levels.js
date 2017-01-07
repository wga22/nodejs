#!/usr/bin/env node

Object.defineProperty(Object.prototype, "extend", {
	enumerable: false,
	value: function(from) {
		var props = Object.getOwnPropertyNames(from);
		var dest = this;
		props.forEach(function(name) {
			if (name in dest) {
				var destination = Object.getOwnPropertyDescriptor(from, name);
				Object.defineProperty(dest, name, destination);
				console.log("EXTEND:" + name)
			}
		});
		return this;
	}
});


var util = require('util');
var http = require('http');
//var express    = require("express");
//var mysql      = require('mysql');
var teslams = require('teslams');
var vid = null;

//MAIN
//testing();
main();
function pr(stuff) 
{
	console.log("Calling PR");
}
function main()
{

	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	try {

		var jsonString = fs.readFileSync("./config.json").toString();
		var config = JSON.parse(jsonString);
		var creds = { 
			email: config.username, 
			password: config.password 
		};
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	console.log("-----Running-----");
	teslams.get_vid( { email: creds.email, password: creds.password }, getChargeDetails); 
}

function getChargeDetails(a_vid)
{
	vid = a_vid;
	teslams.get_charge_state( a_vid, setChargeLevel );
}

function setChargeLevel(jsonVals)
{
	/*
	objectives:
	Sun - 60
	Mon - 70
	Tues - 80
	Wed - 70
	Thurs - 100
	Fri - 90
	Sat	- 50
	*/
	
	if (jsonVals.battery_range !== undefined) 
	{
		var nCurrentLevel = jsonVals.battery_level;
		//jsonVals.metric_battery_range = (jsonVals.battery_range * 1.609344).toFixed(2);
		console.log("Current Charge Level:" + nCurrentLevel);
		console.log("Current Range:" + jsonVals.battery_range);
		//teslams.honk(vid, pr);
		var nToday = (new Date()).getDay();
		var nPercent = 90;
		switch( nToday)
		{
			case 0 : nPercent = 65; break;
			case 1 : nPercent = 70; break;
			case 2 : nPercent = 80; break;
			case 3 : nPercent = 70; break;
			case 4 : nPercent = handleMax(nCurrentLevel, 70); break;
			case 5 : nPercent = 90; break;
			case 6 : nPercent = 50; break;
		}
		console.log('Day of week: ' + nToday);
		console.log('Set percent to : ' + nPercent);
		teslams.charge_range( { id: vid, range: 'set', percent: (nPercent) }, pr );
	}
	else
	{
		console.log("Issue getting values...");
		console.log(jsonVals);
	}

	
}

function handleMax(a_nChargeLvl, a_nPrev)
{
	//if the previous level is still there today, must mean car is dormant
	var nLevel = 100;
	if(a_nPrev <= (a_nChargeLvl+4))
	{
		console.log("doesn't merit charging the car more, since looks like it was sitting");
		console.log("previous:" + a_nPrev + " current level:" + a_nChargeLvl);
		nLevel = a_nPrev;
	}
	return nLevel;
	
}


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
  
  
*/

