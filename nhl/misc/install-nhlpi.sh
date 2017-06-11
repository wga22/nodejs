#!/bin/sh -e

# TODO: automate this script with something like: curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
# TODO: change hostname?
# TODO: setup wifi
# TODO: setup passwd and authorized keys

#apt-get stuff
(apt-get update && apt-get -y upgrade) > /dev/null
apt-get dist-upgrade -y
apt-get install -y raspi-gpio git build-essential python-dev python-pip python-imaging python-smbus libasound2-dev nodejs
apt-get clean -y

#update node
cd /tmp
#wget https://nodejs.org/dist/v7.4.0/node-v7.4.0-linux-armv6l.tar.xz
wget https://nodejs.org/dist/v8.0.0/node-v8.0.0-linux-armv6l.tar.xz
tar -xvf node-v8.0.0-linux-armv6l.tar.xz
cd node-v8.0.0-linux-armv6l
rm *.md
rm LICENSE
cp -R * /usr/local/
apt-get remove --purge npm node nodejs


# TODO: install software needed for wifi
# TODO: turn on wifi and server



#Node setup
#TODO: having some issues installing lame; debugging by manually creating 2 directories: /usr/local/lib/node_modules/lame/.node-gyp and /usr/local/lib/node_modules/lame/.node-gyp/8.0.0
#TODO: maybe just install these into the /opt/nhl ?  (currently installing them g, then local, and copying them)
mkdir /opt/nhl
mkdir /opt/nhl/logs
mkdir /opt/nhl/horns

#install node dependencies into the nhl directory
cd /opt/nhl
npm install oled-i2c-bus i2c-bus oled-font-5x7 lame speaker lcd lcdi2c onoff
#TODO make the installation work globally (BUG: speaker and lame go into loop during global install)
#TODO: consider hack, that installs locally, then copies to the /usr/local/lib/node_modules

#pull git code
cd /opt/nhl
wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
wget -O /opt/nhl/nhl_config.json https://raw.githubusercontent.com/wga22/nodejs/master/nhl/sample_configjson.txt

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
# NOTE: moving the file, because standard one includes an "exit" in last line, so cannot simply append
mv /etc/rc.local /etc/rc.local.bak
touch /etc/rc.local

# turn off the amp and the light on bootup
printf '\n raspi-gpio set 17 op dl' >> /etc/rc.local
printf '\n raspi-gpio set 4 op dl' >> /etc/rc.local
printf '\n sleep 10' >> /etc/rc.local
printf '\n wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js' >> /etc/rc.local
printf '\n cd /opt/nhl' >> /etc/rc.local
printf '\n node NHL_work.js >> logs/nhl.log' >> /etc/rc.local
printf '\n\n exit 0' >> /etc/rc.local
#printf '\n' >> /etc/rc.local
#TODO: set timezone
ln -sf /usr/share/zoneinfo/America/New_York /etc/localtime
# cp /usr/share/zoneinfo/Europe/London /etc/localtime
# sudo ln -sf /usr/share/zoneinfo/Europe/London /etc/localtime


# update environment variable with node_path
cp /etc/environment /etc/environment.bak
printf '\nexport NODE_PATH=/usr/local/lib/node_modules\n' >> /etc/environment
export NODE_PATH=/usr/local/lib/node_modules

exit 0