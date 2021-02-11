#!/bin/sh -e
# automated update of tesla_batt_set
# USAGE
#               curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/update-nhlpi.sh | sudo -E bash -
if ping -q -c 1 -W 1 google.com >/dev/null; then
        export PROG="teslaFramework.js"
        export PROG2="tesla_thingspeak.js"
        export PROG3="tesla_battery_levels.js"
        export PROGLOC="/opt/tesla/"

        wget -O ${PROGLOC}${PROG} https://raw.githubusercontent.com/wga22/nodejs/master/tesla/${PROG}
        wget -O ${PROGLOC}${PROG2} https://raw.githubusercontent.com/wga22/nodejs/master/tesla/${PROG2}
        wget -O ${PROGLOC}${PROG3} https://raw.githubusercontent.com/wga22/nodejs/master/tesla/${PROG3}
fi
exit 0
