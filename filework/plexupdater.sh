#!/bin/bash
mkdir /tmp/plextemp/ > /dev/null 2>&1
#token=$(cat /var/lib/plexmediaserver/Library/Application\ Support/Plex\ Media\ Server/Preferences.xml | grep -oP 'PlexOnlineToken="\K[^"]+')
url=$(echo "https://plex.tv/downloads/latest/5?channel=16&build=linux-x86_64&distro=debian&X-Plex-Token=xr4m7jcQDv3BZBoCKxTB")
jq=$(curl -s ${url})
newversion=$(echo $jq | jq -r .nas.Synology.version)
echo New Ver: $newversion
curversion=$(synopkg version "Plex Media Server")
echo Cur Ver: $curversion
if [ "$newversion" != "$curversion" ]
then
echo New Vers Available
/usr/syno/bin/synonotify PKGHasUpgrade '{"[%HOSTNAME%]": $(hostname), "[%OSNAME%]": "Synology", "[%PKG_HAS_UPDATE%]": "Plex", "[%COMPANY_NAME%]": "Synology"}'
cpu=$(uname -m)
if [ "$cpu" = "x86_64" ]; then
url=$(echo $jq | jq -r ".nas.Synology.releases[1] | .url")
else
 url=$(echo $jq | jq -r ".nas.Synology.releases[0] | .url")
fi
/bin/wget $url -P /volume1/tmp/plex/
/usr/syno/bin/synopkg install /volume1/tmp/plex/*.spk
sleep 30
/usr/syno/bin/synopkg start "Plex Media Server"
rm -rf /volume1/tmp/plex/*
else
echo No New Ver
fi
exit


https://plex.tv/downloads/latest/5?channel=16&build=linux-x86_64&distro=debian&X-Plex-Token=xr4m7jcQDv3BZBoCKxTB