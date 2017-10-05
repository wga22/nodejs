#!/bin/sh -e
#can be called via 
#curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/install-nhlpi.sh | sudo -E bash -
# TODO: automate this script with something like: curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
# TODO: change hostname?
# TODO: setup wifi
# TODO: setup passwd and authorized keys
#apt-get stuff
(apt-get update && apt-get -y upgrade) > /dev/null
apt-get dist-upgrade -y
#General Dev
apt-get install -y git build-essential python-dev python-pip python-smbus libasound2-dev nodejs
# GPIO
apt-get install -y raspi-gpio python-imaging python-smbus libasound2-dev
#networking
apt-get install -y bridge-utils hostapd dnsmasq
apt-get clean -y

#update node
cd /tmp
export nodeversion=8.5.0
#wget https://nodejs.org/dist/v7.4.0/node-v7.4.0-linux-armv6l.tar.xz
#wget https://nodejs.org/dist/v8.0.0/node-v8.0.0-linux-armv6l.tar.xz
wget https://nodejs.org/dist/v${nodeversion}/node-v${nodeversion}-linux-armv6l.tar.xz
tar -xvf node-v${nodeversion}-linux-armv6l.tar.xz
cd node-v${nodeversion}-linux-armv6l
rm *.md
rm LICENSE
cp -R * /usr/local/
rm -R /tmp/node-v${nodeversion}-linux-armv6l
rm /tmp/node-v${nodeversion}-linux-armv6l.tar.xz
#TODO: make sym link for node binary?
apt-get remove -y --purge npm node nodejs


# TODO: install software needed for wifi
# TODO: turn on wifi and server

#Node setup
mkdir /opt/nhl
mkdir /opt/nhl/logs
mkdir /opt/nhl/horns

#update Node
#install node dependencies into the nhl directory
export NODE_PATH=/usr/local/lib/node_modules

#HACK - TODO - fix that lame wont install globally
cd /opt/nhl
npm install lame	# lame, is lame, wont install globally
cp -R /opt/nhl/node_modules/lame $NODE_PATH
npm install speaker	#wont install globally
cp -R /opt/nhl/node_modules/speaker $NODE_PATH
npm install i2c-bus	#wont install globally
cp -R /opt/nhl/node_modules/i2c-bus $NODE_PATH
npm install oled-i2c-bus	#wont install globally
cp -R /opt/nhl/node_modules/oled-i2c-bus $NODE_PATH
npm install lcd	#wont install globally
cp -R /opt/nhl/node_modules/lcd $NODE_PATH
npm install lcdi2c	#wont install globally
cp -R /opt/nhl/node_modules/lcdi2c $NODE_PATH
npm install pm2	#wont install globally
cp -R /opt/nhl/node_modules/pm2 $NODE_PATH
npm install express	#wont install globally
cp -R /opt/nhl/node_modules/express $NODE_PATH

# any NHL only modules
npm install oled-font-5x7 onoff express body-parser child_process pm2 -g

#pull git code
cd /opt/nhl
#JSON is one time creation
wget -O /opt/nhl/nhl_config.json https://raw.githubusercontent.com/wga22/nodejs/master/nhl/sample_configjson.txt
#wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
#call automated script to install everything else for NHL
curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/update-nhlpi.sh | sudo -E bash -

#pull horns
cd /opt/nhl/horns
curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/horns/pullhorns.sh | sudo -E bash -

#config file updates
#add sound
cp /boot/config.txt /boot/config.txt.bak
printf '\ndtoverlay=pwm-2chan,pin=18,func=2,pin2=13,func2=4' >> /boot/config.txt
#turn on i2c
printf '\n\ndtparam=i2c1=on\n' >> /boot/config.txt
printf '\n\ndtparam=i2c_arm=on\n' >> /boot/config.txt

#TODO: is this needed?
cp /etc/modules /etc/modules.bak
printf '\ni2c-dev\ni2c-bcm2708\n' >> /etc/modules

amixer cset numid=1
#TODO: set volume, 60%?

# TODO: update rc.local
# TODO: change this file to be a file stored directly in git
# NOTE: moving the file, because standard one includes an "exit" in last line, so cannot simply append
mv /etc/rc.local /etc/rc.local.bak
touch /etc/rc.local

# turn off the amp and the light on bootup
printf '\n raspi-gpio set 17 op dl' >> /etc/rc.local
printf '\n raspi-gpio set 4 op dl' >> /etc/rc.local
printf '\n sleep 10' >> /etc/rc.local
printf '\n wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js' >> /etc/rc.local
printf '\n wget -O /opt/nhl/index.html https://github.com/wga22/nodejs/raw/master/nhl/index.html' >> /etc/rc.local
printf '\n wget -O /opt/nhl/webserver.js https://github.com/wga22/nodejs/raw/master/nhl/webserver.js' >> /etc/rc.local
printf '\n wget -O /opt/nhl/nhl_common.js https://github.com/wga22/nodejs/raw/master/nhl/nhl_common.js' >> /etc/rc.local
#printf '\n cd /opt/nhl' >> /etc/rc.local
#printf '\n node NHL_work.js >> logs/nhl.log' >> /etc/rc.local
printf '\n\n exit 0' >> /etc/rc.local

#TODO: need to add something to do the regular software updates weekly like this
# Maybe just copy this file directly down to the rc.weekly folder?
## TEST rm /etc/cron.weekly/nhl_updater
## TEST printf '\ncurl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/XXX TODO XXXX.sh | sudo -E bash -' > /etc/cron.weekly/nhl_updater
## TEST chmod u+x /etc/cron.weekly/nhl_updater


#printf '\n' >> /etc/rc.local
#TODO: set timezone
ln -sf /usr/share/zoneinfo/America/New_York /etc/localtime
# cp /usr/share/zoneinfo/Europe/London /etc/localtime
# sudo ln -sf /usr/share/zoneinfo/Europe/London /etc/localtime

# update environment variable with node_path
cp /etc/environment /etc/environment.bak
printf '\nexport NODE_PATH=/usr/local/lib/node_modules\n' >> /etc/environment
#TODO: define this for node self.ipaddress = process.env.NODEJS_IP;
#TODO: self.port      = process.env.NODEJS_PORT || 80;

#TODO: setup PM2
cd /tmp/
npm install -g pm2
pm2 startup
cd /opt/nhl
pm2 start NHL_work.js
pm2 start webserver.js
pm2 save


exit 0
