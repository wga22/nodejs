#!/usr/bin/env node
/*utility to give better names to mavic files
Feature ideas:
  - keep record of "locations" by lat/long info (even if munged), and use this info to name
  - pull lat/long to cityname, and if valid, use.
  - automatically post to imagur (https://www.npmjs.com/package/imgur)
*/
//REQUIRES
const util = require('util');
const fs = require('fs');	//https://nodejs.org/api/fs.html
const PlayMusic = require('playmusic');
var creds = {};
//STATICS

//GLOBALS
var pm = new PlayMusic();

//MAIN
main();

function main()
{
	loadCreds();
	console.log(creds.email);
	pm.init(creds, handleErrorGM);
	pm.getFavorites(function(err, library) 
	{
		if(library && library.data && library.data.items)
		{
			var song = library.data.items.pop();
			console.log(song);
			pm.getStreamUrl(song.id, 
				function(err, streamUrl) 
				{
					console.log(streamUrl);
				}
			);			
		}
		else
		{
			console.log("something isnt right - no library")
			console.log(library);
		}
	}
	);
}


function handleErrorGM(err) 
{
	console.log("handle error");
	if(err)
	{
		console.error(err);
	}
    
}

function loadCreds()
{
	try {

		var jsonString = fs.readFileSync("./gmusic_config.json").toString();
		creds = JSON.parse(jsonString);
		
		if(creds.email === null || creds.password === null)
		{
			throw {desc: "error loading creds"};
		}
		
	} catch (err) {
		console.warn("The file 'gmusic_config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	return creds;
}