#!/bin/env node

var fs      = require('fs');

//http://www.nicetimeonice.com/api
exports.teams = [{"name":"Anaheim Ducks","teamID":"ANA"},
{"name":"Arizona Coyotes","teamID":"ARI"},
{"name":"Boston Bruins","teamID":"BOS"},
{"name":"Buffalo Sabres","teamID":"BUF"},
{"name":"Calgary Flames","teamID":"CGY"},
{"name":"Carolina Hurricanes","teamID":"CAR"},
{"name":"Chicago Blackhawks","teamID":"CHI"},
{"name":"Colorado Avalanche","teamID":"COL"},
{"name":"Columbus Blue Jackets","teamID":"CBJ"},
{"name":"Dallas Stars","teamID":"DAL"},
{"name":"Detroit Red Wings","teamID":"DET"},
{"name":"Edmonton Oilers","teamID":"EDM"},
{"name":"Florida Panthers","teamID":"FLA"},
{"name":"Los Angeles Kings","teamID":"LAK"},
{"name":"Minnesota Wild","teamID":"MIN"},
{"name":"Montreal Canadiens","teamID":"MTL"},
{"name":"Nashville Predators","teamID":"NSH"},
{"name":"New Jersey Devils","teamID":"NJD"},
{"name":"New York Islanders","teamID":"NYI"},
{"name":"New York Rangers","teamID":"NYR"},
{"name":"Ottawa Senators","teamID":"OTT"},
{"name":"Philadelphia Flyers","teamID":"PHI"},
{"name":"Pittsburgh Penguins","teamID":"PIT"},
{"name":"San Jose Sharks","teamID":"SJS"},
{"name":"St. Louis Blues","teamID":"STL"},
{"name":"Tampa Bay Lightning","teamID":"TBL"},
{"name":"Toronto Maple Leafs","teamID":"TOR"},
{"name":"Vancouver Canucks","teamID":"VAN"},
{"name":"Washington Capitals","teamID":"WSH"},
{"name":"Winnipeg Jets","teamID":"WPG"}];

exports.timezones = [
{"value":"America/New_York","name":"New York"},
{"value":"America/Chicago","name":"Chicago"},
{"value":"America/Indiana/Indianapolis","name":"Indiana - Indianapolis"},
{"value":"America/Denver","name":"Denver"},
{"value":"America/Los_Angeles","name":"Los Angeles"}
]





exports.loadConfig = () =>
{
	/* SAMPLE FILE
		see header 
	*/
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var oJSON =  {};
	try 
	{
		var jsonString = fs.readFileSync("./nhl_config.json").toString();
		oJSON = JSON.parse(jsonString);
	} 
	catch (err) 
	{
		oJSON = ConfigJSON;
		console.warn("The file 'nhl_config.json' does not exist or contains invalid arguments!");
		console.warn("Going with the best team, instead: " + ConfigJSON.myteam);
		//process.exit(1);
	}
	return oJSON;
}
