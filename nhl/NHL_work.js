#!/usr/bin/env node

/*
NOTES:

CONFIG values
{
	"myteam": {"WSH","CAR",etc}
	"debug":
		"1"  //debugging enabled
		"0"	//debugging disabled
	"output":  //what device to use
		"console"
		"lcd"
		"oled"
	"light":
		{"type":"alarm,multi-led,none", "gpio":["9", "8", "7"] }
}
 


DISPLAY features
	current/latest score
	standings
	latest action
	time and date
	game time
	
sound and light

	
challenges
	playoffs?
	resetting process if it goes down
	turning off amp/speaker when not in use?
		test using gpio was not succcessful on opizero
	
Architecture
	

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

//requires
var lame = require('lame');
var fs = require('fs');
var Speaker = require('speaker');
var util = require('util');
var http = require('http');

//vars
var ConfigJSON = {myteam: "WSH"};
var MILLISPERMINUTE = 60000;	//1 minute
var MILLISPERHOUR = MILLISPERMINUTE * 60;
var MILLISPERDAY = MILLISPERHOUR*24;
var ARTIFACT_DIR = "./horns/";
//var oLCDData = {lastactiondesc: "", date: (new Date()), standings: "0-0", teamname:"Washington Capitals", score:" WSH: 3 vs LOS: 1"};
var fTesting = true;
var aoMyTeamGames = [];
var oPrevGameResults = {};
var oCurrentGames = {};

//MAIN
main();

function main()
{
	//init data
	ConfigJSON = loadConfig();
	fTesting = (ConfigJSON.debug == "1" || ConfigJSON.debug == "true");
	//make sure light is off to start
	if(fUsingALight())
	{
		setTimeout(turnLight, 100, false);
	}
	//load the games
	loadURLasJSON(getNHLSeasonURL(), initializeTheGamesList);	
	setInterval(updateDisplayEachMinute, MILLISPERMINUTE);
	setInterval(dailyCheckForUpdatesToGameList, MILLISPERDAY);
}

function dailyCheckForUpdatesToGameList()
{
	//runs a check, if right time of year, to see if game list should be updated
	//should only run daily, or something like that
	//TODO TEST: test for time of year
	debugOut("dailyCheckForUpdatesToGameList");
	
	//only need to consider loading a new list, if there is nothing scheduled upcoming
	if(oCurrentGames.nextGame==null)
	{
		var dToday = new Date();
		var nMonth = dToday.getMonth();
		
		//TODO: maybe get smart and not reload the list if playoffs are over for this team
		//0=Jan
		var fDuringPlayoffs = (nMonth===3 || nMonth===4 || nMonth===5  )
		var fPreSeason = (nMonth===8)
		
		debugOut("dailyCheck:" + (fDuringPlayoffs ? "playofftime" : "not pt") + " ::: " + (fPreSeason ? "preseason" : "not preseason"));
		if(fDuringPlayoffs || fPreSeason)
		{
			loadURLasJSON(getNHLSeasonURL(), initializeTheGamesList);
		}	
	}
}

function initializeTheGamesList(aoGames)
{
	//https://www.reddit.com/r/nhl/comments/2i13xa/places_to_get_raw_statistics/
	//http://live.nhl.com/GameData/SeasonSchedule-20162017.json
	debugOut("loaded all the games: " + aoGames.length);
	var sMyTeam = ConfigJSON.myteam;
	aoMyTeamGames = aoGames.filter(function(game){return game.a===sMyTeam || game.h === sMyTeam});
	debugOut("filtered just the " + sMyTeam + " games: " + aoMyTeamGames.length);
	oCurrentGames = getPreviousAndNextGames();
	oPrevGameResults = new GameResults(oCurrentGames.previousGame);
}

function updateDisplayEachMinute()
{
	var dToday = new Date();
	
	//if the "next game" is in the past, then time to shift current and next games!
	//consider possibility that next game isnt scheduled yet, so use the dailyCheckForUpdatesToGameList to update the list
	if( oCurrentGames && oCurrentGames.nextGame && oCurrentGames.nextGame.gameTime <= dToday )
	{
		debugOut("time to move on to a new game");

		//game just started, so play the horn
		//TODO TEST more (couldnt tell from logs: fix that this seems to play 2x?
		playMp3(ARTIFACT_DIR + "gamestart.mp3");
		
		//update the values for the previous game
		oCurrentGames = getPreviousAndNextGames();
		oPrevGameResults = new GameResults(oCurrentGames.previousGame);
	}
	//debugOut("new game? " + oCurrentGames.nextGame.gameTime + " <= " + dToday.getTime());
	oPrevGameResults.showResults(dToday);
}

function fUsingALight()
{
	return ConfigJSON.light && ConfigJSON.light != "none";
}

function Team(sCode, a_isFav)
{
	this.code = sCode;
	this.nickname = "";
	this.id = null;
	this.favorite = a_isFav;
}
Team.prototype.isFavorite = function()
{
	return this.favorite;
}

function GameResults(a_oPrevGameInfo)
 {
	//instance variables
	this.oPrevGameInfo = a_oPrevGameInfo;
	this.lastGoalScoredEventID = '';
	this.homeScore=null;
	this.awayScore=null;
	this.latestEvent = null;
	this.actionCount = {nCount:0, sLatestEventID:""};
	
	//we only know the code at this point, dont know the id
	this.homeTeam = new Team(this.oPrevGameInfo.h, (this.oPrevGameInfo.h == ConfigJSON.myteam));
	this.awayTeam = new Team(this.oPrevGameInfo.a, (this.oPrevGameInfo.a == ConfigJSON.myteam));
	this.gameStart = this.oPrevGameInfo.gameTime;
	this.gameStop = new Date(this.oPrevGameInfo.gameTime.getTime() + (GameResults.MAXGAMEDURATION*MILLISPERHOUR));
	this.gameStats = null;
	this.displayResults = displayResults;
	
	//TODO: convert this to a single function, only run the case statement 1x - "pointer"
	function displayResults(dDate)
	{
		switch(ConfigJSON.output)
		{
			case("LCD_I2C"):
			case("LCD2004"):
			this.LCD_2004_I2C(dDate);
			break;
			case("oled"):
			case("SSD1306"):
			this.SSD1306(dDate);
			break;
			case("console"):
			default:
			this.writeResultsToConsole(dDate)
		}
	}	
}
GameResults.MAXGAMEDURATION = 6;
GameResults.MAXWAITFORGAMEDATA = 100;
GameResults.MAXRETRYEVENT = 4;

GameResults.LCD = null;
GameResults.prototype.LCD_2004_I2C = function(dDate)
{
	if(GameResults.LCD==null)
	{
		GameResults.LCD = require('lcdi2c');
	}
	var lcd = new GameResults.LCD( 1, 0x27, 20, 4 );
	var aRes = this.genericResults(dDate);
	lcd.clear();
	for(var x=0; x < aRes.length; x++)
	{
		lcd.println(aRes[x] , (x+1));
	}
}

GameResults.prototype.genericResults = function(dDate)
{
	var aRes = [];
	aRes.push(this.awayTeam.nickname + "(" + this.awayScore + ")");
	aRes.push( this.homeTeam.nickname + "(" + this.homeScore + ")");

	if(dDate < this.gameStop)	//during game show score
	{
		aRes.push("P:"+ this.latestEvent.period +" T:" + this.latestEvent.time);
	}
	else if(oCurrentGames.nextGame!=null)  //after game
	{
		//use x:"Today 7:00 pm", x+1:tomorrow 7:00 pm, x+(2->6):Sun-Sat, x>=7: "Oct 12"
		var sGameTime = smallDate(oCurrentGames.nextGame.gameTime);
		var nMSGameDate = Math.floor((new Date(oCurrentGames.nextGame.gameTime.getYear(), oCurrentGames.nextGame.gameTime.getMonth(), oCurrentGames.nextGame.gameTime.getDate()).getTime())/MILLISPERDAY);
		var nMSToday = Math.floor((new Date(dDate.getYear(), dDate.getMonth(), dDate.getDate()).getTime())/MILLISPERDAY);
		var nDiffDays = nMSGameDate-nMSToday;
		debugOut("genRes: days" + (nMSGameDate) + " =? " + (nMSToday) + " diff:" + nDiffDays)
		if(nDiffDays == 0)
		{
			sGameTime = "Today " + getTimeOfDay(oCurrentGames.nextGame.gameTime);
		}
		else if ( nDiffDays <= 1)
		{
			sGameTime = "Tomorrow " + getTimeOfDay(oCurrentGames.nextGame.gameTime);
		}
		else if( nDiffDays>=2 && nDiffDays <=7 )
		{
			sGameTime =  getDayOfWeek(oCurrentGames.nextGame.gameTime) +" " + getTimeOfDay(oCurrentGames.nextGame.gameTime);
		}
	
		aRes.push("Next:" + sGameTime);
	}
	aRes.push(smallDate(dDate));
	return aRes;
}

GameResults.SSD1306_LCD = {lcd:null, height:64, width:128, rowHeight:12, address: 0x3C, font:null, nRowHeight:10};
GameResults.prototype.SSD1306 = function (dDate)
{
	var aRes = this.genericResults(dDate);
	try
	{
		if(GameResults.SSD1306_LCD.lcd==null)
		{
			//var lcdOpts = {  width: 128, height: 64, address: 0x3C};
			var i2cBus = require('i2c-bus').openSync(0);
			var OLEDI2CBUS = require('oled-i2c-bus');
			GameResults.SSD1306_LCD.lcd = new OLEDI2CBUS(i2cBus, GameResults.SSD1306_LCD);
			GameResults.SSD1306_LCD.lcd.turnOnDisplay();
			GameResults.SSD1306_LCD.font = require('oled-font-5x7');
		}
		GameResults.SSD1306_LCD.lcd.clearDisplay();
		
		for(var x=0; x < aRes.length; x++)
		{
			GameResults.SSD1306_LCD.lcd.setCursor(10, ((x+1)*GameResults.SSD1306_LCD.nRowHeight));
			GameResults.SSD1306_LCD.lcd.writeString(GameResults.SSD1306_LCD.font, 1, aRes[x], 1, true);
		}
	}
	catch(e)
	{
		console.warn("SSD1306:" + e.message);
	}
}


GameResults.prototype.SSD1306_python = function (dDate)
{
	var aRes = ['oled_writer.py'];
	aRes.push(this.genericResults(dDate));

	try
	{
		var execFile = require('child_process').execFile;
		var child = execFile('python', aRes, (error, stdout, stderr) => {
		if (error)
		{
			throw error;
		}
		  console.log(stdout);
		});	
	}
	catch(e)
	{
		console.warn("SSD1306:" + e.message);
	}
}

GameResults.prototype.writeResultsToConsole = function (dDate)
{
	var aRes = this.genericResults(dDate);
	var sIndent = "\t\t\t\t";
	console.log(sIndent + "====================");	//20 is width of typical LCD
	for(var x=0; x < aRes.length; x++)
	{
		console.log(sIndent + aRes[x]);
	}
	console.log(sIndent + "====================")
}

GameResults.prototype._loadGameUpdates = function ()
{
	//http://live.nhl.com/GameData/20162017/2016020755/PlayByPlay.json
	var sURL = gameDetailsURL(this.oPrevGameInfo.id);
	if(fTesting && false) console.log("_loadGameUpdates: " + sURL)
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
		catch(e) 
		{
			console.warn("Something unexpected with the response from (" + sURL + ") :" + e.message);
			throw e;
		}
		//console.log("Got a response: ");
		var dDate = new Date();
		oPrevGameResults.setGameStats(oObj, dDate);
		oPrevGameResults.displayResults(dDate);
	});
	}).on('error', function(e){
		  console.log("Got an error: ", e);
	});
}

GameResults.prototype.setGameStats = function(oRes, dDate)
{
	this.gameStats = oRes;
	var hid = parseInt(this.gameStats.data.game.hometeamid); 
	this.homeTeam.id = hid;
	var aid = parseInt(this.gameStats.data.game.awayteamid);
	this.awayTeam.id =  aid;
	this.homeTeam.nickname = this.gameStats.data.game.hometeamnick
	this.awayTeam.nickname = this.gameStats.data.game.awayteamnick;
	
	var aPlays = this.gameStats.data.game.plays.play;
	//pr(this.gameStats.data.game.plays);
	var aGoals = aPlays.filter(function(item){return item.type === "Goal"});
	var aAwayTeamGoals = aGoals.filter(function(g){return (parseInt(g.teamid)==aid)});
	var aHomeTeamGoals = aGoals.filter(function(g){return parseInt(g.teamid)==hid});
	this.homeScore = aHomeTeamGoals.length;
	this.awayScore = aAwayTeamGoals.length;
	var oLatestGoal = {};
	this.latestEvent = {period:0, time:0}
	if(aPlays.length > 0)
	{
		this.latestEvent = aPlays[aPlays.length-1];
		//figure out if its end of game or period, by seeing if this last event has happened a few times in a row
		var nMinutes = parseInt(this.latestEvent.time+"");//.match(/(\d+)\:/)[1];
		this.latestEvent.time = reverseTime(this.latestEvent.time);
		var fGameOver = dDate > this.gameStop;	//no use for it yet?
		debugOut(nMinutes + " mins. End of period(" + this.latestEvent.period+")? " + this.actionCount.sLatestEventID + " ?= " +  this.latestEvent.formalEventId + " gameover("+fGameOver+"): " + this.gameStop);
		//is the period or game over?  no way to tell for sure, since the time is coming in of the latest event
		// if period is more than 17 minutes old, and we've seen the same last event for "GameResults.MAXRETRYEVENT" times
		if((nMinutes > 17 || this.latestEvent.period > 3) && this.actionCount.sLatestEventID == this.latestEvent.formalEventId)
		{
			//debugOut("end of period? " + this.actionCount.sLatestEventID + " ?= " +  this.latestEvent.formalEventId);
			this.actionCount.nCount++;
			if(this.actionCount.nCount >= GameResults.MAXRETRYEVENT)
			{
				//ok, definitely a stale activity at the end of the game
				debugOut("The period has likely ended.... (or game)");
				this.latestEvent.time = "End";
				if(this.latestEvent.period >= 3 && this.homeScore != this.awayScore)
				{
					var fWon = this.homeScore > this.awayScore && this.homeTeam.isFavorite();
					this.gameStop= dDate;
					debugOut("Game over and  your team ("+ConfigJSON.myteam+") " +  (fWon ? "won" : "lost"));
					//TODO TEST: running this method more than once should be fixed by overtime fix, and updating the gamestop to an actual time
					playMp3(ARTIFACT_DIR + "game"+(fWon ? "won" : "lost")+".mp3");
					this.gameStop= dDate;
				}
			}
		}
		else
		{
			this.actionCount.nCount = 0;
		}
		this.actionCount.sLatestEventID  = this.latestEvent.formalEventId;
		//did your team score the most recent goal?
		if(this.homeTeam.isFavorite() && aHomeTeamGoals.length-1 >=0)
		{
			oLatestGoal = aHomeTeamGoals[aHomeTeamGoals.length-1];
		}
		else if(this.awayTeam.isFavorite() && aAwayTeamGoals.length-1 >=0)
		{
			oLatestGoal = aAwayTeamGoals[aAwayTeamGoals.length-1];
		}
		
		//TODO: fix so doesn't blare when system turned on, with a null
		//console.log(oLatestGoal.formalEventId +"!="+ this.lastGoalScoredEventID +"&&"+ oLatestGoal.formalEventId +"&&"+ this.lastGoalScoredEventID)
		if(oLatestGoal.formalEventId != this.lastGoalScoredEventID && oLatestGoal.formalEventId)
		{
			debugOut("PLAY HORN!" + this.lastGoalScoredEventID + "?=" + oLatestGoal.formalEventId);
			if(!fGameOver)//handle system restart
			{
				this.playHorn();
			}
			this.lastGoalScoredEventID = oLatestGoal.formalEventId;
		}
		else
		{
			//TODO: play something when other team scores?  maybe just the light?
			setTimeout(turnLight, 100, true);
		}
	}//aplays end
}
GameResults.prototype.showResults = function(dDate)
{
	//determine if we need to load in actual game results.  Either it's during the game, or we don't have game data
	if(dDate < this.gameStop  || this.gameStats == null)	
	{
		debugOut("showResults: game is going on OR we didn't have data yet!"
				+ (dDate < this.gameStop ? ( "gameover: " + this.gameStop.toString()): " Not in progress") 
				+ " gamestats is " + (this.gameStats == null ? "null" :  "populated"));
		this.gameStats = null;
		this._loadGameUpdates();
	}
	else
	{
		debugOut("showResults: Game values are static, so no need to get active data.")
		this.displayResults(dDate);  //just reuse old data, nothing new going on
	}
}
//look in the config for the "light" and use that as the GPIO pin.  If value not there, false, or 0, dont do anything
GameResults.prototype.playHorn = function()
{
	setTimeout(turnLight, 100, true);
	var sTeam = ConfigJSON.myteam.toLowerCase();
	var sSong = ARTIFACT_DIR + sTeam+".mp3";
	playMp3(sSong);
}

///////end GameResults///////////

//Hockey specific HELPER FUNCTIONS
function reverseTime(a_sTime)
{
	var aRes = a_sTime.split(":");
	var sRes = a_sTime;
	if(aRes.length == 2)
	{
		var nMins = parseInt(aRes[0]);
		var nSecs = parseInt(aRes[1]);
		sRes = (nSecs>0 ? (19-nMins) : (20-nMins)) + ":" + pad2(60-nSecs); 
	}
	return sRes;
}

//Hockey specific HELPER FUNCTIONS
function getPreviousAndNextGames()
{
	var oRes = {nextGame: null};
	var oPrevGame = null;
	var dToday = new Date();
	//start at the beginning of the game list, and find the NEXT game
	for(var x=0; x < aoMyTeamGames.length; x++)
	{
		var dGameDate = parseDateStr(aoMyTeamGames[x].est);
		//console.log(aoMyTeamGames[x].est + " " + (dGameDate >= dToday))
		if(dGameDate > dToday)//game is upcoming
		{
			oRes.nextGame = aoMyTeamGames[x];
			oRes.nextGame.gameTime = parseDateStr(oRes.nextGame.est)
			debugOut("Next game is " +  oRes.nextGame.gameTime.toString() + " " + oRes.nextGame.a + " vs. " + oRes.nextGame.h);

			oRes.previousGame = aoMyTeamGames[x-1];
			oRes.previousGame.gameTime = parseDateStr(oRes.previousGame.est)
			debugOut("Most recent game is " +  oRes.previousGame.gameTime.toString() + " " + oRes.previousGame.a + " vs. " + oRes.previousGame.h);
			break;
		}
	}
	//if season is over, just show the last game of the year
	if(oRes.nextGame == null)
	{
		//debugOut("It looks like we are near end of season, or during playoffs");
		var defaultGameNum = aoMyTeamGames.length-1;	//just pull the last one from the list?
		//oRes.nextGame = aoMyTeamGames[defaultGameNum];
		//oRes.nextGame.gameTime = parseDateStr(oRes.nextGame.est)
		//debugOut("Next game is " +  oRes.nextGame.gameTime.toString() + " " + oRes.nextGame.a + " vs. " + oRes.nextGame.h);

		oRes.previousGame = aoMyTeamGames[defaultGameNum];
		oRes.previousGame.gameTime = parseDateStr(oRes.previousGame.est)
		debugOut("NO NEXT GAME SCHEDULED Most recent game is " +  oRes.previousGame.gameTime.toString() + " " + oRes.previousGame.a + " vs. " + oRes.previousGame.h);
	}
	return oRes;
}

turnLight.settings = {switchTime: 500, totalTime: MILLISPERMINUTE, count:0, fOn:false, gpioObj:null};
function turnLight(s_fOn)
{
	if(ConfigJSON.light && ConfigJSON.light.type && ConfigJSON.light.type!= "none" && ConfigJSON.light.gpio )	//need to know the pins of the light(s)
	{
		var nLightOn = 0;
		//if just 1, then update switchtime to equal the total time (ie. only run 1x)
		if(ConfigJSON.light.gpio.length == 1)
		{
			//no need to run more than 1x
			turnLight.settings.switchTime = turnLight.settings.totalTime;
		}
		else
		{
			//if multiple lights, figure out which one gets turned on based on mod of number of lights, and how many runs
			nLightOn = Math.floor(turnLight.settings.count % ConfigJSON.light.gpio.length);
			//debugOut("turning on the " +nLightOn + " light");
		}
		    //if there are multiple bulbs, this is the one to turn on; use modulous of number of lights.
		for(var x=0; x < ConfigJSON.light.gpio.length; x++)
		{
			var fTurnThisLightOn = (s_fOn && (x == nLightOn));
			if(fTesting && false) console.log("turning the lights ("+nLightOn+")("+ConfigJSON.light.gpio[x]+")" + (fTurnThisLightOn ? "on" : "off"));
			try
			{
				if(turnLight.settings.gpioObj == null)
				{
					turnLight.settings.gpioObj = require('onoff').Gpio;	
				}
				var light = new turnLight.settings.gpioObj(ConfigJSON.light.gpio[x], 'out');
				light.writeSync(fTurnThisLightOn ? 1 : 0);
			}
			catch(e)
			{
				console.warn("issue with GPIO " + ConfigJSON.light.gpio[x] + " - " + s_fOn);
				console.warn(e.message);
			}
		}
		
		if(turnLight.settings.MAXRUNS == null)
		{
			turnLight.settings.MAXRUNS = Math.ceil(turnLight.settings.totalTime / turnLight.settings.switchTime);
		}
		//prep for next run, and go again
		if(s_fOn)
		{
			turnLight.settings.count++;
			var fRunAgain = (turnLight.settings.count <=  turnLight.settings.MAXRUNS);
			//if we are turning lights off, reset the count
			if(!fRunAgain)
			{
				turnLight.settings.count = 0;
			}
			if(fTesting && false) console.log("lights: (m: " + turnLight.settings.MAXRUNS + ") (c:" +turnLight.settings.count+ ") turnoff now?:" + fRunAgain);
			setTimeout(turnLight, turnLight.settings.switchTime, fRunAgain);
		}
	}
	else
	{
		debugOut("No lights");
	}
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

function gameDetailsURL(sGameID)
{
	//http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
	return "http://live.nhl.com/GameData/"+getNHLSeasonString()+"/"+sGameID+"/PlayByPlay.json";
}

function getNHLSeasonURL()
{
	return "http://live.nhl.com/GameData/SeasonSchedule-"+getNHLSeasonString()+".json"	
}


////////////HELPER FUNCTIONS //////////////////

function playMp3(a_sSong)
{
	function playSongSpeaker(format)
	{
		try 
		{
			this.pipe(new Speaker(format));
			//TODO: figure out how to close this speaker object when done
		} catch (e) 
		{
			console.warn("issue with speaker: " + e.message);
			throw e;
		}
	}
	try
	{
		fs.createReadStream(a_sSong)
			.pipe(new lame.Decoder())
			.on('format', playSongSpeaker);
	}
	catch(e)
	{
		console.warn("issue loading mp3 file ("+a_sSong+")" + e.message);
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

function pad2(nMin)
{
	return nMin < 10 ? ("0" +nMin) : nMin 
}
function get12Hour(nHour)
{
	nTime  =  nHour % 12
	return (nTime == 0) ? 12 : nTime;
}

function getDayOfWeek(a_dDate)
{
	var aDays = ["Sun","Mon","Tues","Wed","Thurs","Fri","Sat"];
	//debugOut("dow: " + typeof a_dDate);
	return aDays[a_dDate.getDay()];
}

function smallDate(a_dDate)
{
	if(a_dDate){} else {a_dDate = new Date()};		
	//return (1+dDate.getMonth()) + "/"+dDate.getDate()  + "/"+(1900+dDate.getYear())  + " " + get12Hour(dDate.getHours()) + ":" + pad2(dDate.getMinutes());
	//return dDate.toLocaleDateString() +" " +  getTimeOfDay(dDate);	//remove the seconds
	return getDayOfWeek(a_dDate) + " " + friendlyDate(a_dDate) + " " +  getTimeOfDay(a_dDate);	//remove the seconds
}

function friendlyDate(a_dDate)
{
	var aMonths = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
	return aMonths[a_dDate.getMonth()] + " " + (a_dDate.getDate());
}


function getTimeOfDay(a_dDate)
{
	return (a_dDate.toLocaleTimeString()).replace(/\W\d\d /, " ")
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

function debugOut(sVal)
{
	if(fTesting && sVal)
	{
		console.log(sVal);
	}
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



function oledtest()
{
        const execFile = require('child_process').execFile;
        const child = execFile('python', ['oled_writer.py', 'two is the magic number', 'for real'], (error, stdout, stderr) => {
        //const child = execFile('ls', ['-la'], (error, stdout, stderr) => {
        if (error)
        {
            throw error;
        }
          console.log(stdout);
        });
}

function gpiotest()
{
   var Gpio = require('onoff').Gpio
   lights = new Gpio(17, 'out')
   lights.writeSync((fOn ? 1 : 0));
   fOn = !fOn
   setTimeout(gpiotest, 3000);
}


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