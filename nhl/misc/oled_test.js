var oled = require('oled-js-pi');
 
var opts = {
  width: 128,
  height: 64,
  address: 0x3C
};
 
var oled = new oled(opts);

oled.turnOnDisplay();


