#!/bin/sh

# Setup log
exec >> "/root/setup-xidzswrt.log" 2>&1

main() {
    date=$(date +"%d%m%Y")
    date
    echo "Starting XIDZs-WRT configuration."
    
    # OS vars
    RELEASE_FILE="/etc/openwrt_release"
    TTYD_JSON="/usr/share/luci/menu.d/luci-app-ttyd.json"

    # Check OS
    if [ -f "$RELEASE_FILE" ]; then
        echo "Checking system release..."
        if grep -q "ImmortalWrt" "$RELEASE_FILE"; then
            sed -i 's/\(DISTRIB_DESCRIPTION='\''ImmortalWrt [0-9]*\.[0-9]*\.[0-9]*\).*'\''/\1'\''/g' "$RELEASE_FILE"
            [ -f "$TTYD_JSON" ] && sed -i 's|system/ttyd|services/ttyd|g' "$TTYD_JSON"
            BRANCH_VERSION=$(grep 'DISTRIB_DESCRIPTION=' "$RELEASE_FILE" | awk -F"'" '{print $2}')
            echo "ImmortalWrt detected - $BRANCH_VERSION"
        elif grep -q "OpenWrt" "$RELEASE_FILE"; then
            sed -i 's/\(DISTRIB_DESCRIPTION='\''OpenWrt [0-9]*\.[0-9]*\.[0-9]*\).*'\''/\1'\''/g' "$RELEASE_FILE"
            BRANCH_VERSION=$(grep 'DISTRIB_DESCRIPTION=' "$RELEASE_FILE" | awk -F"'" '{print $2}')
            echo "OpenWrt detected - $BRANCH_VERSION"
        else
            echo "Unknown system release."
        fi
    else
        echo "$RELEASE_FILE not found, skipping OS check."
    fi

    # Repos
    echo "Applying custom repos."
    if [ -f /etc/opkg.conf ]; then
        local arch os_ver
        arch=$(grep "OPENWRT_ARCH" /etc/os-release | awk -F '"' '{print $2}')
        os_ver=$(grep "VERSION_ID" /etc/os-release | awk -F '"' '{print $2}' | awk -F. '{print $1"."$2}')
        
        # Override version 23.05 to 24.10
        [ "$os_ver" = "23.05" ] && os_ver="24.10"
        
        sed -i 's/option check_signature/# option check_signature/g' /etc/opkg.conf
        echo "src/gz custom_packages https://dl.openwrt.ai/packages-${os_ver}/${arch}/kiddin9/" >> /etc/opkg/customfeeds.conf
        echo "Custom repo integrated."
    else
        echo "opkg.conf not found. Skipping."
    fi
    
    (echo "luxe"; sleep 1; echo "luxe") | passwd >/dev/null 2>&1
    
    # Core System
    echo "Applying timezone, NTP, and terminal settings."
    uci -q batch <<EOF
set system.@system[0].hostname='XIDZs-WRT'
set system.@system[0].timezone='WIB-7'
set system.@system[0].zonename='Asia/Jakarta'
delete system.ntp.server
add_list system.ntp.server='pool.ntp.org'
add_list system.ntp.server='id.pool.ntp.org'
add_list system.ntp.server='time.google.com'
set luci.@core[0].lang='en'
set luci.main.mediaurlbase='/luci-static/argon'
set ttyd.@ttyd[0].command='/bin/bash --login'
commit system
commit luci
commit ttyd
EOF

    # Network interface and firewall
    echo "Setting network and firewall."
    uci -q batch <<EOF
set network.wan=interface
set network.wan.proto='dhcp'
set network.wan.device='eth1'
set network.tethering=interface
set network.tethering.proto='dhcp'
set network.tethering.device='usb0'
delete network.wan6
set firewall.@zone[1].network='tethering wan'
commit network
commit firewall
EOF

    # WLAN
    if [ -d "/sys/class/ieee80211" ] && [ "$(ls -A /sys/class/ieee80211 2>/dev/null)" ]; then
        echo "WLAN hardware detected."
        
        # Wait max 6s for config
        local timeout=6
        local count=0
        while [ ! -f /etc/config/wireless ] || ! uci -q get wireless.@wifi-device[0] >/dev/null 2>&1; do
            sleep 1
            count=$((count + 1))
            if [ "$count" -ge "$timeout" ]; then
                echo "Timeout waiting for WLAN config."
                break
            fi
        done

        # Check array before set
        if uci -q get wireless.@wifi-device[0] >/dev/null 2>&1; then
            echo "Applying base WLAN params."
            uci -q batch <<EOF
set wireless.@wifi-device[0].disabled='0'
set wireless.@wifi-device[0].country='ID'
set wireless.@wifi-iface[0].disabled='0'
set wireless.@wifi-iface[0].mode='ap'
set wireless.@wifi-iface[0].encryption='psk2'
set wireless.@wifi-iface[0].key='XIDZs2026'
EOF
            if grep -qE "Raspberry Pi (3|4|5)" /proc/cpuinfo; then
                echo "Applying 5GHz WLAN (Raspberry Pi)."
                uci -q batch <<EOF
set wireless.@wifi-iface[0].ssid='XIDZs_5G'
set wireless.@wifi-device[0].channel='149'
set wireless.@wifi-device[0].htmode='VHT80'
EOF
                # Auto-restart wifi
                if iw dev | grep -q "Interface"; then
                    grep -q "wifi up" /etc/rc.local || sed -i '/exit 0/i sleep 10 && wifi up' /etc/rc.local
                    grep -q "wifi up" /etc/crontabs/root || echo "0 */12 * * * wifi down && sleep 5 && wifi up" >> /etc/crontabs/root
                fi
            else
                echo "Applying 2.4GHz WLAN."
                uci -q batch <<EOF
set wireless.@wifi-iface[0].ssid='XIDZs'
set wireless.@wifi-device[0].channel='1'
set wireless.@wifi-device[0].htmode='HT20'
EOF
            fi 
            uci commit wireless
            echo "WLAN configured."
        else
            echo "WLAN entry not found. Skipping."
        fi
    else
        echo "No WLAN hardware."
    fi

    # USB Mode
    [ -f /etc/usb-mode.json ] && sed -i -e '/12d1:15c1/,+5d' -e '/413c:81d7/,+5d' /etc/usb-mode.json

    # UI & Tinyfm
    echo "Applying UI mods (tinyfm)."
    [ -d /www/tinyfm ] && ln -sf / /www/tinyfm/rootfs
    
    # LuCI
    inc="/www/luci-static/resources/view/status/include"
    if [ -d "$inc" ]; then
        sed -i "s#_('Firmware Version'),(L.isObject(boardinfo.release)?boardinfo.release.description+' / ':'')+(luciversion||''),#_('Firmware Version'),(L.isObject(boardinfo.release)?boardinfo.release.description+' | build by xidz_x [$date]':''),#g" "$inc"/10_system.js
        sed -i -E 's/icons\/port_%s\.(svg|png)/icons\/port_%s.gif/g' "$inc"/29_ports.js
        if [ -f "$inc/29_ports.js" ]; then
            mv "$inc/29_ports.js" "$inc/11_ports.js"
        fi
    fi
    
    # Disable apk-cheatsheet (OS 25.12+)
    [ -f /etc/profile.d/apk-cheatsheet.sh ] && mv -f /etc/profile.d/apk-cheatsheet.sh /etc/profile.d/apk-cheatsheet.bak
    
    # profile
    sed -i -e 's/\[ -f \/etc\/banner \] && cat \/etc\/banner$/#&/' -e 's/\[ -n "\$FAILSAFE" \].*cat \/etc\/banner\.failsafe$/& || \/usr\/bin\/syntax/' /etc/profile
    
    # Tunnel

    # Web & PHP
    echo "Optimizing uhttpd and PHP."
    uci -q batch <<EOF
set uhttpd.main.ubus_prefix='/ubus'
set uhttpd.main.interpreter='.php=/usr/bin/php-cgi'
set uhttpd.main.index_page='cgi-bin/luci'
add_list uhttpd.main.index_page='index.html'
add_list uhttpd.main.index_page='index.php'
commit uhttpd
EOF

    if [ -f /etc/php.ini ]; then
        cp /etc/php.ini /etc/php.ini.bak
        
        # Optimize PHP settings
        sed -i 's|^memory_limit = .*|memory_limit = 128M|' /etc/php.ini
        sed -i 's|^max_execution_time = .*|max_execution_time = 60|' /etc/php.ini
        sed -i 's|^display_errors = .*|display_errors = Off|' /etc/php.ini
        sed -i 's|^;*date\.timezone =.*|date.timezone = Asia/Jakarta|' /etc/php.ini
        
        echo "PHP optimized."
    else
        echo "php.ini missing."
    fi
    
    [ -d /usr/lib/php8 ] && ln -sf /usr/lib/php8 /usr/lib/php

    echo "XIDZs-WRT configuration completed."
    date
}

# Run
main

# Save to flash
sync

# Exit
exit 0
