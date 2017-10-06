#!/bin/sh
raspi-gpio set 17 op dl
raspi-gpio set 4 op dl
sleep 10
wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
wget -O /opt/nhl/index.html https://github.com/wga22/nodejs/raw/master/nhl/index.html
wget -O /opt/nhl/webserver.js https://github.com/wga22/nodejs/raw/master/nhl/webserver.js
wget -O /opt/nhl/nhl_common.js https://github.com/wga22/nodejs/raw/master/nhl/nhl_common.js
wget -O /etc/bootup_nhl.sh https://github.com/wga22/nodejs/raw/master/nhl/misc/bootup_nhl.sh
chmod u+x /etc/rc.local
#pm2 startup
exit 0
