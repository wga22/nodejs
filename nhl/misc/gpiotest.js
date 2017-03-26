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
var lame = require('lame');
var fs = require('fs');
var Speaker = require('speaker');
var ConfigJSON = {myteam: "WSH"};
var MILLISPERMINUTE = 60000;	//1 minute
var MILLISPERHOUR = MILLISPERMINUTE * 60;
//var oLCDData = {lastactiondesc: "", date: (new Date()), standings: "0-0", teamname:"Washington Capitals", score:" WSH: 3 vs LOS: 1"};
var fTesting = true;
var oGameData = {};
var fOn = false;
//MAIN
main();

function main()
{
//	playHorn(ConfigJSON.myteam)
	gpiotest();
}

function gpiotest()
{
   var Gpio = require('onoff').Gpio
   lights = new Gpio(17, 'out')
   lights.writeSync((fOn ? 1 : 0));
   fOn = !fOn
   setTimeout(gpiotest, 3000);
}


function playHorn(sTeam)
{
	console.log("\007");
	sTeam = sTeam.toLowerCase();
	fs.createReadStream("./horns/"+sTeam+".mp3")
		.pipe(new lame.Decoder())
		.on('format', function (format) {
	try {
		this.pipe(new Speaker(format));
	} catch (e) {
		console.log("asdfas");
		console.log(e.message);
		return false;
	}
	});
  
  
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

function pad2(nMin)
{
	return nMin < 10 ? ("0" +nMin) : nMin 
}
function get12Hour(nHour)
{
	nTime  =  nHour % 12
	return (nTime == 0) ? 12 : nTime;
}

function smallDate(dDate)
{
	if(dDate){} else {dDate = new Date()};		
	//return (1+dDate.getMonth()) + "/"+dDate.getDate()  + "/"+(1900+dDate.getYear())  + " " + get12Hour(dDate.getHours()) + ":" + pad2(dDate.getMinutes());
	return dDate.toLocaleDateString() +" " +  (dDate.toLocaleTimeString()).replace(/\W\d\d /, " ");	//remove the seconds
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



/*
-------------OUTPUTS:--------------------
 

{ data:
   { refreshInterval: 0,
     game:
      { awayteamid: 6,
        awayteamname: 'Boston Bruins',
        hometeamname: 'Washington Capitals',
        plays: [Object],
        awayteamnick: 'Bruins',
        hometeamnick: 'Capitals',
        hometeamid: 15 } } }

----------------UNUSED FUNCTIONS-----------------		


function waitForGame(sGameID)
{
	//http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
	//http://live.nhl.com/GameData/20162017/2016020733/gc/gcbx.jsonp
	//var sURL = "http://live.nhl.com/GameData/"+NHLSeason()+"/"+sGameID+"/gc/gcbx.jsonp";
	var sURL =  "http://live.nhl.com/GameData/"+getNHLSeasonString()+"/"+sGameID+"/PlayByPlay.json";
	loadURLasJSON(sURL, checkOutTheGame);
}


function checkOutTheGame(oGameStats)
{
	var aPlays = oGameStats.data.game.plays.play;
	var aGoals = aPlays.filter(function(item){return item.type === "Goal"});
	for(var x in aGoals)
	{
		pr(aGoals[x]);
	}
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


	function _waitForData(oElement)
	{
		if(oElement.retries++ < GameResults.MAXWAITFORGAMEDATA)
		{
			if(oElement.gameStats == null)
			{
				console.log("Waiting for the data....");
				setTimeout(_waitForData, 1000, oElement);
			}
			else
			{
				console.log("HERE" + oElement.gameStart);
				//this._displayResults();
			}
		}
		else
		{
			console.log("retries: " + oElement.retries);
		}
	}
  
*/

