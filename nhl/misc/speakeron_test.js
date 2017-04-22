"use strict";
var fs = require('fs');
var Speaker = require('speaker');
var lame = require('lame');
var Gpio = require('onoff').Gpio; // Constructor function for Gpio objects.


var led = new Gpio(13, 'out');         // Export GPIO #14 as an output.

main()

function main()
{
	//turn on the speaker
	led.writeSync(1);
	//turn off the speaker
	playSound()
}

function playSound()
{

	function playSongSpeaker(format)
	{
		try 
		{
			this.pipe(new Speaker(format));
			//TODO: figure out how to close this speaker object when done
		} catch (e) 
		{
			console.warn("issue with speaker: " + e.message);
			throw e;
		}
	}
	var sSong ="/home/will/node/nhl/horns/wsh.mp3" 
	try
	{
		fs.createReadStream(sSong)
			.pipe(new lame.Decoder())
			.on('format', playSongSpeaker);
	}
	catch(e)
	{
		console.warn("issue loading mp3 file ("+sSong+")" + e.message);
	}
	setTimeout(turnOffSpeaker, (60000/2));

}

function turnOffSpeaker()
{
	led.writeSync(0);
	led.unexport(); 
}



