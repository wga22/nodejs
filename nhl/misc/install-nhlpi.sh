#!/bin/sh -e

# TODO: automate this script with something like: curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
# TODO: change hostname?
# TODO: setup wifi
# TODO: setup passwd and authorized keys

#apt-get stuff
(apt-get update && apt-get -y upgrade) > /dev/null
apt-get dist-upgrade -y
apt-get install -y raspi-gpio git build-essential python-dev python-pip python-imaging python-smbus libasound2-dev nodejs

#update node
cd /tmp
#wget https://nodejs.org/dist/v7.4.0/node-v7.4.0-linux-armv6l.tar.xz
wget https://nodejs.org/dist/v8.0.0/node-v8.0.0-linux-armv6l.tar.xz
tar -xvf node-v8.0.0-linux-armv6l.tar.xz
cd node-v8.0.0-linux-armv6l
rm *.md
rm LICENSE
cp -R * /usr/local/
sudo apt-get remove --purge npm node nodejs


# TODO: install software needed for wifi

apt-get clean -y

# TODO: turn on wifi and server

#Node setup
npm install -g oled-i2c-bus i2c-bus oled-font-5x7
npm install -g lame speaker
npm install -g lcd lcdi2c onoff



#pull git code
# TODO: make dirs
mkdir /opt/nhl
mkdir /opt/nhl/logs
mkdir /opt/nhl/horns

#pull horns
curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/horns/pullhorns.sh | sudo -E bash -

# TODO: update rc.local
# TODO: pull the mp3 files
# TODO: 
wget -O /home/pi/node/NHL/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js


#config file updates
#add sound
cp /boot/config.txt /boot/config.txt.bak
printf '\ndtoverlay=pwm-2chan,pin=18,func=2,pin2=13,func2=4' >> /boot/config.txt

exit 0