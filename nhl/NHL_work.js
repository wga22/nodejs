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
var ConfigJSON = {myteam: "WSH"};

var THISSEASON = null;
//MAIN
main();

function main()
{
	//load config
	ConfigJSON = loadConfig();
	//load the games
	loadURLasJSON(NHLurl(), loadGames);
	//
}

function NHLurl()
{
	var sYears =  NHLSeason();
	return "http://live.nhl.com/GameData/SeasonSchedule-"+sYears+".json"	
}

function fGameIsToday(dDateNow, dDateGame)
{
	//console.log(dDateGame.toString() + " > " + dDateNow.getYear() + "="+  dDateGame.getYear()  + "  &"+ dDateNow.getMonth()  + "="+ dDateGame.getMonth()  + " & "+  dDateNow.getDate() + 
	//"="+ dDateGame.getDate())
	return dDateNow.getYear() === dDateGame.getYear() && dDateNow.getMonth() === dDateGame.getMonth() && dDateNow.getDate() === dDateGame.getDate();
}

function loadGames(aoGames)
{
//https://www.reddit.com/r/nhl/comments/2i13xa/places_to_get_raw_statistics/
	//http://live.nhl.com/GameData/SeasonSchedule-20162017.json
	
	var sMyTeam = ConfigJSON.myteam;
	var aoMyTeamGames = aoGames.filter(function(game){return game.a===sMyTeam || game.h === sMyTeam})
	var dToday = new Date();
	for(var x=0; x < aoMyTeamGames.length; x++)
	{
		var dGameDate = parseDateStr(aoMyTeamGames[x].est);
		//console.log(aoMyTeamGames[x].est);
		if(fGameIsToday(dToday, dGameDate))
		{
			//http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
			// http://live.nhl.com/GameData/20162017/2016020733/gc/gcbx.jsonp
			console.log(dGameDate.toString() + " " + aoMyTeamGames[x].a + " vs. " + aoMyTeamGames[x].h);
			//console.log(aoMyTeamGames[x].id);
			waitForGame(aoMyTeamGames[x].id);
			return;
		}
		else
		{
			//console.log(dGameDate.toString() + " " + aoMyTeamGames[x].a + " vs. " + aoMyTeamGames[x].h);
		}
	}
	//console.log("fields: " + aoGames.length);
}

function waitForGame(sGameID)
{
	//http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
	//http://live.nhl.com/GameData/20162017/2016020733/gc/gcbx.jsonp
	//var sURL = "http://live.nhl.com/GameData/"+NHLSeason()+"/"+sGameID+"/gc/gcbx.jsonp";
	var sURL =  "http://live.nhl.com/GameData/"+NHLSeason()+"/"+sGameID+"/PlayByPlay.json";
	loadURLasJSON(sURL, checkOutTheGame);
}

/*
{"aoi":
[8470880,8473564,8474150,8476462],"sweater":"44","hs":2,"desc":"Jean-Gabriel Pageau Wrist Shot saved by Brian Elliott","formalEventId":"OTT811","type":"Shot","eventid":811,"hsog":24,"asog":23,"apb":
[],"p2name":"Brian Elliott","time":"03:22","localtime":"10:11 PM","teamid":9,"xcoord":-71,"strength":701,"as":2,"pid":8476419,"period":4,"p3name":"","hpb":
[],"pid3":"","ycoord":1,"playername":"Jean-Gabriel Pageau","hoi":
[8475913,8476419,8476879,8477237],"p1name":"Jean-Gabriel Pageau","pid2":8470880,"pid1":8476419},

	for(var item in oPlays)
	{
		//if(oPlays[item].type === "Goal")
		{
			aPlays.push(oPlays[item]);
			console.log("ff" + oPlays[item].type)			
		}
	}


*/

function checkOutTheGame(oGameStats)
{
	var aPlays = oGameStats.data.game.plays.play;
	var aGoals = aPlays.filter(function(item){return item.type === "Goal"});
	for(var x in aGoals)
	{
		pr(aGoals[x]);
	}
}


function parseDateStr(a_sDate)
{
	//20170318 19:00:00
	var dDate = new Date();
	//console.log(a_sDate);
	var nYear = parseInt(a_sDate.substr(0,4));
	var nMon = parseInt(a_sDate.substr(4,2))-1;
	var nDay = parseInt(a_sDate.substr(6,2));
	var nHour = parseInt(a_sDate.substr(9,2));
	var nMin = parseInt(a_sDate.substr(12,2));
	dDate.setYear(nYear);
	dDate.setMonth(nMon);
	dDate.setDate(nDay);
	dDate.setHours(nHour);
	dDate.setMinutes(nMin);
	return dDate;
}

function NHLSeason()
{
	if(THISSEASON === null)
	{
		var dToday = new Date();
		var sYear1 = 1900 + (dToday.getMonth() < 7 ? (dToday.getYear()-1)  : (dToday.getYear())); 
		var sYear2 = 1900 + (dToday.getMonth() < 7 ? (dToday.getYear()) : (dToday.getYear()+1));
		THISSEASON = sYear1 +""+ sYear2;
	}
	return THISSEASON;
}


function loadConfig()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	var oJSON =  {};
	try {
			var jsonString = fs.readFileSync("./config.json").toString();
			oJSON = JSON.parse(jsonString);
		} catch (err) {
			console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
			process.exit(1);
	}
	return oJSON;
}


// Generic callback function to print the return value
function pr( jsonVals ) {
	console.log( util.inspect( jsonVals ) );
	//writeValuesToThingSpeak(jsonVals)
}



function validField(oObj, sField, sFieldName)
{
	if(!util.isNullOrUndefined(oObj) && !util.isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + oObj[sField];
	}
	return "";
}

function loadURLasJSON(sURL, funcCallback)
{
	http.get(sURL, function(res){
		var body = '';

		res.on('data', function(chunk){
			body += chunk;
		});

		res.on('end', function(){
			var oObj = JSON.parse(body);
			console.log("Got a response: ");
			funcCallback(oObj);
		});
	}).on('error', function(e){
		  console.log("Got an error: ", e);
	});
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

