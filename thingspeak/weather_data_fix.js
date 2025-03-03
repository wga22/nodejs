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
//const { start } = require('repl');

//CONSTS
const debug = debuggerObj('debug:*');
const info = debuggerObj('info:*');	//always show info
const errorLogger = debuggerObj('error:*');	//always show errors
const configFile = "./weather_data_config.json";

const weatherURL = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/weatherdata/history?aggregateHours=1&combinationMethod=aggregate&maxStations=1&maxDistance=-1&contentType=json&unitGroup=us&locationMode=single&dataElements=default&dayEndTime=23%3A0%3A0";
const MILLISPERDAY = 24*3600000;
const MAXDAYS = 2;
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
		dbclient = new Client(oConfig["database"]);
		await dbclient.connect();
		for(var x=0; x < MAXDAYS; x++)
		{
//			await startIt();
		}
	} 
	catch (err) 
	{
            console.log("MAIN error: " + err)

		errorLogger("The file '%s' does not exist or contains invalid arguments! Exiting...", configFile);
		process.exit(1);
	}
	await startIt();
    
    if (dbclient) {
        await dbclient.end();
        debug("Database connection closed");
    }    
    
    
    debug("end main");
}


async function loadDataFromDate(oDateToLoad)
{
	//&startDateTime=2019-07-01T00%3A00%3A00&endDateTime=2019-07-02T00%3A00%3A00
	var dTomorrow = new Date();
	dTomorrow.setTime(oDateToLoad.getTime() +( MILLISPERDAY + ((dTomorrow.getHours()%2==1) ?1 :0 )*MILLISPERDAY   ));
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
    debug("found a date");
	if(oDateToLoad && oDateToLoad instanceof Date && oDateToLoad.getTime() > 0)
	{
        debug("found a 22");
		info("loading data from %s",  oDateToLoad.toLocaleString())
		loadDataFromDate(oDateToLoad);
	}
	else
	{
        debug("found a 33");
		info("There are no dates for which we need data");
	}
    debug("exit startid");
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