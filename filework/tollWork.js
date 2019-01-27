#!/usr/bin/env node
const util = require('util');
const request = require('request');
const httpsClient = require('https');
var waits = {"wb/washington/belt":{loaded:false}, "eb/belt/washington":{loaded:false}};
const sParseableURL = 'https://shoulditakei66.today/';
//console.log(33)
//MAIN

main();
function main()
{
	loadTollInfo(new Date())
}


function loadTollInfo(oDate)
{
	var dEvening = {start:15, stop:19}
	var dMorning = {start:5, stop:10}
	var dDayRange = {start:1, stop:5}
	var sURL = "https://i66toll.firebaseio.com/"
	var sQS = "/tolls.json?orderBy=%22$key%22&limitToLast=1"
	var sDirection = ""; //outside rush our
	//TESTING!!
	//sDirection = "eb/belt/washington"

	if(oDate.getDay()>=dDayRange.start && oDate.getDay() <= dDayRange.stop )
	{
		//morning - eastbound
		if(oDate.getHours() >= dDayRange.start && oDate.getHours() <= dDayRange.stop )
		{
			sDirection = "eb/belt/washington"
		}
		//evening - westbound
		else if (oDate.getHours()>= dDayRange.start && oDate.getHours() <= dDayRange.stop)
		{
			sDirection = "wb/washington/belt";
		}
		else
		{
			console.log("outside rushhour");
		}
	}
	else
	{
		console.log("weekend: " + oDate.getDay()) 
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
				nToll = oObj[x].price;
			}
			console.log(nToll);
			
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

	/*
//firebaseURL();
	//console.log("hours:" + oDate.getHours())
	//console.log("dow:" + oDate.getDay())	
	//I-66 HOV-2. The hours are 5:30 - 9:30 a.m. going east and 3 - 7 p.m. going west, 
	//gethours 0-23 - noon=12
	//	https://i66toll.firebaseio.com/wb/washington/belt/tolls.json?orderBy=%22$key%22&limitToLast=1
	// https://i66toll.firebaseio.com/eb/belt/washington/tolls.json?orderBy=%22$key%22&limitToLast=1

//eb/belt/washington
//wb/washington/belt


	curl 'https://[PROJECT_ID].firebaseio.com/users/jack/name.json'
	apiKey: 'AIzaSyCM5BnpcIywV85kyBAawGAaRBBHUvNn3EU',
    authDomain: 'i66toll.firebaseapp.com',
    databaseURL: 'https://i66toll.firebaseio.com',
    projectId: 'i66toll',
    storageBucket: 'i66toll.appspot.com',
    messagingSenderId: '180988107064',
	*/