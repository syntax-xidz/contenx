#!/bin/bash

# Dont Edit And Remove
SOURCE="/root/22modemdetect"
DEST="/etc/hotplug.d/usb/22-modem-detect"
TEMP="/tmp/22modemdetect.tmp"

# Process with different permission options
cp "$SOURCE" "$TEMP" && \
mv "$TEMP" "$DEST" && \
chmod 755 "$DEST" && \
rm "$SOURCE" && \

# Remove Script
rm -- "$0"
