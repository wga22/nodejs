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


var util = require('util');
var http = require('ftp');

//MAIN
main();
function main()
{

	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	try {

		var jsonString = fs.readFileSync("./config.json").toString();
		var config = JSON.parse(jsonString);
		console.log("-----Running-----");
		ftpTest(config);
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	
	
}

function ftpTest(jsonCreds)
{
	var Client = require('ftp');
	var fs = require('fs');

	var c = new Client();
	c.on('ready', function() 
		{
			c.put('test.txt', '/willallencoding.scienceontheweb.net/test.remote-copy.txt', function(err) 
				{
				if (err) throw err;
				c.end();
				});
		});
	// connect to localhost:21 as anonymous
	c.connect(jsonCreds);
}
function handleMax(a_nChargeLvl, a_nPrev)
{
	//if the previous level is still there today, must mean car is dormant
	var nLevel = 100;
	if(a_nPrev <= (a_nChargeLvl+4))
	{
		console.log("doesn't merit charging the car more, since looks like it was sitting");
		console.log("previous:" + a_nPrev + " current level:" + a_nChargeLvl);
		nLevel = a_nPrev;
	}
	return nLevel;
	
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



/*
NOTES: 
  var Client = require('ftp');
  var fs = require('fs');

  var c = new Client();
  c.on('ready', function() {
    c.put('foo.txt', 'foo.remote-copy.txt', function(err) {
      if (err) throw err;
      c.end();
    });
  });
  // connect to localhost:21 as anonymous
  c.connect();
*/

