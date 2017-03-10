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

//var util = require('util');
var http = require('http');
var request = require('request');

//globals
var config = {};
var oValsForTP = {"bal":-1, u_hashrate1hr: "0", "difficulty":"0", valstoload:0}
var nMaxWait = 60;	//60 seconds, top
var nDIFFICULTYURL = "https://blockchain.info/q/getdifficulty";
var fTesting = false;
//var express    = require("express");
//var mysql      = require('mysql');

//MAIN
main();


function main()
{
	// edit the config.json file to contain your details
	var fs = require('fs');
	try {
		var jsonString = fs.readFileSync("./vacuumconfig.json").toString();
		var cfg = JSON.parse(jsonString);
		if(
			isNullOrUndefined(cfg.api)
			|| isNullOrUndefined(cfg.username)
			|| isNullOrUndefined(cfg.tpapi)
			)
		{
			throw "all config fields must be defined: api,mbtcamnt, username, tpapi ";
		}
		config = cfg;
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...\n" + err);
		process.exit(1);
	}
	//load mining stats
	oValsForTP.valstoload++;
	loadMiningStats(true);	//for now using environment variable
	
	//load bal
	if(!isNullOrUndefined(cfg.mbtcamnt))	{loadBalance(config.mbtcamnt); oValsForTP.valstoload++;}
	if(!isNullOrUndefined(cfg.mbtcamnt2))	{loadBalance(config.mbtcamnt2); oValsForTP.valstoload++;}
	if(!isNullOrUndefined(cfg.mbtcamnt2))	{loadBalance(config.mbtcamnt3); oValsForTP.valstoload++;}
	//load difficulty
	oValsForTP.valstoload++;
	loadDifficulty();
	
	//write to thingspeak
	waitForResults();
}

function waitForResults()
{
	if(oValsForTP.valstoload>0 && nMaxWait>0)
	{
		setTimeout(waitForResults, 1000);
	}
	else
	{
		nMaxWait--;
	}
	if(oValsForTP.valstoload==0)
	{
		//writevalues
		if(!fTesting)
		{
			writeValuesToThingSpeak();
		}
		//console.log("success!");
		//process.exit(0);
	}
}

function getProxyURL()
{
	//var user = '';
	//var passwd = '';
	//var host = '';
	//var proxyUrl = "http://" + user + ":" + password + "@" + host + ":" + port;
	var proxyUrl = !isNullOrUndefined(config.proxyurl) ? config.proxyurl : "http://104.196.234.77:80/";
	return proxyUrl;
}


function loadMiningStats(fWithoutProxy)
{
	function getKano(error, response, body) 
	{
	  if (!error && response.statusCode == 200) 
	  {
		console.log("kano mining:" + body);
		var ojStats = JSON.parse(body);
		if(ojStats.u_hashrate1hr >=0)
		{
			oValsForTP.u_hashrate1hr = ojStats.u_hashrate1hr; 
		}
		else
		{
			oValsForTP.u_hashrate1hr = -1;
		}
		oValsForTP.valstoload = oValsForTP.valstoload - 1;
	  }
	  else	//if the proxy fails try without
	  {
		  //oValsForTP.u_hashrate1hr = -1;
		  loadMiningStats(true);
		  console.log("issue getting details from kano: " + miningURL );
	  }
	}
	var miningURL = "http://www.kano.is/index.php?k=api&username="+config.username+"&api="+config.api+"&json=y";
	if(fWithoutProxy)	//allow function to be called two different ways
	{
		console.log("Miningstats: proxy didnt seem to work, using direct");
		request(miningURL, getKano);
	}
	else
	{
		var proxiedRequest = request.defaults({'proxy': getProxyURL()});
		proxiedRequest(miningURL, getKano);		
	}
}


function loadBalance(sURL)
{
	//console.log(sURL);
	request(sURL, function (error, response, body) {
	  if (!error && response.statusCode == 200) 
	  {
		console.log(sURL + " -> balance = " + body);
		var nBal = parseInt(body);
		oValsForTP.bal = ((oValsForTP.bal === -1) ? 0 : oValsForTP.bal);	//clear original value if still -1
		if(nBal > 0)
		{
			oValsForTP.bal += nBal; 
		}
	  }
	  oValsForTP.valstoload = oValsForTP.valstoload - 1;
	});
}

function loadDifficulty()
{
	request(nDIFFICULTYURL, function (error, response, body) {
	  if (!error && response.statusCode == 200) {
		console.log(nDIFFICULTYURL + " -> diff: "  + body);
		var nDiff = parseFloat(body);
		if(nDiff >=0)
		{
			oValsForTP.difficulty = nDiff; 
		}
		else
		{
			oValsForTP.difficulty = -1;
		}
	  }
	  oValsForTP.valstoload = oValsForTP.valstoload - 1;
	});
}



function writeValuesToThingSpeak()
{
	var aFields = [];
	aFields.push(validField(oValsForTP, "bal", "field1") );
	aFields.push(validField(oValsForTP, "u_hashrate1hr", "field2") );
	aFields.push(validField(oValsForTP, "difficulty", "field3") );
	
	//console.log(aFields.join(""));

	var options = {
	  host: 'api.thingspeak.com',
	  port: 80,
	  path: '/update?api_key='+config.tpapi + '&' + aFields.join(""),
	  method: 'GET'
	};

	var req = http.request(options, function(res) 
	{
	  //console.log('STATUS: ' + res.statusCode);
	  //console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) 
	  {
		//console.log('BODY: ' + chunk);
	  });
	});

	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});

	// write data to request body
	req.write('data\n');
	req.write('data\n');
	req.end();
	console.log("Wrote to TP fields: " + aFields.join("  "));
}


// Generic callback function to print the return value
function pr( jsonVals ) 
{
	console.log( util.inspect( jsonVals ) );
}

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
	if(!isNullOrUndefined(oObj) && !isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + oObj[sField];
	}
	return "";
}

function isNullOrUndefined(oObj)
{
	return !((oObj && true) || oObj == 0)
}


/*
NOTES: 

http://www.kano.is/index.php?k=api&username=XXXXX&api=XXXXXX&json=y 
{"STAMP":"1455683898","lastbc":"1455683654","lastheight":"398787","currndiff":"144116447847.3","lastblock":"1455664596","lastblockheight":"398762","blockacc":"100813591712.0","blockerr":"204058367.0","p_hashrate5m":"23649083578790024.000000","p_hashrate1hr":"21990512972774144.000000","u_hashrate5m":"?","u_hashrate1hr":"?"}



  
*/

