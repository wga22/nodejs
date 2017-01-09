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
var http = require('ftp');	//https://github.com/mscdex/node-ftp
var fs = require('fs');	//https://nodejs.org/api/fs.html

//MAIN
main();
function main()
{

	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	try {

		var jsonString = fs.readFileSync("./ftp_config.json").toString();
		var config = JSON.parse(jsonString);
		console.log("-----Running-----");
		//ftpTest(config);
		ftpHTMLFiles(config);
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	//listFilesToMove();	
}

function getFilesToMove(sPath)
{
	var aFiles = fs.readdirSync(sPath);
	var aHTMLFiles = aFiles.filter(function(val){return val.match(/html/i)});
	for(var x in aHTMLFiles)
	{
		//aHTMLFiles[x]
		console.log(aHTMLFiles[x]);
	}
	return aHTMLFiles;
}


function ftpHTMLFiles(jsonCreds)
{
	function onConnectReady()
	{
		var sLocalPath = jsonCreds.localHTMLPath;
		var aFilesToMove = getFilesToMove(sLocalPath);
		for(var x in aFilesToMove)
		{
			var sLocalFile = (sLocalPath +'/'+ aFilesToMove[x]);
			console.log(sLocalFile + " - > " + jsonCreds.remotePath);
			c.put(sLocalFile, jsonCreds.remotePath +aFilesToMove[x] , throwErr);
		}

	}

	function throwErr(err)
	{
		if (err) throw err;
		c.end();
	}
	var Client = require('ftp');
	var fs = require('fs');

	var c = new Client();
	c.on('ready', onConnectReady);
	// connect to localhost:21 as anonymous
	c.connect(jsonCreds);
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

{
        "host": "willallencoding.scienceontheweb.net",
        "user": "1583755",
        "password": "xxxxx",
		"localHTMLPath" : "C:/Users/Will/Documents/development/github/pure_html",
		"remotePath" : "/willallencoding.scienceontheweb.net/"
}




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

