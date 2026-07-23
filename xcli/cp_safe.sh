#!/bin/sh
SRC1="/root/mm-test"
DST1="/etc/hotplug.d/iface/30-keep_alive-modemmanager"
SRC2="/root/mm89"
DST2="/etc/hotplug.d/usb/89-modemmanager"

[ -f "$SRC1" ] && cp "$SRC1" "$DST1" && chmod 755 "$DST1" && rm -f "$SRC1"
[ -f "$SRC2" ] && cp "$SRC2" "$DST2" && chmod 755 "$DST2" && rm -f "$SRC2"