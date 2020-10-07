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

//cd "C:\Users\Will\Documents\development\github\nodejs\filework"
//"C:\Program Files\nodejs\node.exe"  ftp_awardspace.js
//http://willallencoding.scienceontheweb.net/attict.html

var util = require('util');
var fs = require('fs');	//https://nodejs.org/api/fs.html
var ssh2 = require('ssh2');
var nFiles = 0;

//MAIN
main();
function main()
{
	// edit the config.json file to contain your teslamotors.com login email and password, and the name of the output file
	var fs = require('fs');
	try {
		//var jsonString = fs.readFileSync("./ftp_config.json").toString();
		var jsonString = fs.readFileSync("./ftp_config_willcloud.json").toString();
		var config = JSON.parse(jsonString);
		console.log("-----Running-----");
		//ftpTest(config);
		sftpHTMLFiles(config);
		setTimeout(waitToClose, 10000);
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		console.warn(err);
		process.exit(1);
	}
	//listFilesToMove();	
}

function waitToClose()
{
	console.log("waiting: " + nFiles);
	if(nFiles<=0)
	{
		process.exit(0);
	}
	else
	{
		setTimeout(waitToClose, 2000);
	}
}
function getFilesToMove(sPath)
{
	var aFiles = fs.readdirSync(sPath);
	var aHTMLFiles = aFiles.filter(function(val){return val.match(/html/i)});
	for(var x in aHTMLFiles)
	{
		//aHTMLFiles[x]
		//console.log(aHTMLFiles[x]);
	}
	return aHTMLFiles;
}


function sftpHTMLFiles(jsonCreds)
{
	var Client = require('ssh2').Client;
	var conn = new Client();
	var readStream = [];
	var writeStream = [];
	conn.on('ready', function() 
	{
		console.log("conn ready");
		conn.sftp(function(err, sftp) 
		{
			console.log("connected");
			var sLocalPath = jsonCreds.localHTMLPath;
			var aFilesToMove = getFilesToMove(sLocalPath);
			for(var x in aFilesToMove)
			{
				nFiles++;
				try
				{
					var sLocalFile = (sLocalPath +'/'+ aFilesToMove[x]);
					var sRemoteFile = (jsonCreds.remotePath +aFilesToMove[x]);
					var fs = require("fs"); // Use node filesystem
					readStream[x] = fs.createReadStream( sLocalFile );
					writeStream[x] = sftp.createWriteStream( sRemoteFile );

					writeStream[x].on('close',function () 
					{
						nFiles--;
						console.log( " file transferred succesfully" );
					});
					writeStream[x].on('error', function(){console.log("err");});
					writeStream[x].on('end', function () 
					{	
						nFiles--;
						if(nFiles <= 0)
						{
							console.log( "sftp connection closed" );
							sftp.close();
						}
					});	//writestream end
					// initiate transfer of file
					readStream[x].pipe( writeStream[x] );
				}
				catch(e)
				{
					console.warn(e)
				}
			}
		})
	}).connect(jsonCreds);
}

/*


*/


function ftpTest(jsonCreds)
{
	var c = ssh2.Client();
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

