#!/bin/sh
raspi-gpio set 17 op dl
raspi-gpio set 4 op dl
raspi-gpio set 14 op dl
raspi-gpio set 15 op dl
sleep 30
if ping -q -c 1 -W 6 google.com >/dev/null; then
	wget --no-cache -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
	wget --no-cache -O /opt/nhl/index.html https://github.com/wga22/nodejs/raw/master/nhl/index.html
	wget --no-cache -O /opt/nhl/webserver.js https://github.com/wga22/nodejs/raw/master/nhl/webserver.js
	wget --no-cache -O /opt/nhl/nhl_common.js https://github.com/wga22/nodejs/raw/master/nhl/nhl_common.js
	wget --no-cache -O /etc/bootup_nhl.sh https://github.com/wga22/nodejs/raw/master/nhl/misc/bootup_nhl.sh
	chmod u+x /etc/bootup_nhl.sh
	chmod u+x /usr/local/bin/hostapdstart
	ifconfig br0 down
else
	/usr/local/bin/hostapdstart
fi

pm2 startup
exit 0
