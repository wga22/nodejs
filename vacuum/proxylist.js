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
	//just get elite
	var reIP = /((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?(\.|$)){4})\<\/td\>(\<td\>\D+\<\/td\>){2}\<td\>elite proxy\<\/td\>/g
	//var reIP = /((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?(\.|$)){4})\D+80/g
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

/*

<tr><td>162.243.95.205</td><td>8080</td><td>US</td><td>United States</td><td>anonymous</td><td>no</td><td>yes</td><td>10 minutes ago</td></tr>
<tr><td>138.197.87.168</td><td>8080</td><td>US</td><td>United States</td><td>anonymous</td><td>no</td><td>yes</td><td>10 minutes ago</td></tr>
<tr><td>67.205.168.235</td><td>80</td><td>US</td><td>United States</td><td>transparent</td><td>no</td><td>no</td><td>12 minutes ago</td></tr>
<tr><td>50.184.179.137</td><td>3128</td><td>US</td><td>United States</td><td>transparent</td><td>no</td><td>no</td><td>12 minutes ago</td></tr>
<tr><td>52.15.65.126</td><td>3128</td><td>US</td><td>United States</td><td>transparent</td><td>no</td><td>no</td><td>12 minutes ago</td></tr>
<tr><td>192.34.63.112</td><td>80</td><td>US</td><td>United States</td><td>transparent</td><td>no</td><td>no</td><td>18 minutes ago</td></tr>
<tr><td>74.117.159.232</td><td>2594</td><td>US</td><td>United States</td><td>transparent</td><td>no</td><td>no</td><td>18 minutes ago</td></tr>
<tr><td>162.230.215.138</td><td>3128</td><td>US</td><td>United States</td><td>transparent</td><td>no</td><td>no</td><td>20 minutes ago</td></tr>
<tr><td>67.205.143.252</td><td>8080</td><td>US</td><td>United States</td><td>anonymous</td><td>no</td><td>yes</td><td>21 minutes ago</td></tr>
<tr><td>47.89.41.164</td><td>80</td><td>US</td><td>United States</td><td>anonymous</td><td>no</td><td>no</td><td>21 minutes ago</td></tr>


*/
	
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



