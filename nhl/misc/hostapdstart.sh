#!/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ifconfig uap0 down
iw dev wlan0 interface add uap0 type __ap
#service dnsmasq restart
sysctl net.ipv4.ip_forward=1
ifconfig uap0 up
ifup uap0
iptables -t nat -A POSTROUTING -s 192.168.50.0/24 ! -d 192.168.50.0/24 -j MASQUERADE
service dnsmasq restart
hostapd /etc/hostapd/hostapd.conf > /var/log/hostapd.log &