#!/bin/sh -e
# automated update of tesla_batt_set
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/update-nhlpi.sh | sudo -E bash -
if ping -q -c 1 -W 1 google.com >/dev/null; then
	export PROGLOC="/opt/vacuum/"
	export LOGFILELOC="/var/log/will_progs/"
	export CRONTSLFILE="/etc/cron.hourly/vacuum"
	mkdir -p ${PROGLOC}
	cd ${PROGLOC}
	npm -g --unsafe-perm install -g request
	wget -O ${PROGLOC}vacuum.js https://raw.githubusercontent.com/wga22/nodejs/master/vacuum/vacuum.js
	mkdir -p ${LOGFILELOC}
	touch ${CRONTSLFILE}
	chmod u+x ${CRONTSLFILE}
	printf '#!/bin/sh'> ${CRONTSLFILE}
	printf "\ncd ${PROGLOC}"
	printf "\nnode vacuum.js > ${LOGFILELOC}" >> ${CRONTSLFILE}
	printf "\nexit 0" >> ${CRONTSLFILE}
fi
exit 0