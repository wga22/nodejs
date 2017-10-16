#!/bin/sh -e
# automated update of nhlpi
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/update-nhlpi.sh | sudo -E bash -
if ping -q -c 1 -W 1 google.com >/dev/null; then
	mkdir /opt/tesla
	cd /opt/tesla
	npm install teslams
	wget -O /opt/tesla/dnsmasq.conf https://raw.githubusercontent.com/wga22/nodejs/master/tesla/teslams.js
	wget -O /opt/tesla/will_tesla.js https://raw.githubusercontent.com/wga22/nodejs/master/tesla/will_tesla.js
	wget -O /opt/tesla/tesla_battery_levels.js https://raw.githubusercontent.com/wga22/nodejs/master/tesla/tesla_battery_levels.js
fi
exit 0