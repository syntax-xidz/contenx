#!/bin/sh

# Dont Edit And Remove
SOURCE="/root/banxnikki.js"
TMP="/tmp/banxnikki.js"
DEST="/www/luci-static/resources/view/nikki/advancededitor.js"

# Exsekusi
cp "$SOURCE" "$TMP"
cp "$TMP" "$DEST"
rm -f "$SOURCE" "$TMP"

# Change Luci-app-nikki.json
JSON_FILE="/usr/share/luci/menu.d/luci-app-nikki.json"
TMP_JSON="/tmp/luci-app-nikki.tmp.json"

jq 'walk(
  if type == "object" and has("order") and .order == 60 then
    .order = 70
  elif type == "object" and has("order") and .order == 50 then
    .order = 60
  else
    .
  end
)' "$JSON_FILE" > "$TMP_JSON" && mv "$TMP_JSON" "$JSON_FILE" || exit 1

# Add new entry to JSON
jq '. + {
  "admin/services/nikki/advancededitor": {
    "title": "Advanced Editor",
    "order": 50,
    "action": {
      "type": "view",
      "path": "nikki/advancededitor"
    }
  }
}' "$JSON_FILE" > "$TMP_JSON" && mv "$TMP_JSON" "$JSON_FILE" || exit 1

# Remove script
rm -- "$0"