#!/bin/sh -e
# automated update of nhlpi
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/update-nhlpi.sh | sudo -E bash -
if ping -q -c 1 -W 6 google.com >/dev/null; then
	(apt-get update && apt-get -y upgrade) > /dev/null
	apt-get dist-upgrade -y
	apt-get clean -y


	#pull git code
	cd /opt/nhl
	#NHL
	wget --no-cache -O /opt/nhl/nhl_common.js https://github.com/wga22/nodejs/raw/master/nhl/nhl_common.js
	wget --no-cache -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js

	#Web
	wget --no-cache -O /opt/nhl/index.html https://github.com/wga22/nodejs/raw/master/nhl/index.html
	wget --no-cache -O /opt/nhl/webserver.js https://github.com/wga22/nodejs/raw/master/nhl/webserver.js

	#shells
	wget --no-cache -O /etc/bootup_nhl.sh https://github.com/wga22/nodejs/raw/master/nhl/misc/bootup_nhl.sh
	#wget --no-cache -O /etc/network/interfaces https://github.com/wga22/nodejs/raw/master/nhl/misc/interfaces.conf
	#wget --no-cache -O /etc/dnsmasq.conf https://github.com/wga22/nodejs/raw/master/nhl/misc/dnsmasq.conf
	#wget --no-cache -O /usr/local/bin/hostapdstart https://github.com/wga22/nodejs/raw/master/nhl/misc/hostapdstart.sh
	#wget --no-cache -O /etc/hostapd/hostapd.conf https://github.com/wga22/nodejs/raw/master/nhl/misc/hostapd.conf

	chmod u+x /usr/local/bin/hostapdstart
	chmod u+x /etc/bootup_nhl.sh
	#pm2 updatePM2	#TODO: fix this so it doesnt remove the processes that are saved?
fi
exit 0
