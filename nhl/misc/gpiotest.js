#!/usr/bin/env node

/*
NOTES:
 
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
var fs = require('fs');
var MILLISPERMINUTE = 60000;	//1 minute
var MILLISPERHOUR = MILLISPERMINUTE * 60;
//var oLCDData = {lastactiondesc: "", date: (new Date()), standings: "0-0", teamname:"Washington Capitals", score:" WSH: 3 vs LOS: 1"};
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
