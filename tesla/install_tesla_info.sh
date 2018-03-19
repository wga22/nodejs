#!/bin/sh -e
# automated update of tesla_batt_set
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/nodejs/master/nhl/misc/update-nhlpi.sh | sudo -E bash -
if ping -q -c 1 -W 1 google.com >/dev/null; then
	export PROG="will_tesla.js"
	export PROGLOC="/opt/tesla/"
	export LOGFILELOC="/var/log/will_progs/"
	export CRONTSLFILE="/etc/cron.hourly/tesla_record"
	
	mkdir -p ${PROGLOC}
	mkdir -p ${LOGFILELOC}
	
	cd ${PROGLOC}
	npm -g --unsafe-perm install teslams querystring http util
	npm --unsafe-perm install teslams
	
	wget -O ${PROGLOC}${PROG} https://raw.githubusercontent.com/wga22/nodejs/master/tesla/${PROG}
	if [ -f "${CRONTSLFILE}" ]; then
		rm ${CRONTSLFILE}
	fi
	touch ${CRONTSLFILE}
	chmod u+x ${CRONTSLFILE}
	printf '#!/bin/sh'> ${CRONTSLFILE}
	printf "\ncd ${PROGLOC}"
	printf "\nnode ${PROG} >> ${LOGFILELOC}tesla_record.log" >> ${CRONTSLFILE}
	printf "\nexit 0" >> ${CRONTSLFILE}
	echo " do not forget the json file!"
fi
exit 0