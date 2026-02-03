#!/bin/sh

TTL_FILE="/etc/nftables.d/ttl67.nft"
QUENX_LUA="/usr/lib/lua/luci/controller/quenx/quenx.lua"
PAGE_HTM="/usr/lib/lua/luci/view/quenx/page.htm"

hapus_jika_ada() {
    local file_path="$1"
    if [ -e "$file_path" ]; then
        echo "Removing existing file: $file_path"
        rm -f "$file_path"
    fi
}

hapus_jika_ada "$TTL_FILE"
hapus_jika_ada "$QUENX_LUA"
hapus_jika_ada "$PAGE_HTM"

buat_file_ttl() {
    local ttl_value="$1"
    echo "Creating $TTL_FILE with TTL value: $ttl_value"
    mkdir -p "$(dirname "$TTL_FILE")"
    cat <<EOL > "$TTL_FILE"
chain mangle_postrouting_ttl67 {
    type filter hook postrouting priority 300; policy accept;
    counter ip ttl set $ttl_value
}
chain mangle_prerouting_ttl67 {
    type filter hook prerouting priority 300; policy accept;
    counter ip ttl set $ttl_value
}
EOL
}

buat_quenx_lua() {
    echo "Creating $QUENX_LUA"
    mkdir -p "$(dirname "$QUENX_LUA")"
    cat <<'EOL' > "$QUENX_LUA"
module("luci.controller.quenx.quenx", package.seeall)

function index()
    entry({"admin", "network", "quenx"}, call("render_page"), _("Fix TTL"), 100).leaf = true
end

function get_current_ttl()
    local output = luci.sys.exec("nft list chain inet fw4 mangle_postrouting_ttl67 2>/dev/null")
    if output and output:match("ip ttl set (%d+)") then
        return tonumber(output:match("ip ttl set (%d+)"))
    end
    return nil
end

function is_ttl_enabled()
    local output = luci.sys.exec("nft list chain inet fw4 mangle_postrouting_ttl67 2>/dev/null")
    return output and output:match("ip ttl set") ~= nil
end

function set_ttl(new_ttl)
    local ttl_file = "/etc/nftables.d/ttl67.nft"
    local ttl_rule = string.format([[
chain mangle_postrouting_ttl67 {
    type filter hook postrouting priority 300; policy accept;
    counter ip ttl set %d
}
chain mangle_prerouting_ttl67 {
    type filter hook prerouting priority 300; policy accept;
    counter ip ttl set %d
}
]], new_ttl, new_ttl)

    local f = io.open(ttl_file, "w")
    if f then
        f:write(ttl_rule)
        f:close()
    end

    luci.sys.call("nft -f " .. ttl_file)
    luci.sys.call("/etc/init.d/firewall restart")
end

function disable_ttl()
    local ttl_file = "/etc/nftables.d/ttl67.nft"
    
    luci.sys.call("nft delete chain inet fw4 mangle_postrouting_ttl67 2>/dev/null")
    luci.sys.call("nft delete chain inet fw4 mangle_prerouting_ttl67 2>/dev/null")
    
    local f = io.open(ttl_file, "w")
    if f then
        f:write("")
        f:close()
    end
    
    luci.sys.call("/etc/init.d/firewall restart")
end

function enable_ttl(ttl_value)
    ttl_value = ttl_value or 65
    set_ttl(ttl_value)
end

function render_page()
    local http = require "luci.http"
    local sys = require "luci.sys"
    local tpl = require "luci.template"
    local dispatcher = require "luci.dispatcher"

    local current_ttl = get_current_ttl()
    local ttl_enabled = is_ttl_enabled()

    local action = http.formvalue("action")
    local ttl_value = http.formvalue("ttl_value")
    
    if action == "set_ttl" and ttl_value then
        ttl_value = tonumber(ttl_value)
        if ttl_value and ttl_value >= 1 and ttl_value <= 255 then
            set_ttl(ttl_value)
            current_ttl = ttl_value
            ttl_enabled = true
        end
    elseif action == "disable_ttl" then
        disable_ttl()
        current_ttl = nil
        ttl_enabled = false
    elseif action == "enable_ttl" then
        local enable_ttl_value = tonumber(ttl_value) or current_ttl or 65
        enable_ttl(enable_ttl_value)
        current_ttl = enable_ttl_value
        ttl_enabled = true
    end

    tpl.render("quenx/page", {
        current_ttl = current_ttl or "N/A",
        ttl_value = ttl_value or current_ttl or 65,
        ttl_enabled = ttl_enabled
    })
end
EOL
}

buat_page_htm() {
    echo "Creating $PAGE_HTM"
    mkdir -p "$(dirname "$PAGE_HTM")"
    cat <<'EOL' > "$PAGE_HTM"
<%+header%>

<h2>Fix TTL</h2>

<% if ttl_enabled then %>
    <div class="cbi-section">
        <h3 style="color: green;">Status: ON</h3>
    </div>
<% else %>
    <div class="cbi-section">
        <h3 style="color: red;">Status: OFF</h3>
    </div>
<% end %>

<form method="post">
    <div class="cbi-section">
        <label for="ttl_value">Enter TTL Value:</label>
        <input type="number" id="ttl_value" name="ttl_value" min="1" max="255" value="<%= ttl_value %>" required>
    </div>
    <div class="cbi-section" style="display: flex; gap: 10px; align-items: center;">
        <button class="cbi-button cbi-button-apply" type="submit" name="action" value="set_ttl">
            Set TTL
        </button>
        <% if ttl_enabled then %>
            <button class="cbi-button cbi-button-negative" type="submit" name="action" value="disable_ttl">
                Disable
            </button>
        <% else %>
            <button class="cbi-button cbi-button-positive" type="submit" name="action" value="enable_ttl">
                Enable
            </button>
        <% end %>
    </div>
</form>

<div class="cbi-section">
    <p><small>By Quenx | TTL Range: 1-200</small></p>
</div>

<%+footer%>
EOL
}

TTL_VALUE="${1:-65}"

buat_file_ttl "$TTL_VALUE"
buat_quenx_lua
buat_page_htm

echo "All files created successfully"

rm -- "$0"
