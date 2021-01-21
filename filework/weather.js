#!/usr/bin/env node
const csv = require('csv-parser');
const fs = require('fs');
//https://weather-ydn-yql.media.yahoo.com/forecastrss?location=sunnyvale,ca&format=json

// Require node-oauth package: npm install oauth
// Copyright 2019 Oath Inc. Licensed under the terms of the zLib license see https://opensource.org/licenses/Zlib for terms.

//12766846
var OAuth = require('oauth');

const JSONFILE = "./yahoo_oauth.json"
var jsonConfig = loadConfig(JSONFILE);
//var util = require('util');
main();

function main()
{
	var header = {	"X-Yahoo-App-Id": jsonConfig.app_id	};
	var request = new OAuth.OAuth(
		null,
		null,
		jsonConfig.client_id,
		jsonConfig.client_secret,
		'1.0',
		null,
		'HMAC-SHA1',
		null,
		header
	);
	request.get(
		'https://weather-ydn-yql.media.yahoo.com/forecastrss?woeid=12766846&format=json',
		null,
		null,
		function (err, data, result) {
			if (err) {
				console.log(err);
			} else 
			{
				weatherJSON = JSON.parse(data);
				console.log(weatherJSON);
				console.log(weatherJSON.current_observation);
				console.log(weatherJSON.current_observation.condition);
				console.log(weatherJSON.current_observation.condition.temperature);
				//console.log(data.current_observation.condition.temperature);
			}
		}
	);
} //main


/*
{"location":{"city":"Vienna","region":" VA","woeid":12766846,"country":"United States","lat":38.936352,"long":-77.27449,"timezone_id":"America/New_York"},"current_observation":{"wind":{"chill":86,"direction":150,"speed":6.84},"atmosphere":{"humidity":51,"visibility":10.0,"pressure":29.53,"rising":0},
"astronomy":{"sunrise":"6:08 am","sunset":"8:23 pm"},
"condition":{"text":"Sunny","code":32,"temperature":86},
"pubDate":1596067200},"forecasts":[{"day":"Wed","date":1595995200,"low":72,"high":92,"text":"Sunny","code":32},{"day":"Thu","date":1596081600,"low":73,"high":94,"text":"Thunderstorms","code":4},{"day":"Fri","date":1596168000,"low":73,"high":82,"text":"Thunderstorms","code":4},{"day":"Sat","date":1596254400,"low":72,"high":83,"text":"Thunderstorms","code":4},{"day":"Sun","date":1596340800,"low":74,"high":88,"text":"Thunderstorms","code":4},{"day":"Mon","date":1596427200,"low":74,"high":83,"text":"Thunderstorms","code":4},{"day":"Tue","date":1596513600,"low":72,"high":84,"text":"Thunderstorms","code":4},{"day":"Wed","date":1596600000,"low":71,"high":84,"text":"Thunderstorms","code":4},{"day":"Thu","date":1596686400,"low":70,"high":85,"text":"Partly Cloudy","code":30},{"day":"Fri","date":1596772800,"low":69,"high":83,"text":"Scattered Thunderstorms","code":47}]}
*/


function loadConfig(sFileLoc)
{

	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var config = {};
	var fs = require('fs');
	try {
		var jsonString = fs.readFileSync(sFileLoc).toString();
		config = JSON.parse(jsonString);
	} catch (err) {
		console.warn("The file '"+sFileLoc+"' does not exist or contains invalid arguments! Exiting...");
		console.warn(err)
		process.exit(1);
	}
	return config;//listFilesToMove();	
}