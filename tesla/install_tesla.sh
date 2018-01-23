#!/bin/sh -e
# automated update of nhlpi
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/tesla/install_tesla.sh | sudo -E bash -
if ping -q -c 1 -W 1 google.com >/dev/null; then
	export installdir=/opt/tesla
	mkdir $installdir
	cd $installdir
	npm install teslams
	wget --no-cache -O  ${installdir}/teslams.js https://raw.githubusercontent.com/wga22/nodejs/master/tesla/teslams.js
	wget --no-cache -O  ${installdir}/will_tesla.js https://raw.githubusercontent.com/wga22/nodejs/master/tesla/will_tesla.js
	wget --no-cache -O  ${installdir}/tesla_battery_levels.js https://raw.githubusercontent.com/wga22/nodejs/master/tesla/tesla_battery_levels.js
	mkdir /var/log/will_progs/
fi
exit 0