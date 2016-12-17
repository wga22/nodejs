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
	var pm = new PlayMusic();
	pm.init(creds, function(err) {
		if(err) console.error(err);
		// place code here
	})
}

function loadCreds()
{
	try {

		var jsonString = fs.readFileSync("./config.json").toString();
		var config = JSON.parse(jsonString);
		creds = { 
			email: config.username, 
			password: config.password 
		};
	} catch (err) {
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
}