const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const body = document.body;
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');
const devicesBtn = document.getElementById('devicesBtn');
const featuresBtn = document.getElementById('featuresBtn');
const aboutBtn = document.getElementById('aboutBtn');
const previewContent = document.getElementById('previewContent');
const devicesContent = document.getElementById('devicesContent');
const featuresContent = document.getElementById('featuresContent');
const aboutContent = document.getElementById('aboutContent');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxTitle = document.getElementById('lightboxTitle');

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
});

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

document.addEventListener('dblclick', function(e) {
    e.preventDefault();
});

function lockScroll() {
    body.style.paddingRight = (window.innerWidth - document.documentElement.clientWidth) + 'px';
    body.classList.add('menu-open');
}

function unlockScroll() {
    body.style.paddingRight = '';
    body.classList.remove('menu-open');
}

menuToggle.addEventListener('click', function() {
    const isActive = menuToggle.classList.toggle('active');
    sideMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    isActive ? lockScroll() : unlockScroll();
});

overlay.addEventListener('click', function() {
    menuToggle.classList.remove('active');
    sideMenu.classList.remove('active');
    overlay.classList.remove('active');
    unlockScroll();
});

document.querySelectorAll('.side-menu a').forEach(link => {
    link.addEventListener('click', function() {
        menuToggle.classList.remove('active');
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
        unlockScroll();
    });
});

const contentData = {
    preview: {
        items: [
            { title: 'XDEV Tools', image: '../asset/xdev_tools.png' },
            { title: 'Tema AlphaOs', image: '../asset/alpha.png' },
            { title: 'Tema Argon Light', image: '../asset/argon_light.png' },
            { title: 'Tema Argon Dark', image: '../asset/argon_dark.png' },
            { title: 'Tema Argon Glass', image: '../asset/argon_glass.png' },
            { title: 'Netmonitor Dark', image: '../asset/netmon_dark.png' },
            { title: 'Netmonitor Light', image: '../asset/netmon_light.png' },
            { title: 'Netmonitor Glass', image: '../asset/netmon_glass.png' },
            { title: 'Openclash', image: '../asset/openclash.png' },
            { title: 'Nikki', image: '../asset/nikki.png' },
            { title: 'Passwall', image: '../asset/passwall.png' },
            { title: 'Login Glass', image: '../asset/login_glass.png' },
            { title: 'Login Gradien', image: '../asset/login_gradien.png' },
            { title: 'Login Light', image: '../asset/login_light.png' },
            { title: 'Login Liquid', image: '../asset/login_liquid.png' },
            { title: 'Login Dark', image: '../asset/login_dark.png' },
            { title: 'Login Neon', image: '../asset/login_neon.png' },
            { title: 'Login Matrix', image: '../asset/login_matrix.png' },
            { title: 'Login Curve', image: '../asset/login_curve.png' },
            { title: 'Login Ocean', image: '../asset/login_ocean.png' },
            { title: 'Login Pulse', image: '../asset/login_pulse.png' }         
        ]
    },
    devices: {
        items: [
            { title: 'Amlogic s905 Series', list: ['Amlogic s905 MXQ-Pro+', 'Amlogic s905 Beelink-Mini', 'Amlogic s905lb Q96-Mini', 'Amlogic s905w TX3-Mini', 'Amlogic s905w X96-Mini', 'Amlogic s905w X96W', 'Amlogic s905x B860H', 'Amlogic s905x HG680P'] },
            { title: 'Amlogic s905x2 Series', list: ['Amlogic s905x2 B860Hv5', 'Amlogic s905x2 HG680-FJ', 'Amlogic s905x2 X96Max-v2Gb', 'Amlogic s905x2 X96Max-v4Gb'] },
            { title: 'Amlogic s905x3 Series', list: ['Amlogic s905x3 HK1-Vontar-X3', 'Amlogic s905x3 X96Air_100Mb', 'Amlogic s905x3 X96Air_1Gb', 'Amlogic s905x3 X96Max+_100Mb', 'Amlogic s905x3 X96Max+_1Gb', 'Amlogic s905x3 H96-Max-X3'] },
            { title: 'Amlogic Other Series', list: ['Amlogic s905x4 Ax810', 'Amlogic s905x4 Advan-At01', 'Amlogic s912 Nexbox-A1-A95X', 'Amlogic s912 Nexbox-A95X-A2', 'Amlogic s922x GT-King-Pro'] },
            { title: 'Orange Pi Series', list: ['Orange Pi Pc 2', 'Orange Pi R1 Plus', 'Orange Pi R1 Plus LTS', 'Orange Pi 3B', 'Orange Pi 5B', 'Orange Pi 5 Plus', 'Orange Pi Zero Plus', 'Orange Pi Zero Plus 2', 'Orange Pi 3', 'Orange Pi 3 LTS', 'Orange Pi Zero 2', 'Orange Pi Zero 3'] },
            { title: 'Raspberry Pi Series', list: ['Raspberry Pi B', 'Raspberry Pi 2B', 'Raspberry Pi 3B', 'Raspberry Pi 4B', 'Raspberry Pi 5B'] },
            { title: 'Nanopi Series', list: ['Nanopi-r2c', 'Nanopi-r2c Plus', 'Nanopi-r2s', 'Nanopi-r2s Plus', 'Nanopi-r3s', 'Nanopi-r4s', 'Nanopi-r5s'] },
            { title: 'Rockchip Series', list: ['Rk3318-BOX', 'Firefly-Rk3328', 'Rk3399-King3399', 'Rk3566-Panther-X2', 'Rk3588-Rock5B', 'Rk3576-NanoPi M5', 'Rk3528-H96 Max-M2'] },
            { title: 'X86 Series', list: ['X86-Generic', 'X86-64'] }
        ]
    },
    features: {
        items: [
            { title: 'Fitur - Fitur', list: ['Tema Argon', 'Amlogic Service ( Amlogic Devices )', '3ginfo-Lite ⨯ Modeminfo ⨯ IP Information', 'Fix TTL ⨯ Tailscale ⨯ Netmonitor', 'Eqosplus ⨯ Droidnet ⨯ File manager', 'GPIO LED Support', 'MODSDCARD Support HG680P - B860H', 'Tersedia WIFI ON | OFF HG680P - B860H', 'Versi WIFION - Kernel Stable', 'Versi WIFIOFF - Kernel Flippy', 'Internet Detector ⨯ Connection Monitor', 'XDEV Script Tools ⨯ XIDZs Bot Monitoring', 'Configurasi Openclash ⨯ Nikki', 'Configurasi Insomclash ⨯ Passwall'] },
            { title: 'Khusus Amlogic Devices Tertentu', list: ['Kernel Versi 5.15.x - 5.4.x', 'Kernel Versi 6.1.x - 6.2.x', 'Kernel Versi 6.3.x - 6.4.x', 'Kernel Versi 6.6.x - 6.12.x'] },
            { title: 'Tunnel Options', list: ['OpenClash', 'OpenClash + Nikki', 'Openclash + Insomclash', 'OpenClash + Nikki + Passwall', 'No Tunnel'] }
        ]
    },
    about: {
        items: [
            { 
                title: 'Tentang XIDZs-WRT', 
                description: 'XIDZs-WRT Adalah Sebuah Firmware Custom Yang Dikembangkan Untuk Komunitas Openwrt Indonesia. Project Ini Bertujuan Untuk Memberikan Pengalaman Networking Yang Lebih Baik Dengan Fitur-Fitur Yang Disesuaikan Dengan Kebutuhan Pengguna, Jangan Lupa Feedbacknya, Terimakasih.' 
            }
        ]
    }
};

async function getFirmwareCount() {
    try {
        const apiURLs = ["../silent.json", "../silent1.json", "../silent2.json", "../silent3.json"];
        
        const promises = apiURLs.map(async url => {
            try {
                const response = await fetch(url, { cache: "no-cache" });
                if (!response.ok) return 0;
                
                const base64Content = await response.text();
                const decodedContent = atob(base64Content.trim());
                const releases = JSON.parse(decodedContent);
                
                let count = 0;
                if (releases && Array.isArray(releases)) {
                    releases.forEach(rel => {
                        if (rel.assets && rel.assets.length > 0) {
                            count += rel.assets.filter(asset => 
                                asset.name && 
                                asset.name.match(/\.(img|bin|gz|tar|zip|xz|7z|img\.gz|tar\.gz|tar\.xz|bin\.gz|bz2)$/i) &&
                                !asset.name.toLowerCase().includes("rootfs")
                            ).length;
                        }
                    });
                }
                return count;
            } catch (err) {
                return 0;
            }
        });
        
        const results = await Promise.all(promises);
        return results.reduce((total, count) => total + count, 0);
    } catch (error) {
        return 0;
    }
}

async function updateFirmwareCountFromAPI() {
    const firmwareCountElement = document.getElementById('firmwareCount');
    if (firmwareCountElement) {
        firmwareCountElement.textContent = '99999';
        
        setTimeout(async () => {
            const count = await getFirmwareCount();
            if (count > 0 && count !== 99999) {
                firmwareCountElement.textContent = count;
            }
        }, 100);
    }
}

window.openLightbox = function(src, title) {
    lightboxImage.src = src;
    lightboxTitle.textContent = title;
    lightbox.classList.add('active');
    lockScroll();
};

function closeLightbox() {
    lightbox.classList.remove('active');
    unlockScroll();
    setTimeout(() => {
        lightboxImage.src = '';
        lightboxTitle.textContent = '';
    }, 200);
}

lightbox.addEventListener('click', closeLightbox);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (lightbox.classList.contains('active')) closeLightbox();
        if (sideMenu.classList.contains('active')) menuToggle.click();
    }
});

function closeAllContents() {
    previewContent.classList.remove('active');
    devicesContent.classList.remove('active');
    featuresContent.classList.remove('active');
    aboutContent.classList.remove('active');
}

function toggleContent(contentElement, dataType) {
    const isCurrentlyActive = contentElement.classList.contains('active');
    
    closeAllContents();
    
    if (!isCurrentlyActive) {
        let html = '';
        if (dataType === 'preview') {
            contentData[dataType].items.forEach(item => {
                html += `<div class="detail-item"><h3>${item.title}</h3><img src="${item.image}" alt="${item.title}" class="preview-image" loading="lazy" onclick="openLightbox('${item.image}')"></div>`;
            });
        } else if (dataType === 'about') {
            contentData[dataType].items.forEach(item => {
                html += `<div class="detail-item"><h3>${item.title}</h3><p>${item.description}</p></div>`;
            });
        } else {
            contentData[dataType].items.forEach(item => {
                html += `<div class="detail-item"><h3>${item.title}</h3><ul>${item.list.map(li => `<li>${li}</li>`).join('')}</ul></div>`;
            });
        }
        contentElement.innerHTML = html;
        contentElement.classList.add('active');
    }
}

downloadBtn.addEventListener('click', () => {
    sessionStorage.setItem('loginAccess', 'true');
    window.location.href = '../login';
});

previewBtn.addEventListener('click', () => toggleContent(previewContent, 'preview'));
devicesBtn.addEventListener('click', () => toggleContent(devicesContent, 'devices'));
featuresBtn.addEventListener('click', () => toggleContent(featuresContent, 'features'));
aboutBtn.addEventListener('click', () => toggleContent(aboutContent, 'about'));

function maskIP(ip) {
    if (!ip || ip === 'N/A') return ip;
    const parts = ip.split('.');
    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.xx.xx`;
    }
    return ip;
}

document.getElementById('ipDisplay').addEventListener('click', function() {
    const ipValue = document.getElementById('ipValue');
    const fullIP = ipValue.dataset.fullip || ipValue.textContent;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullIP).then(() => {
            const originalText = ipValue.textContent;
            ipValue.textContent = 'Copied!';
            setTimeout(() => {
                ipValue.textContent = originalText;
            }, 1000);
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = fullIP;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                const originalText = ipValue.textContent;
                ipValue.textContent = 'Copied!';
                setTimeout(() => {
                    ipValue.textContent = originalText;
                }, 1000);
            } catch (err) {
                console.error('Copy failed');
            }
            document.body.removeChild(textarea);
        });
    }
});

async function fetchIPInfo() {
    const els = { 
        ip: document.getElementById('ipValue'), 
        country: document.getElementById('countryValue'), 
        city: document.getElementById('cityValue'), 
        provider: document.getElementById('providerValue') 
    };
    [
        document.getElementById('ipDisplay'), 
        document.getElementById('countryDisplay'), 
        document.getElementById('cityDisplay'), 
        document.getElementById('providerDisplay')
    ].forEach(el => el.classList.add('loading'));
    
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        await new Promise(r => setTimeout(r, 500));
        
        const fullIP = data.ip || 'N/A';
        els.ip.dataset.fullip = fullIP;
        els.ip.textContent = maskIP(fullIP);
        
        els.country.textContent = data.country_name || 'N/A';
        els.city.textContent = data.city || 'N/A';
        els.provider.textContent = data.org || 'N/A';
    } catch (error) {
        Object.values(els).forEach(el => el.textContent = 'Error');
        setTimeout(() => Object.values(els).forEach(el => el.textContent = 'Unavailable'), 2000);
    }
    
    [
        document.getElementById('ipDisplay'), 
        document.getElementById('countryDisplay'), 
        document.getElementById('cityDisplay'), 
        document.getElementById('providerDisplay')
    ].forEach(el => el.classList.remove('loading'));
}

window.addEventListener('load', () => {
    fetchIPInfo();
    updateFirmwareCountFromAPI();
});
