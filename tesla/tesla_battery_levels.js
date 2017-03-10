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

var fTesting = true;
var util = require('util');
//var express    = require("express");
//var mysql      = require('mysql');
var teslams = require('teslams');
var oDriveDetails = {};
var vid = null;

//MAIN
//testing();
main();
function pr( jsonVals ) {
	console.log( util.inspect( jsonVals ) );
	//writeValuesToThingSpeak(jsonVals)
}
function main()
{

	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	try 
	{
		var jsonString = fs.readFileSync("./tesla_config.json").toString();
		var config = JSON.parse(jsonString);
		var creds = { 
			email: config.username, 
			password: config.password 
		};
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	console.log("-----Running: "+ (new Date()).toLocaleString() + "-----");
	teslams.get_vid( { email: creds.email, password: creds.password }, setVidAndGetDriveDetails);
}

function setVidAndGetDriveDetails(a_vid)
{
	vid = a_vid;	//set global vid
	if(fTesting) console.log("retrieved VID: " + vid);
	try
	{
		teslams.get_drive_state(vid, setDriveDetailsAndGetChargeDetails)
	}
	catch(e)
	{
		console.log("ERROR: setVidAndGetDriveDetails " + e.error);
	}
}

function setDriveDetailsAndGetChargeDetails(a_oDriveDetails)
{
	oDriveDetails = a_oDriveDetails;
	teslams.get_charge_state( vid, setChargeValues );
}

//based on distance from home or day of week, pick a good max charge level
function setChargeValues(oChargeVals)
{
	if (oDriveDetails && oDriveDetails.latitude && oChargeVals && oChargeVals.battery_range !== undefined) 
	{
		var nDistance = distanceFromHome(oDriveDetails.latitude, oDriveDetails.longitude);
		
		if(fTesting)
		{
			console.log("Distance from Home: " + round2(nDistance));
			console.log("Lat, Lng : " + oDriveDetails.latitude+", "+ oDriveDetails.longitude);
			console.log("Bat Level: " + oChargeVals.battery_level);
		}
		var nCurrentLevel = oChargeVals.battery_level;
		//oChargeVals.metric_battery_range = (oChargeVals.battery_range * 1.609344).toFixed(2);
		console.log("Charge Level:" + nCurrentLevel + "%");
		console.log("Range: " + oChargeVals.battery_range + " miles");
		console.log("Charge added so far: " + oChargeVals.charge_miles_added_rated + " KWH");
		//TODO: start storing in a DB the miles added?
		var nPercent = 90; 	// standard value
		if(nDistance > 50)	//if more than 50 miles from home, assume full charge is desired
		{
			//if far from home, probably want full charge
			nPercent = 100;
			console.log('Setting range based on distance from home ' + round2(nDistance) + " miles to " + nPercent + "%");
		}
		else	//set the level based on the day of week, if near home
		{
			var nToday = (new Date()).getDay();
			var aDaysOfWeek = ['Sun','Mon','Tues','Wed','Thurs','Fri','Sat']
			//if lots of miles have been added via charging, or the battery level is low, means previous day was big day, so make sure set to 100 for the next day on the weekend
			var fCarUsedHeavilyPreviousDay = (oChargeVals.charge_miles_added_rated > 70) || (oChargeVals.battery_level < 50);
			switch(nToday)
			{
				case 0 : nPercent = (fCarUsedHeavilyPreviousDay ? 100 : 90); console.log("44"); break;	//Sunday (runs ~1am sunday)
				case 1 : nPercent = 70; break;	//Monday
				case 2 : nPercent = 75; break;	//tuesday
				case 3 : nPercent = 60; break;	// wednesday
				case 4 : nPercent = 80; break;	//Thursday
				case 5 : nPercent = 90; break;	//friday
				case 6 : nPercent = (fCarUsedHeavilyPreviousDay ? 100 : 90);break; //saturday
			}
			console.log('Setting range based on ' + aDaysOfWeek[nToday] + " to " + nPercent + "%");			
		}
		console.log('Set percent to : ' + nPercent);
		teslams.charge_range( { id: vid, range: 'set', percent: (nPercent) }, success );
	}
	else
	{
		console.log("Issue getting values...");
		//pr(oChargeVals);
	}
}

function success()
{
	console.log("Successful exit");
	//process.exit(0);
}

function distanceFromHome(a_nLat, a_nLng)
{
	var nHomeLat = 38.924997;
	var nHomeLng =-77.2810247;
	var nMilesFactor = 69;
	return Math.sqrt(Math.pow(a_nLat-nHomeLat, 2) + Math.pow(a_nLng-nHomeLng,2))*nMilesFactor;
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

