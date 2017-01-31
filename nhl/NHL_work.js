#!/usr/bin/env node

/*
NOTES:
Potential display ideas (* = mandatory)
	current/latest score
	standings
	latest action
	time and date
	game time
	
sound and light
	end of game, play the winner's buzzer (mp3 files), and spin light
	upon goal for my team, play the buzzer
	
challenges
	when a game isnt listed on the game list
	end of season
	
Architecture
	cron on bootup (since will have date and time) - will run full time
	have loop, with 1 minute sleep, and refresh the lcd each 1 minute

	initializeTheGamesList
	Loop each Minute
	{
		if: beforegame, show date, time and previous score/standings
		if: duringgame: show time, GAME time, score
		if: aftergame: figure out when next game is
		if: after season? wait until september?
	}

useful URLs - details:
 http://hfboards.hockeysfuture.com/showthread.php?t=1596119
 http://whatsyourtech.ca/2013/06/14/we-scored-app-roars-when-your-nhl-team-scores/

Sound files
	http://wejustscored.com/audio/wsh.mp3
	http://wejustscored.com/audio/<TEAM>.mp3
data feeds:
http://live.nhl.com/GameData/GCScoreboard/2017-01-26.jsonp


 http://live.nhl.com/GameData/GCScoreboard/yyyy-mm-dd.jsonp	

 UNsorted
	http://app.cgy.nhl.yinzcam.com/V2/Stats/Standings
	http://hfboards.hockeysfuture.com/showthread.php?t=1596119
	http://live.nhl.com/GameData/GCScoreboard/2017-01-26.jsonp
	http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
	http://live.nhl.com/GameData/20162017/2016020733/gc/gcbx.jsonp
	https://www.google.com/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#q=nhl+live+game+json
 
 
 */


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
var REFRESHTIME = 60000;	//1 minute
var oLCDData = {lastactiondesc: "", date: (new Date()), standings: "0-0", teamname:"Washington Capitals", score:" WSH: 3 vs LOS: 1"};
var oLatestGame = {};
var fTesting = true;
var aoMyTeamGames = [];
var nNextGame = 0;
var nCurrentGame = 0;
//MAIN
main();

function main()
{
	//init data
	ConfigJSON = loadConfig();
	//load the games
	loadURLasJSON(getNHLSeasonURL(), initializeTheGamesList);
}

function initializeTheGamesList(aoGames)
{
	//https://www.reddit.com/r/nhl/comments/2i13xa/places_to_get_raw_statistics/
	//http://live.nhl.com/GameData/SeasonSchedule-20162017.json
	console.log("loaded all the games: " + aoGames.length);
	var sMyTeam = ConfigJSON.myteam;
	aoMyTeamGames = aoGames.filter(function(game){return game.a===sMyTeam || game.h === sMyTeam});
	console.log("filtered just the " + sMyTeam + " games: " + aoMyTeamGames.length);

	printSchedule();
	//getAudioFiles();
	//kick things off!
	//updateDisplayEachMinute();

}


function updateDisplayEachMinute()
{
	var currentGameState = getCurrentGameState();
	var dToday = new Date();
	if(getCurrentGameState.BEFOREGAME === currentGameState)
	{
		//before game, just show the standings, and score from previous game
	
	}
	else if(getCurrentGameState.INGAME === currentGameState)
	{
		//load details
	}
	else if(getCurrentGameState.AFTERGAME === currentGameState)
	{
		//after game, so hold onto the last values until another game starts
		//figure out when the next game will be
		//TODO, break if you cannot find an upcoming game!  could be end of season?
	}
	console.log(dToday.toString() + " currentgame state: " + currentGameState);
	setTimeout(updateDisplayEachMinute, REFRESHTIME);
}

getCurrentGameState.INGAME = 1;
getCurrentGameState.BEFOREGAME = 2;
getCurrentGameState.AFTERGAME = 3;
function getCurrentGameState()
{
	var dToday = new Date();
	for(var x=0; x < aoMyTeamGames.length; x++)
	{
		var dGameDate = parseDateStr(aoMyTeamGames[x].est);
		//console.log(aoMyTeamGames[x].est);
		console.log((dGameDate < dToday ? "PAST" : "future") +  dGameDate.toString() + " " + aoMyTeamGames[x].a + " vs. " + aoMyTeamGames[x].h);
	}
}

function gameDetailsURL(sGameID)
{
	//http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
	return "http://live.nhl.com/GameData/"+NHLSeason()+"/"+sGameID+"/PlayByPlay.json";
}

function getDetailsFromLastGame()
{	
	var dToday = new Date();
	var x=0;
	for(; x < aoMyTeamGames.length && parseDateStr(aoMyTeamGames[x].est) < dToday; x++)
	{
		//nothing
	}
	x--; //back up to the previous game
	//console.log(x + " ?? " + aoMyTeamGames.length)
	var sGameID = aoMyTeamGames[x].id;
	console.log("most recent game is: " + sGameID);
	var sGameURL = gameDetailsURL(sGameID);
	console.log("loading details from recent game: " + sGameURL);
	//http://live.nhl.com/GameData/20162017/2016020741/PlayByPlay.json
	loadURLasJSON(sGameURL, populateLastGame);
}

function populateLastGame(a_oLastGame)
{
	pr(a_oLastGame);
	oLatestGame = a_oLastGame;
	//pr(a_oLastGame.data.game.plays);
	sleepAndRefresh();
}

function sleepAndRefresh()
{
	refreshLCD();
	//console.log("WWWWWW");
	setTimeout(sleepAndRefresh, REFRESHTIME);
}

function refreshLCD()
{
	//loadRecentGame();
	//set time
	oLCDData.date = new Date();
	//draw LCD
	drawLCD();
}

function drawLCD()
{
	//time date
	// current/last score
	//last event
	//current standings
	//var oLCDData = {lastactiondesc: "", date: (new date()), standings: "0-0", teamname:"Washington Capitals", score:" WSH: 3 vs LOS: 1"};
	console.log("...............");
	pr(oLCDData);
}

function loadRecentGame()
{
	var nCurrentTime = (new Date()).getTime();
	//game is either in progress, or show previous game stats
	if(nNextGame < nCurrentTime)	//the next game is in the past, so figure out when the next game is
	{
		nNextGame = timeOfNextGame();
		loadURLasJSON(sURL, drawLCD);	
	}
	else	//load pre
	{
		
	}
}

function timeOfNextGame()
{
	var nTimeOfNextGame = 0;
	
	for(var x=0; x < aoMyTeamGames.length; x++)
	{
		
	}
	return nTimeOfNextGame;
}


function fGameIsToday(dDateNow, dDateGame)
{
	//console.log(dDateGame.toString() + " > " + dDateNow.getYear() + "="+  dDateGame.getYear()  + "  &"+ dDateNow.getMonth()  + "="+ dDateGame.getMonth()  + " & "+  dDateNow.getDate() + 
	//"="+ dDateGame.getDate())
	
	return dDateNow.getYear() === dDateGame.getYear() && dDateNow.getMonth() === dDateGame.getMonth() && dDateNow.getDate() === dDateGame.getDate();
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


//// NHL specific functions


function printSchedule()
{		
	var dToday = new Date();
	for(var x=0; x < aoMyTeamGames.length; x++)
	{
		var dGameDate = parseDateStr(aoMyTeamGames[x].est);
		//console.log(aoMyTeamGames[x].est);
		console.log((dGameDate < dToday ? "PAST" : "future") +  dGameDate.toString() + " " + aoMyTeamGames[x].a + " vs. " + aoMyTeamGames[x].h);
	}
}

function getAudioFiles()
{
	var oTeams = {};
	return //no need to grab these again
	for(var x=0; x < aoMyTeamGames.length; x++)
	{
		oTeams[aoMyTeamGames[x].a] = true;
		//console.log((dGameDate < dToday ? "PAST" : "future") +  dGameDate.toString() + " " + aoMyTeamGames[x].a + " vs. " + aoMyTeamGames[x].h);
	}

	var exec = require('child_process').exec;
	for(var t in oTeams)
	{
		var mp3URL = "http://wejustscored.com/audio/"+(t+"").toLowerCase() +".mp3"
		console.log(mp3URL);
		var cmd = "wget " + mp3URL;
		exec(cmd, function(error, stdout, stderr) { console.log("downloaded...." + cmd)});
	}
}

getNHLSeasonString.THISSEASON = null;
function getNHLSeasonString()
{
	//TODO: handle when the "previous" game is from last season
	if(getNHLSeasonString.THISSEASON == null)
	{
		var dToday = new Date();
		var sYear1 = 1900 + (dToday.getMonth() < 9 ? (dToday.getYear()-1)  : (dToday.getYear())); 
		var sYear2 = 1900 + (dToday.getMonth() < 9 ? (dToday.getYear()) : (dToday.getYear()+1));
		getNHLSeasonString.THISSEASON = sYear1 +""+ sYear2;
		//console.log("UGGHH" + getNHLSeasonString.THISSEASON)
	}
	return getNHLSeasonString.THISSEASON;
}

function getNHLSeasonURL()
{
	var sYears =  getNHLSeasonString();
	return "http://live.nhl.com/GameData/SeasonSchedule-"+sYears+".json"	
}


////////////HELPER FUNCTIONS //////////////////

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


// Generic callback function to print the return value
function pr( jsonVals ) {
	console.log( util.inspect( jsonVals ) );
	//writeValuesToThingSpeak(jsonVals)
}

function loadURLasJSON(sURL, funcCallback)
{
	http.get(sURL, function(res){
		var body = '';

		res.on('data', function(chunk){
			body += chunk;
		});

		res.on('end', function()
		{
			var oObj = {};
			try
			{
				oObj = JSON.parse(body);				
			}
			catch(e) {console.log("Something unexpected with the response from " + sURL);}
			//console.log("Got a response: ");
			funcCallback(oObj);
		});
	}).on('error', function(e){
		  console.log("Got an error: ", e);
	});
}

function loadConfig()
{
	/* SAMPLE FILE
	{
		"myteam": "WSH"
	}
	*/
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


////////////////  JUNK  ////////////////////
function validField(oObj, sField, sFieldName)
{
	if(!util.isNullOrUndefined(oObj) && !util.isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + oObj[sField];
	}
	return "";
}
function WHATEVER()
{		
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
	return oOutputData();
}

/*
NOTES: 
  
*/

