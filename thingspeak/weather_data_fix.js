#!/usr/bin/env node

/*
program: fix the missing weather data from thingspeak attic data set


NOTES:
Sample url
https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/history?aggregateHours=1&combinationMethod=aggregate&startDateTime=2019-07-01T00%3A00%3A00&endDateTime=2019-07-02T00%3A00%3A00&dayEndTime=23%3A0%3A0&maxStations=1&maxDistance=-1&contentType=json&unitGroup=us&locationMode=single&key=NFVZ8J4AE2MMQJVRDXBQC3PX7&dataElements=default&locations=22182

C:\Users\wga22\Documents\development\github\nodejs\thingspeak\sample_virtual_crossing.json

//https://www.wunderground.com/history/daily/KIAD/date/2019-2-14


*/

//libraries
const debuggerObj = require('debug');	//https://www.npmjs.com/package/debug
//const util = require('util');	//https://nodejs.org/docs/latest-v8.x/api/util.html
const axios = require('axios');	//https://github.com/axios/
const fs = require('fs');	//https://nodejs.org/api/fs.html
const { Client } = require('pg'); //npm install -g pg	//https://www.npmjs.com/package/pg
const { start } = require('repl');

//CONSTS
const debug = debuggerObj('debug:*');
const info = debuggerObj('info:*');	//always show info
const errorLogger = debuggerObj('error:*');	//always show errors
const configFile = "./weather_data_config.json";

const weatherURL = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/history?aggregateHours=1&combinationMethod=aggregate&maxStations=1&maxDistance=-1&contentType=json&unitGroup=us&locationMode=single&dataElements=default&dayEndTime=23%3A0%3A0";
const MILLISPERDAY = 24*3600000;
//globals
var dbclient = null;


var oConfig = {
	"database":
	{
		"user": "xx",
		"host": "xxx.lan",
		"database": "dbname",
		"password": "myPass",
		"port": "5432"
	},
	"weather_key": "xxx",
	"locations": "12345"
}

async function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	debug("-----weather data puller %s ", (new Date()).toLocaleString());
	try 
	{
		var jsonString = fs.readFileSync(configFile).toString();
		oConfig = JSON.parse(jsonString);
		debug("read in file %s", configFile )
	} 
	catch (err) 
	{
		errorLogger("The file '%s' does not exist or contains invalid arguments! Exiting...", configFile);
		process.exit(1);
	}
	try
	{
		dbclient = new Client(oConfig["database"]);
		await dbclient.connect();
	}
	catch(err)
	{
		errorLogger("Issue with the database %s", oConfig["database"].host);
		process.exit(1);
	}


	await startIt();
	info("done");
	process.exit(0);
}


async function loadDataFromDate(oDateToLoad)
{
	//&startDateTime=2019-07-01T00%3A00%3A00&endDateTime=2019-07-02T00%3A00%3A00
	var dTomorrow = new Date();
	//dTomorrow.setTime(oDateToLoad.getTime() + (MILLISPERDAY));
    dTomorrow.setTime(oDateToLoad.getTime() +( MILLISPERDAY + ((dTomorrow.getHours()%2==1) ?1 :0 )*MILLISPERDAY   ));   //every other hour, pull 2 days worth
	var sLoadURL = weatherURL 
		+ "&key=" + oConfig["weather_key"]
		+ "&locations=" + oConfig["locations"]
		+ "&startDateTime=" + getDateToTSString(oDateToLoad)
		+ "&endDateTime=" + getDateToTSString(dTomorrow)

	debug(sLoadURL);
	axios.get(sLoadURL).then((response) => {
		var weatherVCData = response.data;
		doTempUpdates(weatherVCData);
	}, 
	(error) => 
	{
		handleFail(sLoadURL);
	});
}

function handleFail(sLoadURL)
{
	//TODO
	errorLogger("unable to load the data %s", sLoadURL);
	cleanUp(false);
}

async function startIt()
{
	//getNextDateFromDB();
	//var oJSONData = readDataFromSampleFile();
	//get the date we are pulling
	var oDateToLoad = await getNextDateFromDB();
	//test for valid date
	if(oDateToLoad && oDateToLoad.getTime() > 0)
	{
		info("loading data from %s",  oDateToLoad.toLocaleString())
		loadDataFromDate(oDateToLoad);
	}
	else
	{
		info("There are no dates for which we need data");
	}
}

async function doTempUpdates(oJSONTemps)
{
	if(oJSONTemps &&  oJSONTemps.location && oJSONTemps.location.values)
	{
		var hourOfTemp =  oJSONTemps.location.values;
		debug("found the weather data %s rows", hourOfTemp.length);
		for(var x=0; x <hourOfTemp.length; x++)
		{
			var oDate = new Date(hourOfTemp[x].datetimeStr);			
			debug( oDate.toLocaleString()+ " : " + hourOfTemp[x].temp);
			var sUpdate = "update tesla.attic_temps set internet_temp=" 
				+ hourOfTemp[x].temp + " where internet_temp is null and date_trunc('hour', created_at) = date_trunc('hour', timestamp '"
				+ oDate.toLocaleString()+"')";
			debug(sUpdate);
			await dbclient.query(sUpdate);
		}
	}
	cleanUp(false);	
}

function readDataFromSampleFile()
{
	//select  *  from tesla.attic_temps where date_trunc('day', created_at) = timestamp '7/1/2019'
	var jsonString = fs.readFileSync("./sample_virtual_crossing.json").toString();
	var oWeatherData = JSON.parse(jsonString);
	debug(oWeatherData.location.values)
	return oWeatherData;
}

async function getNextDateFromDB()
{
	var oResDate = null;
	//const res = await dbclient.query('SELECT $1::text as message', ['Hello world!'])
	var sMaxValQuery = "select count(*), date_trunc('day', created_at) as next_date \
	from tesla.attic_temps	\
	where internet_temp is null	\
	group by date_trunc('day', created_at)	\
	order by count(*) desc \
	limit 1";
	debug("max val query %s", sMaxValQuery);
	var res = await dbclient.query(sMaxValQuery);
	if(res.rows.length && res.rows[0]["next_date"])
	{
		var sMaxDate = res.rows[0]["next_date"];
		debug("found a date to use from DB: %s",sMaxDate )
		oResDate = new Date(sMaxDate);
	}
	//debug("max id from table is %s", sMaxDate);
	return oResDate;
}


async function cleanUp(doRollback)
{
	if(doRollback)//rollback
	{
		dbclient.query('ROLLBACK', err => {
			if (err) 
			{
				errorLogger('Error rolling back', err.stack)
				dbclient.end();
				process.exit(5);
			}
		dbclient.end();
		info("---ROLLBACK ---- exiting cleanly");
		process.exit(1);		  
		});
	}
	else //commit
	{
		dbclient.query('COMMIT', err => {
			if (err) 
			{
			  errorLogger('Error committing transaction', err.stack)
			  dbclient.end();
			  process.exit(3);
			}
			dbclient.end();
			info("++ COMMIT ++ exiting cleanly, db connection closed");
			process.exit(0);
		  });
	}
}

main().catch(console.error);

function isNullOrUndefined(oObj)
{
	return !((oObj && true) || oObj == 0)
}


function getDateToTSString(a_oDate)
{
	//YYYY-MM-DD
	if(!a_oDate)
	{
		a_oDate = new Date();
	}
	var sMonth = (a_oDate.getMonth() + 1);
	sMonth = (sMonth < 10)? ("0"+sMonth) : (sMonth + "");
	var sDate = a_oDate.getDate()
	return (a_oDate.getFullYear()+0) + "-" + sMonth + "-" + sDate
}

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

