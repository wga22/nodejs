/*
 * clock.js
 * Display a digital clock on a small I2C connected display
 * 
 * 2016-11-28 v1.0 Harald Kubota
 */


"use strict";

var oled_i2c = require('i2c-bus');
var oled_i2cBus = oled_i2c.openSync(0);
var oled_display = require('oled-i2c-bus');
var oledfont = require('oled-font-5x7');
	

drawBox();
writeString(['Will xxxxx', 'ssdfsdfsdf', (new Date()).toLocaleString()])
//setTimeout(turnOffDisplay, 60000)
function drawBox()
{
	oled.drawLine(1, 1, SIZE_X-2, 1, 1);
	oled.drawLine(SIZE_X-2, 1, SIZE_X-2, SIZE_Y-2, 1);
	oled.drawLine(SIZE_X-2, SIZE_Y-2, 1, SIZE_Y-2, 1);
	oled.drawLine(1, SIZE_Y-2, 1, 1, 1);
}

function writeString(aRes)
{
	const SIZE_X=128,  SIZE_Y=64;

	var opts = {
	  width: SIZE_X,
	  height: SIZE_Y,
	  address: 0x3C
	};
	var oled = new oled_display(i2cBus, opts);
	oled.clearDisplay();
	oled.turnOnDisplay();
	var nRowHeight = 12;
	for(var x=0; x < aRes.length; x++)
	{
		oled.setCursor(10, ((x+1)*nRowHeight));
		oled.writeString(font, 1, aRes[x], 1, true);
	}
}

function turnOffDisplay()
{
	oled.turnOffDisplay();
}
