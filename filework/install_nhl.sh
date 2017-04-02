#!/bin/sh
#
# update thingspeak with details from tesla api
# deployed APR 2017
# TODO, setup and use env variable for NODEHOME

#TODO: TEST!

#make needed directories
export $NODEDIR='/home/pi/node'
cd $NODEDIR
mkdir $NODEDIR
mkdir $NODEDIR/nhl
mkdir $NODEDIR/nhl/horns
mkdir $NODEDIR/nhl/logs

#make emtpy lot files
touch $NODEDIR/nhl/logs/nhl.log

#pull the code
wget -O $NODEDIR/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
wget -O $NODEDIR/nhl/gethorns.js https://github.com/wga22/nodejs/raw/master/nhl/gethorns.js

#install dependencies
cd $NODEDIR
sudo apt-get install libasound2-dev
npm install lame
npm install onoff
npm install speaker
npm install lcdi2c		# needed for the Hitachi HD44780 LCD
npm install oled-i2c-bus

#pull the horns
cd $NODEDIR/nhl/horns
node ../gethorns.js

