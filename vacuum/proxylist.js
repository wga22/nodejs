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

var fTesting = true;
var util = require('util');
var https = require('https');
var http = require('http');
var aIPList = [];


//MAIN
//testing();
main();
function pr( jsonVals ) {
	console.log( util.inspect( jsonVals ) );
	//writeValuesToThingSpeak(jsonVals)
}
function main()
{
	//https://www.us-proxy.org
	findIps("https://www.us-proxy.org");
}

function parseIPs(a_sPage)
{
	var reIP = /((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?(\.|$)){4})\D+80/g
	var aIPMatch = [];
	while ((aIPMatch = reIP.exec(a_sPage)) !== null) 
	{
		console.log(aIPMatch[1]);
		aIPList.push(aIPMatch[1]);
	}
	
	
	var nRand = Math.floor((Math.random()*1000) % aIPList.length);
	console.log(nRand + " out of  " + aIPList.length);
	var proxyURL = aIPList[nRand];	//pull a random one
	var exec = require('child_process').exec;
	var cmd = "export http_proxy=\"http://" + proxyURL + ":80/\"";
	console.log(cmd);
	exec(cmd, function(error, stdout, stderr) { console.log("new proxy set...." + cmd)});
}

function findIps(sURL)
{
	var sProxyPage = "";
	https.get(sURL, function(res){

	res.on('data', function(chunk){
		sProxyPage += chunk;
	});

	res.on('end', function()
	{
		parseIPs(sProxyPage);
	});
	}).on('error', function(e){
		  console.log("Got an error: ", e);
	});

	
	
}



function round2(nNum)
{
	return Math.round(nNum * 100)/100;
}


/*
//mothballed since doesnt make sense to compare previous level, since car is likely charging,
// and should be back to same level by time program runs
function handleMax(a_nChargeLvl, a_nPrev)
{
	//if the previous level is still there today, must mean car is dormant
	var nLevel = 100;
	if(a_nPrev <= (a_nChargeLvl+4))
	{
		console.log("Looks like car wasnt useddoesn't merit charging the car more, since looks like it was sitting");
		console.log("previous:" + a_nPrev + " current level:" + a_nChargeLvl);
		nLevel = a_nPrev;
	}
	return nLevel;
	
}
*/

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
	if(!util.isNullOrUndefined(oObj) && !util.isNullOrUndefined(oObj[sField]))
	{
		return "&" + sFieldName + "=" + oObj[sField];
	}
	return "";
}



