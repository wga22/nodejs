#!/bin/sh
#
# update thingspeak with details from tesla api
# deployed APR 2017
# TODO, setup and use env variable for NODEHOME


#TODO: TEST!
echo 'TODO: test'

#make needed directories
export NODEDIR='/home/pi/node'
cd $NODEDIR

mkdir $NODEDIR
mkdir $NODEDIR/tesla
mkdir $NODEDIR/tesla/logs
mkdir $NODEDIR/vacuum
mkdir $NODEDIR/vacuum/logs

#make emtpy log files
touch $NODEDIR/tesla/logs/tesla_tp.log
touch $NODEDIR/tesla/logs/tesla_batt_level.log.log
touch $NODEDIR/vacuum/logs/vacuum.log


wget -O $NODEDIR/tesla/will_tesla.js https://github.com/wga22/nodejs/raw/master/tesla/will_tesla.js
wget -O $NODEDIR/tesla/tesla_battery_levels.js https://github.com/wga22/nodejs/raw/master/tesla/tesla_battery_levels.js
wget -O $NODEDIR/vacuum/vacuum.js https://github.com/wga22/nodejs/raw/master/vacuum/vacuum.js

echo 'TODO: need to create config file'
