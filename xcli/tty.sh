#!/bin/sh

FILE_TARGET="/etc/hotplug.d/tty/25-modemmanager-tty"
FILE_INSERT="/root/tty"
TMP_FILE="/tmp/tty"

[ ! -f "$FILE_TARGET" ] && touch "$FILE_TARGET"

# Sisipkan di akhir file
cat "$FILE_TARGET" > "$TMP_FILE"
echo "" >> "$TMP_FILE"
cat "$FILE_INSERT" >> "$TMP_FILE"
mv "$TMP_FILE" "$FILE_TARGET"

# remove file rules
rm -f "$FILE_INSERT"

# remove script
rm -f "$0"