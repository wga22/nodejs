#!/usr/bin/env node
/*

	title: syncGMusicToVolumio
	Purpose: transfer playlists in the gmusic account (and songs) into volumio
	Author: Will Allen
	Date: 12-DEC-2016

https://github.com/jamon/playmusic
*/

var util = require('util');
var fs = require('fs');

var PlayMusic = require('playmusic');
var creds = {};

main();

function main()
{
	loadCreds();
	console.log(creds.email);
	
	var pm = new PlayMusic();
	pm.init(creds, function(err) {
		if(err) console.error(err);

		pm.getPlayLists(function(err, data) {
        console.log(data.data.items);
    });

    // gets all playlists, and all entries on each
    pm.getPlayListEntries(function(err, data) {
        console.log(data.data.items);
    });


		})
}

function loadCreds()
{
	try {

		var jsonString = fs.readFileSync("./config.json").toString();
		creds = JSON.parse(jsonString);
		
		if(creds.email === null || creds.password === null)
		{
			throw {desc: "error loading creds"};
		}
		
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
}