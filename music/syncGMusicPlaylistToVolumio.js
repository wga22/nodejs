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
	pm.init(creds, function(err) 
	{
		if(err) console.error(err);

		//pm.getPlayLists(debugPLData);	//get playlists

		// gets all playlists, and all entries on each
		//pm.getFavorites(writeFavs);
		//pm.getFavorites(writeFavsTitleOnly);
		//pm.getPlayListEntries(debugPLEntries)
		pm.getAllTracks(debugAllTracks)
	});	//init
}

function debugAllTracks(err, data)
{
	//data.data.items
	var sSongID = '8f6e919c-3929-37ca-b427-613277d67192';
	var allTracks = data.data.items;
	console.log("len:" + allTracks.length)
	var searchResults = allTracks.filter(function(track) { 
	var sSID = "c61d3889-da59-3f92-bb4e-ed633d79f46a";
	return track.id === sSID; });
	//console.log(searchResults[0]);
	
	//console.log(data.data.items[0]);
}

function debugPLEntries(err, data)
{
/*
 { kind: 'sj#playlistEntry',
   id: '834853c5-6a27-3f37-ba0f-79b929f298bb',
   clientId: '25d010f4-5eef-4731-8644-d7985d5db750',
   playlistId: '51818758-a8fe-410c-9ec6-61797c184a6a',
   absolutePosition: '02298637249809901155',
   trackId: '8f6e919c-3929-37ca-b427-613277d67192',
   creationTimestamp: '1483125699701584',
   lastModifiedTimestamp: '1483125699701584',
   deleted: false,
   source: '1' } ]
*/
	var aPlaylistEntries = data.data.items;
	console.log(aPlaylistEntries);
	
}

function debugPLData(err,data)
{
	/*

{ kind: 'sj#playlistList',
  data: 
   { items: 
      [ [Object],
        [Object],
        [Object],	
	
	*/
	
	var aPlaylists = data.data.items;
	console.log(aPlaylists);
}

function writeFavsTitleOnly(err, data)
{
	for (var q in data)
	{
		for(var z in data[q])
		{
			console.log(data[q][z].artist + '-' + data[q][z].title);
		}
		//break;
	}
	//console.log(data);
}



function writeFavs(err, data)
{
	for (var q in data)
	{
		console.log(data[q]);
		break;
	}
	//console.log(data);
}

function getSongsFromPL2(err, data)
{
	var aPlaylists = data.data.items; 
	for(var x=0; x < aPlaylists.length; x++)
	{
		var oPlaylist = aPlaylists[x];
		if(!oPlaylist.deleted)
		{
			console.log(x + ": " + oPlaylist.name);
			//getSongsFromPlaylist(oPlaylist);
			pm.getPlayListEntries(function(err, plentries) 
			{
				var aSongs = plentries.data.items;
				for( var y=0; y < aSongs.length; y++)
				{
	//				console.log(x+ " - "+" - "+ y + aSongs[y].name );
				}
			});
		}
		break;
	}	
}

function getSongsFromPlaylist(oPlaylist)
{
	oPlaylist.getPlayListEntries(function(err, data) {
		console.log(data.data.items);
	});
	
}

/*
PLAYLIST
 { kind: 'sj#playlist',
   id: '69872533-4970-4a3c-b8a8-c3774b2f9b16',
   creationTimestamp: '1472440793715004',
   lastModifiedTimestamp: '1479153199752121',
   recentTimestamp: '1479153199547000',
   deleted: false,
   name: 'Yacht Rock',
   type: 'USER_GENERATED',
   shareToken: 'AMaBXymK195vh0_iWDoZR96OOhhk6_dX2BJP2lHy_na7p_xmJS68tsBL-azCqTomZKVFTRyMp
C0seBT6gKR-KyYtkwF_0_f2Q==',
   ownerName: 'Will Allen',
   ownerProfilePhotoUrl: 'http://lh5.googleusercontent.com/-CvLdBsidcxM/AAAAAAAAAAI/AAAAA
AAKyM/ZZKTQhRD068/photo.jpg',
   description: '',
   accessControlled: false },
*/

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
		console.warn("The file 'config.json' does not exist or contains invalid arguments! Exiting...");
		process.exit(1);
	}
	return creds;
}