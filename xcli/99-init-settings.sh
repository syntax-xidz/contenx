#!/bin/sh

# Setup log
exec >> "/root/setup-xidzswrt.log" 2>&1

main() {
    date
    echo "Initialization: Starting the XIDZs-WRT system configuration process."

    # System & Auth
    echo "Configuration: Setting up system identity and root administrator password."
    if [ -f /etc/openwrt_release ]; then
        local os_desc
        os_desc=$(grep 'DISTRIB_DESCRIPTION=' /etc/openwrt_release | awk -F"'" '{print $2}')
        echo "Information: Operating system successfully detected as $os_desc."
        sed -i -E 's/(DISTRIB_DESCRIPTION=.)(ImmortalWrt|OpenWrt) ([0-9.]+.*.)/\1\3/g' /etc/openwrt_release
    fi
    (echo "quenx"; sleep 1; echo "quenx") | passwd >/dev/null 2>&1

    # Repos
    echo "Configuration: Checking and applying custom package repositories."
    if [ -f /etc/opkg.conf ]; then
        local arch
        arch=$(grep "OPENWRT_ARCH" /etc/os-release | awk -F '"' '{print $2}')
        sed -i 's/option check_signature/# option check_signature/g' /etc/opkg.conf
        echo "src/gz custom_packages https://dl.openwrt.ai/latest/packages/${arch}/kiddin9" >> /etc/opkg/customfeeds.conf
        echo "Success: Custom package repository has been successfully integrated."
    else
        echo "Skipping: The opkg.conf file was not found on the system."
    fi

    # Core System
    echo "Configuration: Applying core system settings including timezone, NTP, and terminal options."
    uci -q batch <<EOF
set system.@system[0].hostname='XIDZs-WRT'
set system.@system[0].timezone='WIB-7'
set system.@system[0].zonename='Asia/Jakarta'
delete system.ntp.server
add_list system.ntp.server='pool.ntp.org'
add_list system.ntp.server='id.pool.ntp.org'
add_list system.ntp.server='time.google.com'
set luci.@core[0].lang='en'
set luci.main.mediaurlbase='/luci-static/luxe'
set ttyd.@ttyd[0].command='/bin/bash --login'
commit system
commit luci
commit ttyd
EOF

    # Network
    echo "Configuration: Setting up network interfaces and firewall zones."
    uci -q batch <<EOF
set network.wan=interface
set network.wan.proto='dhcp'
set network.wan.device='eth1'
set network.tethering=interface
set network.tethering.proto='dhcp'
set network.tethering.device='usb0'
set network.mm=interface
set network.mm.proto='modemmanager'
set network.mm.device='/sys/devices/platform/scb/fd500000.pcie/pci0000:00/0000:00:00.0/0000:01:00.0/usb2/2-1'
set network.mm.apn='internet'
set network.mm.auth='none'
set network.mm.iptype='ipv4'
delete network.wan6
set firewall.@zone[1].network='tethering wan mm'
commit network
commit firewall
EOF

    # USB Mode
    [ -f /etc/usb-mode.json ] && sed -i -e '/12d1:15c1/,+5d' -e '/413c:81d7/,+5d' /etc/usb-mode.json

    # UI & Tinyfm
    echo "Configuration: Applying user interface modifications tinyfm."
    [ -d /www/tinyfm ] && ln -sf / /www/tinyfm/rootfs
    
    # LuCI status
    local inc="/www/luci-static/resources/view/status/include"
    if [ -d "$inc" ]; then
        sed -i "s#_('Firmware Version'),(L.isObject(boardinfo.release)?boardinfo.release.description+' / ':'')+(luciversion||''),#_('Firmware Version'),(L.isObject(boardinfo.release)?boardinfo.release.description+' | xidz_x':''),#g" "$inc/10_system.js"
        sed -i -E 's/icons\/port_%s\.(svg|png)/icons\/port_%s.gif/g' "$inc/29_ports.js"
        [ -f "$inc/29_ports.js" ] && mv "$inc/29_ports.js" "$inc/11_ports.js"
    fi
    
    # Disable apk-cheatsheet Os 25.12
    [ -f /etc/profile.d/apk-cheatsheet.sh ] && mv -f /etc/profile.d/apk-cheatsheet.sh /etc/profile.d/apk-cheatsheet.bak
    
    # Terminal profile
    sed -i -e 's/\[ -f \/etc\/banner \] && cat \/etc\/banner$/#&/' -e 's/\[ -n "\$FAILSAFE" \].*cat \/etc\/banner\.failsafe$/& || \/usr\/bin\/syntax/' /etc/profile
    
    # Tunnel

    # Web & PHP
    echo "Configuration: Configuring uhttpd web server and optimizing PHP parameters."
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
        sed -i \
            -e 's|^memory_limit = .*|memory_limit = 128M|' \
            -e 's|^max_execution_time = .*|max_execution_time = 60|' \
            -e 's|^display_errors = .*|display_errors = Off|' \
            -e 's|^;*date\.timezone =.*|date.timezone = Asia/Jakarta|' \
            /etc/php.ini
        echo "Success: PHP performance parameters have been successfully optimized."
    else
        echo "Skipping: The php.ini configuration file is missing."
    fi
    [ -d /usr/lib/php8 ] && ln -sf /usr/lib/php8 /usr/lib/php

    echo "Initialization: The XIDZs-WRT system configuration has completed successfully."
    date
}

# Run
main

# Save to flash
sync

# Exit
exit 0