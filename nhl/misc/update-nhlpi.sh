#!/bin/sh -e
# automated update of nhlpi
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/update-nhlpi.sh | sudo -E bash -

(apt-get update && apt-get -y upgrade) > /dev/null
apt-get dist-upgrade -y
apt-get clean -y

#pull git code
cd /opt/nhl
wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
wget -O /opt/nhl/index.html https://github.com/wga22/nodejs/raw/master/nhl/index.html
wget -O /opt/nhl/webserver.js https://github.com/wga22/nodejs/raw/master/nhl/webserver.js
wget -O /opt/nhl/nhl_common.js https://github.com/wga22/nodejs/raw/master/nhl/nhl_common.js

exit 0