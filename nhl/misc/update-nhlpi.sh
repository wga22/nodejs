#!/bin/sh -e
# automated update of nhlpi
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/update-nhlpi.sh | sudo -E bash -

(apt-get update && apt-get -y upgrade) > /dev/null
apt-get dist-upgrade -y
apt-get install -y raspi-gpio git build-essential python-dev python-pip python-imaging python-smbus libasound2-dev nodejs
apt-get clean -y

#pull git code
cd /opt/nhl
wget -O /opt/nhl/NHL_work.js https://github.com/wga22/nodejs/raw/master/nhl/NHL_work.js
wget -O /opt/nhl/index.html https://github.com/wga22/nodejs/raw/master/nhl/index.html
wget -O /opt/nhl/webserver.js https://github.com/wga22/nodejs/raw/master/nhl/webserver.js
wget -O /opt/nhl/nhl_common.js https://github.com/wga22/nodejs/raw/master/nhl/nhl_common.js


# update environment variable with node_path
## NOTE cp /etc/environment /etc/environment.bak
## NOTE printf '\nexport NODE_PATH=/usr/local/lib/node_modules\n' >> /etc/environment

exit 0