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
		"LCD_I2C"
		"oled",
	"lcdaddress": "0x27",
	"light":
		{"type":"alarm,multi-led,none", "gpio":["9", "8", "7"] },
	"amp": 
		{"gpio":"14"}
}
 
 {
        "myteam": "WSH",
        "debug":"0" ,
        "output":  "LCD_I2C",
        "light": {"type":"alarm", "gpio":"15" },
        "amp": {"gpio":"14"},
        "lcdaddress" : "0x3F",
        "lightid" : "32"
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

 wget --no-cache -O NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
 
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

//requires
//const lame = require('@suldashi/lame');
const lame = require('lame');
const fs = require('fs');
const Speaker = require('speaker');
const httpClient = require('http');
const httpsClient = require('https');
const nhlcommon = require('./nhl_common.js');
var GPIO = null;

//vars
var ConfigJSON = {myteam: "WSH"};
const reDateCleanup = /\W\d\d /;
const MILLISPERMINUTE = 60000;	//1 minute
const MILLISPERHOUR = MILLISPERMINUTE * 60;
const MILLISPERDAY = MILLISPERHOUR*24;
const ARTIFACT_DIR = "./horns/";
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
	ConfigJSON = nhlcommon.loadConfig();
	powerAmp(false);	//make sure amp is off
	fTesting = (ConfigJSON.debug == "1" || ConfigJSON.debug == "true");
	ConfigJSON.lcdaddress =  (parseInt(ConfigJSON.lcdaddress) > 0) ? parseInt(ConfigJSON.lcdaddress) : 0x27;
	ConfigJSON.quietHours = (parseInt(ConfigJSON.quietHours) >= 0) ? parseInt(ConfigJSON.quietHours) : 4;
	//playMp3(ARTIFACT_DIR + "gamestart.mp3", 14, (new Date()).getHours());
	//make sure light is off to start
	if(fUsingALight())
	{
		setTimeout(turnLight, 100, false);
	}
	//load the games
	loadURLasJSON(getNHLSeasonURL(), initializeTheGamesList);	
	setInterval(updateDisplayEachMinute, MILLISPERMINUTE);
	//setInterval(collectGarbage, MILLISPERHOUR);
	setInterval(dailyCheckForUpdatesToGameList, MILLISPERDAY);
	reportUsage();
	setInterval(reportUsage, MILLISPERDAY);
	if(ConfigJSON.pullDCTolls)
	{
		debugOut("calling out to run the tolls");
		setInterval(loadTollInfo, (MILLISPERMINUTE*5 + 1122));	//add some salt so work is out of step with other activity
	}
}

function collectGarbage()
{
	if (global.gc) {
		global.gc();
		debugOut("ran garbage collector");
	} else {
		console.log('Garbage collection unavailable.  Pass --expose-gc '
		  + 'when launching node to enable forced garbage collection.');
	}
}

function reportUsage()
{
	function postData(res)
	{
		res.on('data', function(chunk){null;});
		res.on('end', function(){null;});
	}
	var THINGSPEAKURL = 'http://api.thingspeak.com/update';
	var sThingspeakKey = '3EC58LURXG5CETNK';
	var sURL = THINGSPEAKURL + "?key=" + sThingspeakKey + "&field1=" + ConfigJSON.lightid;
	httpClient.get(sURL, postData).on('error', function(e){console.log("Report Usage: Got an error: ", e);});
	debugOut("TP POST:" + sURL);
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

function teamSort(a, b) 
{
	if (a.est < b.est) 
	{
	  return -1;
	}
	if (a.est > b.est) 
	{
	  return 1;
	}
	return 0;
  }


function initializeTheGamesList(aoGames)
{
	//https://www.reddit.com/r/nhl/comments/2i13xa/places_to_get_raw_statistics/
	//http://live.nhl.com/GameData/SeasonSchedule-20162017.json
	debugOut("loaded all the games: " + aoGames.length);
	var sMyTeam = ConfigJSON.myteam;
	aoMyTeamGames = aoGames.filter(function(game){return game.a===sMyTeam || game.h === sMyTeam}).sort(teamSort);
	debugOut("filtered just the " + sMyTeam + " games: " + aoMyTeamGames.length);
	//const debug = require('debug')('debug:*');
	//debug(aoMyTeamGames);

	oCurrentGames = getPreviousAndNextGames();
	oPrevGameResults = new GameResults(oCurrentGames.previousGame ? oCurrentGames.previousGame : oCurrentGames.nextGame);
	aoGames = null;
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
		
		playMp3(ARTIFACT_DIR + "gamestart.mp3", 14, dToday.getHours());
		setTimeout(turnLight, 100, true);
		
		//update the values for the previous game
		oCurrentGames = getPreviousAndNextGames();
		oPrevGameResults = new GameResults(oCurrentGames.previousGame ? oCurrentGames.previousGame : oCurrentGames.nextGame);
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
	debugOut("creating game results: " + a_oPrevGameInfo.id);
	this.lastGoalScoredEventID = '';
	this.homeScore=null;
	this.awayScore=null;
	this.latestEvent = null;
	this.actionCount = {nCount:0, sLatestEventID:""};
	this.previousFavTeamScore = 0;
	this.gameId = a_oPrevGameInfo.id;
	if(!parseInt(this.gameId))
	{
		//problem!  how to best handle?
		//set to some random game
		this.gameId = aoMyTeamGames[0];
	}
	this.nDaysTilNextGame = -1;
	this.fResetDaysTilGame = true;
	
	//we only know the code at this point, dont know the id
	this.homeTeam = new Team(a_oPrevGameInfo.h, (a_oPrevGameInfo.h == ConfigJSON.myteam));
	this.awayTeam = new Team(a_oPrevGameInfo.a, (a_oPrevGameInfo.a == ConfigJSON.myteam));
	this.gameStart = a_oPrevGameInfo.gameTime;
	this.gameStop = new Date(a_oPrevGameInfo.gameTime.getTime() + (GameResults.MAXGAMEDURATION*MILLISPERHOUR));	//initiate with something large
	this.gameInProgress = true;
	
	this.displayResults = (dDate) =>
	{
		if(ConfigJSON.output==="LCD_I2C" || ConfigJSON.output==="LCD2004")
		{
			this.LCD_2004_I2C(dDate);
		}
		else if(ConfigJSON.output==="oled" || ConfigJSON.output==="SSD1306")
		{
			this.SSD1306(dDate);
		}
		else
		{
			this.writeResultsToConsole(dDate);
		}
	}
	
	this.writeResultsToConsole = (dDate) =>
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

	this.LCD_2004_I2C = (dDate) =>
	{
		if(GameResults.LCD==null)
		{
			GameResults.LCD = require('lcdi2c');
		}
		var lcd = new GameResults.LCD( 1, ConfigJSON.lcdaddress , 20, 4 );
		var aRes = this.genericResults(dDate);
		lcd.clear();
		for(var x=0; x < aRes.length; x++)
		{
			lcd.println(aRes[x] , (x+1));
		}
	}
	
	this.genericResultsNEW = (dDate) => 
	{
		var aRes = [];
		if(oCurrentGames.nextGame!=null)  //after game
		{
			//use x:"Today 7:00 pm", x+1:tomorrow 7:00 pm, x+(2->6):Sun-Sat, x>=7: "Oct 12"
			var sGameTime = smallDate(oCurrentGames.nextGame.gameTime);
			aRes.push(sGameTime);
			//FIX var nMSGameDate = Math.floor((new Date(oCurrentGames.nextGame.gameTime.getYear(), oCurrentGames.nextGame.gameTime.getMonth(), oCurrentGames.nextGame.gameTime.getDate()).getTime())/MILLISPERDAY);
		}
		return aRes
	}


	this.genericResults = (dDate) =>
	{
		var aRes = [];
		var sTollInfo = "";
		if(ConfigJSON.pullDCTolls && populateToll.nToll && populateToll.nToll > 0)
		{
			sTollInfo = "    " + populateToll.nToll;
		}
		aRes.push(this.awayTeam.nickname + (this.awayScore>=0 ? ("(" + this.awayScore + ")") : "") + sTollInfo);
		aRes.push(this.homeTeam.nickname + (this.homeScore>=0 ? ("(" + this.homeScore + ")") : ""));

		if(this.gameInProgress)	//during game show score
		{
			aRes.push("P:"+ this.period +" T:" + this.gameTime);
		}
		else if(oCurrentGames.nextGame!=null)  //after game
		{
			//use x:"Today 7:00 pm", x+1:tomorrow 7:00 pm, x+(2->6):Sun-Sat, x>=7: "Oct 12"
			var sGameTime = smallDate(oCurrentGames.nextGame.gameTime);
			var nDiffDays = this.nDaysTilNextGame;
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

	var SSD1306 = (dDate) => 
	{
		var aRes = genericResults(dDate);
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

	this.loadGameUpdates = () =>
	{
		//http://statsapi.web.nhl.com/api/v1/game/2017020022/feed/live
		var sURL = gameDetailsURL(this.gameId);
		if(fTesting && false) console.log("loadGameUpdates: " + sURL)
		httpClient.get(sURL, function(res){
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
				var dDate = new Date();
				oPrevGameResults.setGameStats(oObj, dDate);
				oPrevGameResults.displayResults(dDate);
			}
			catch(e) 
			{
				console.warn("Something unexpected with the response from (" + sURL + ") :" + e.message);
				throw e;
				//just let another loop happen, and do nothing more
			}
			//console.log("Got a response: ");
		});
		}).on('error', function(e){
			  console.warn("Got an error: "+sURL , e);
			  throw e;
		});
	}
	
	this.setGameStats = (oRes, dDate) =>
	{
		/*
		debugOut("period:" + gameDataJson.liveData.linescore.currentPeriod)
		debugOut("home:" + gameDataJson.liveData.linescore.teams.home.goals)
		debugOut("away:" + gameDataJson.liveData.linescore.teams.away.goals)
		debugOut("time:" + gameDataJson.liveData.linescore.currentPeriodTimeRemaining)	debugOut("hid:" + gameDataJson.gameData.teams.home.id)
		debugOut("aid:" + gameDataJson.gameData.teams.away.id)
		debugOut("anick:" + gameDataJson.gameData.teams.away.teamName)
		debugOut("hnick:" + gameDataJson.gameData.teams.home.teamName)
		this.gameStop= dDate;
		*/
		if(oRes && oRes.liveData && oRes.liveData.linescore && oRes.gameData && oRes.gameData.teams)
		{
			var gameStats = oRes.liveData.linescore;
			var teams = oRes.gameData.teams;
			var hid = parseInt(teams.home.id); 
			this.homeTeam.id = hid;
			var aid = parseInt(teams.away.id);
			this.awayTeam.id =  aid;
			this.homeTeam.nickname = teams.home.teamName;
			this.awayTeam.nickname = teams.away.teamName;
			var iAG = parseInt(gameStats.teams.away.goals)
			var iHG = parseInt(gameStats.teams.home.goals)
			this.homeScore = iHG ? iHG : 0;
			this.awayScore = iAG ? iAG : 0;
			this.gameTime = gameStats.currentPeriodTimeRemaining ? gameStats.currentPeriodTimeRemaining : "20:00";
			this.period = gameStats.currentPeriod ? gameStats.currentPeriod : 1;
			debugOut("showResults: Active game? " + JSON.stringify(oRes.gameData.status));
			// {"abstractGameState":"Preview","codedGameState":"9","detailedState":"Postponed","statusCode":"9","startTimeTBD":false}
			this.gameInProgress = oRes.gameData.status.detailedState != "Final" && oRes.gameData.status.detailedState != "Scheduled" && oRes.gameData.status.detailedState != "Postponed";
			
			//only should go here when the game is over, 1 time (or maybe at bootup?)
			if(!this.gameInProgress)
			{
				var fWon = (this.homeScore > this.awayScore && this.homeTeam.isFavorite()) || (this.homeScore < this.awayScore && this.awayTeam.isFavorite());	
				debugOut("Game over and  your team ("+ConfigJSON.myteam+") " +  (fWon ? "won" : "lost"));
				playMp3(ARTIFACT_DIR + "game"+(fWon ? "won" : "lost")+".mp3", 12, dDate.getHours());
			}
			else if(this.homeScore>0 && this.homeTeam.isFavorite() && this.homeScore > this.previousFavTeamScore)
			{
				this.previousFavTeamScore = this.homeScore;
				playHorn(dDate.getHours());
			}
			else if(this.awayScore>0 && this.awayTeam.isFavorite() && this.awayScore > this.previousFavTeamScore)
			{
				this.previousFavTeamScore = this.awayScore;
				playHorn(dDate.getHours());
			}
		}
	}

	 this.showResults = (dDate) =>
	{
		if( this.gameInProgress)	//will initiate to true
		{
			debugOut("showResults: Active game.")
			try
			{
				this.loadGameUpdates();
			}
			catch(e)
			{
				console.warn("couldnt load results, so just displaying what we already had");
				this.displayResults(dDate);
			}
		}
		else
		{
			debugOut("showResults: Game values are static, so no need to get active data.");
			//only do this at midnight!
			if(this.nDaysTilNextGame == -1 || (this.fResetDaysTilGame && dDate.getHours() == 0))
			{
				var nMSGameDate = Math.floor((new Date(oCurrentGames.nextGame.gameTime.getYear(), oCurrentGames.nextGame.gameTime.getMonth(), oCurrentGames.nextGame.gameTime.getDate()).getTime())/MILLISPERDAY);
				var nMSToday = Math.floor((new Date(dDate.getYear(), dDate.getMonth(), dDate.getDate()).getTime())/MILLISPERDAY);
				this.nDaysTilNextGame = nMSGameDate-nMSToday;
				debugOut("nDaysTilNextGame =" + this.nDaysTilNextGame);
				this.fResetDaysTilGame = false;
			}
			else if(!this.fResetDaysTilGame && dDate.getHours() >0)
			{
				this.fResetDaysTilGame = true;
			}
			this.displayResults(dDate);  //just reuse old data, nothing new going on
		}
	}
	
	//look in the config for the "light" and use that as the GPIO pin.  If value not there, false, or 0, dont do anything
	function playHorn(nCurrentHour)
	{
		setTimeout(turnLight, 100, true);
		var sTeam = ConfigJSON.myteam.toLowerCase();
		var sSong = ARTIFACT_DIR + sTeam+".mp3";
		playMp3(sSong, 60, nCurrentHour);
	}
}
GameResults.MAXGAMEDURATION = 6;
GameResults.MAXWAITFORGAMEDATA = 100;
GameResults.MAXRETRYEVENT = 4;

GameResults.LCD = null;
GameResults.SSD1306_LCD = {lcd:null, height:64, width:128, rowHeight:12, address: 0x3C, font:null, nRowHeight:10};



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
	var oRes = {nextGame: null, previousGame: null};
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
			
			if(x>0)
			{
				oRes.previousGame = aoMyTeamGames[x-1];
				oRes.previousGame.gameTime = parseDateStr(oRes.previousGame.est)
				debugOut("Most recent game is " +  oRes.previousGame.gameTime.toString() + " " + oRes.previousGame.a + " vs. " + oRes.previousGame.h);
			}
			break;
		}
	}
	//if season is over, just show the last game of the year
	if(oRes.nextGame == null && oRes.previousGame!=null)
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

turnLight.settings = {switchTime: 500, totalTime: MILLISPERMINUTE, count:0, fOn:false};
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
				if(GPIO == null)
				{
					GPIO = require('onoff').Gpio;
				}
				var light = new GPIO(ConfigJSON.light.gpio[x], 'out');
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
			debugOut("lights: (m: " + turnLight.settings.MAXRUNS + ") (c:" +turnLight.settings.count+ ") run again?:" + fRunAgain);
			setTimeout(turnLight, turnLight.settings.switchTime, fRunAgain);
		}
	}
	else
	{
		debugOut("No lights");
	}
}


/*

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
	if(getNHLSeasonString.THISSEASON == null)
	{
		var dToday = new Date();
		var sYear1 = 1900 + (dToday.getMonth() < 8 ? (dToday.getYear()-1)  : (dToday.getYear())); 
		var sYear2 = 1900 + (dToday.getMonth() < 8 ? (dToday.getYear()) : (dToday.getYear()+1));
		getNHLSeasonString.THISSEASON = sYear1 +""+ sYear2;
		//console.log("UGGHH" + getNHLSeasonString.THISSEASON)
	}
	return getNHLSeasonString.THISSEASON;
}

function gameDetailsURL(sGameID)
{
	//http://statsapi.web.nhl.com/api/v1/game/2017020022/feed/live
	//http://live.nhl.com/GameData/20162017/2016020733/PlayByPlay.json
	//return "http://live.nhl.com/GameData/"+getNHLSeasonString()+"/"+sGameID+"/PlayByPlay.json";
	return "http://statsapi.web.nhl.com/api/v1/game/"+sGameID+"/feed/live";
}

function getNHLSeasonURL()
{
	return "http://live.nhl.com/GameData/SeasonSchedule-"+getNHLSeasonString()+".json"	
}


////////////HELPER FUNCTIONS //////////////////

function powerAmp(fOn)
{
	//see if there is detail to poweron / off amp via gpio
	if(ConfigJSON.amp && ConfigJSON.amp.gpio && parseInt(ConfigJSON.amp.gpio))
	{
		try
		{
			if(GPIO == null)
			{
				GPIO = require('onoff').Gpio;
			}
			var amp = new GPIO(ConfigJSON.amp.gpio, 'out');
			amp.writeSync(fOn ? 1 : 0);
		}
		catch(e)
		{
			console.warn("issue with GPIO " + ConfigJSON.amp.gpio + " - " + fOn);
			console.warn(e.message);
		}
	}
}


function playMp3(a_sSong, nLenSecs, nHour)
{
	//no music after hours - test for morning and evenings, always quiet after midnight?
	if(parseInt(nHour) &&  (( nHour < 6)||(ConfigJSON.quietHours <=nHour )))
	{
		debugOut("not playing sound - hour:" + nHour + " qh:" + ConfigJSON.quietHours)
		return;
	}
	nLenSecs = parseInt(nLenSecs) ? parseInt(nLenSecs) : 30;
	function playSongSpeaker(format)
	{
		try 
		{
			powerAmp(true);
			this.pipe(new Speaker(format));
			setTimeout(powerAmp, (nLenSecs * 1000) , false);	//turn off the amp after 60 seconds (longest horn song is phili @ 225, but most are around 1 min)
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
	var nYear = parseInt(a_sDate.substr(0,4));
	var nMon = parseInt(a_sDate.substr(4,2))-1;
	var nDay = parseInt(a_sDate.substr(6,2));
	var nHour = parseInt(a_sDate.substr(9,2));
	var nMin = parseInt(a_sDate.substr(12,2));
	dDate.setMinutes(nMin);
	dDate.setHours(nHour);
	dDate.setDate(nDay);
	dDate.setMonth(nMon);
	dDate.setYear(nYear);
	//debugOut(a_sDate + " parsed to " + dDate.toString());
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
	return (a_dDate.toLocaleTimeString("en-US")).replace(reDateCleanup, " ")
}

function loadURLasJSON(sURL, funcCallback)
{
	httpClient.get(sURL, function(res)
	{
		var body = '';
		res.on('data', function(chunk){body += chunk;});
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
	}).on('error', function(e)
	{
		  console.log("loadURLasJSON Got an error: ", e);
	});
}

function debugOut(sVal)
{
	if(fTesting && sVal)
	{
		var xxx = new Date();
		console.log(friendlyDate(xxx) + " " +  getTimeOfDay(xxx)+":"+sVal);
	}
}


function loadTollInfo()
{
	var oDate = new Date();
	var dEvening = {start:15, stop:19}
	var dMorning = {start:5, stop:10}
	var dDayRange = {start:1, stop:5}
	var sURL = "https://i66toll.firebaseio.com/"
	var sQS = "/tolls.json?orderBy=%22$key%22&limitToLast=1"
	var sDirection = ""; //outside rush our
	var fWeekday = oDate.getDay()>=dDayRange.start && oDate.getDay() <= dDayRange.stop
	var fMorning = oDate.getHours() >= dMorning.start && oDate.getHours() <= dMorning.stop;
	var fAfternoon = oDate.getHours()>= dEvening.start && oDate.getHours() <= dEvening.stop
	//TESTING!!
	//sDirection = fTesting ? "eb/belt/washington" : "";
	debugOut("logic test (" +oDate.getHours() + ") :" + (fWeekday ? "weekday":"weekend") + " " +(fMorning ? "morning" : "not morning") + " " + (fAfternoon ? "evening" : "not evening") );
	if(fWeekday )
	{
		//morning - eastbound
		if(fMorning )
		{
			sDirection = "eb/belt/washington"
		}
		//evening - westbound
		else if (fAfternoon)
		{
			sDirection = "wb/washington/belt";
		}
		else
		{
			console.log("outside rushhour");
			populateToll.nToll = "";
		}
	}
	else
	{
		debugOut("weekend: " + oDate.getDay());
	}
	
	if(sDirection)
	{
		//call service
		var sCompletedURL = sURL+sDirection+sQS;
		console.log(sCompletedURL)
		populateToll(sCompletedURL);
	}
}

function populateToll(sURL)
{
	//http://statsapi.web.nhl.com/api/v1/game/2017020022/feed/live
	httpsClient.get(sURL, 
	function(res){
	var body = '';

	res.on('data', function(chunk)
	{
		body += chunk;
	});

	res.on('end', function()
	{
		var oObj = {};
		try
		{
			//{"1548275420681":{"price":5.5}}
			oObj = JSON.parse(body);
			console.log(body);
			for(var x in oObj)
			{
				populateToll.nToll = parseInt(oObj[x].price);
			}
			debugOut("the toll:" + populateToll.nToll);
			
		}
		catch(e) 
		{
			console.warn("Something unexpected with the response from (" + sURL + ") :" + e.message);
			populateToll.nToll= -1;
			throw e;
			//just let another loop happen, and do nothing more
		}
		//console.log("Got a response: ");
	});
	}).on('error', function(e){
		  console.warn("Got an error: "+sURL , e);
		  throw e;
	});
}
populateToll.nToll = -1;
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