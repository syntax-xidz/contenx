const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loading = document.getElementById('loading');
const notification = document.getElementById('notification');
const notifText = document.getElementById('notifText');
const progressBar = document.getElementById('progressBar');
const togglePassword = document.getElementById('togglePassword');

let attemptCount = 0;
let isLocked = false;
let lockTimer = null;

if (!sessionStorage.getItem('loginAccess')) {
    window.location.href = '../home';
} else {
    sessionStorage.removeItem('loginAccess');
}

function getStorageData(key) {
    try {
        return localStorage.getItem(key) || sessionStorage.getItem(key);
    } catch (e) {
        return sessionStorage.getItem(key);
    }
}

function setStorageData(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        sessionStorage.setItem(key, value);
    }
}

const validationRules = {
    minLength: 4,
    maxAttempts: 4,
    normalLockDuration: 60000,
    profanityLockDuration: 780000,
    minPasswords: 1,
    maxPasswords: 1
};

function removeStorageData(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        sessionStorage.removeItem(key);
    }
}

attemptCount = parseInt(getStorageData('attemptCount')) || 0;

const prohibitedTerms = ['616e6a696e67','6d6f6e796574','6261626920','746f6c6f6c','6e616a6973','626f67','676f626c6f6b','746169','62616e67736174','7369616c616e','6261686c696c','736574616e','69626c6973','6b65686574','63656c656e67','6d656d656b','6b6f6e746f6c','6974696c','6c6f6e7465','70656c6572'];

function decodeHex(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function checkProhibitedWords(inputText) {
    const lowerInput = inputText.toLowerCase();
    return prohibitedTerms.some(hex => lowerInput.includes(decodeHex(hex)));
}

function calculateValidIndex(seed, multiplier, offset, maxLength) {
    return Math.floor((seed * multiplier + offset) % maxLength);
}

function initializeAccessKeys() {
    const keyVault = ['49534C414D', '414C4C4148', '48414A49', '444F4E415349', '5A414B4154', '52414B4154', '544155422', '5441484A5544', '44554141', '494D414E', '444F4E415445', '5441515741', '544157514', '494854414153', '494B48544952', '53594B5552', '544157424548', '4B4142414820', '4D4144494E4148', '4D41534A4944', '5155524E', '53484F4C4154', '505541534120', '534544454B4148', '49445541444841', '4B48555442414820', '494D414D', '4D5541445A494E', '494E444F4E45534941', '4A415741', '42415441564941', '4A414B41525441', '53554B41524E4F', '4841545441', '47415255444120', '42494E4E454B41', '4E5553414E544152412020', '47414D454C414E', '574159414E47', '4B45524953', '4241544B', '474F544F4E47', '42414E475341', '4D4552444B41', '50414E434153494C41', '54554E4747414C', '554E495459', '424F524F425544555220', '5052414D42414E414E', '42414C49', '53554D41544552412020', '4B414C494D414E54414E', '53554C4157455349', '5041505541', '4D414C554B55', '4A4F474A41', '42414E44554E47', '535552414241594120', '4D4544414E', '53454D4152414E47', '4D414B4153534152', '50414C454D42414E47', '424F474F52', '534F4C4F', '4D414C414E47', '42454B415349', '54414E474552414E47', '44455057', '5241484D4154', '42455242554B41', '534148555220', '5441524157494820', '4C41494C41545551414452', '464954524148', '53554E4E4148', '48414449545320', '554C414D41', '53414E545249'];
    
    const idx1 = calculateValidIndex(2, 1, 1, 79);
    const idx2 = calculateValidIndex(5, 2, 0, 79);
    const idx3 = calculateValidIndex(7, 3, 2, 79);
    
    const validAccessKeys = [keyVault[idx1], keyVault[idx2], keyVault[idx3]];
    
    const shuffled = validAccessKeys.sort(() => 0.5 - Math.random());
    const selectedCount = Math.floor(Math.random() * (validationRules.maxPasswords - validationRules.minPasswords + 1)) + validationRules.minPasswords;
    
    return shuffled.slice(0, selectedCount);
}

function resetAccessKeys() {
    const newActiveKeys = initializeAccessKeys();
    setStorageData('activePasswords', JSON.stringify(newActiveKeys));
    return newActiveKeys;
}

let activeAccessKeys;
const storedKeys = getStorageData('activePasswords');
if (storedKeys) {
    activeAccessKeys = JSON.parse(storedKeys);
} else {
    activeAccessKeys = initializeAccessKeys();
    setStorageData('activePasswords', JSON.stringify(activeAccessKeys));
}

function checkButtonState() {
    if (passwordInput && loginBtn) {
        if (passwordInput.value.trim().length > 0 && !isLocked) {
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';
            loginBtn.style.cursor = 'pointer';
        } else {
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.5';
            loginBtn.style.cursor = 'not-allowed';
        }
    }
}

passwordInput.addEventListener('input', function() {
    passwordInput.classList.remove('input-error', 'input-success');
    checkButtonState();
});

togglePassword.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const currentType = passwordInput.getAttribute('type');
    const newType = currentType === 'password' ? 'text' : 'password';
    
    passwordInput.setAttribute('type', newType);
    this.textContent = newType === 'password' ? '○' : '●';
    
    this.style.transform = 'translateY(-50%) scale(0.8)';
    setTimeout(() => {
        this.style.transform = 'translateY(-50%) scale(1)';
    }, 150);
    
    passwordInput.focus();
});

function showNotification(type, message) {
    notification.classList.remove('show', 'success', 'error');
    progressBar.classList.remove('success', 'error');
    
    progressBar.style.width = '0%';
    
    notification.className = `notification ${type}`;
    notifText.textContent = message;
    progressBar.className = `progress-bar ${type}`;
    
    notification.offsetHeight;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        progressBar.style.width = '100%';
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 400);
    }, 3000);
}

function showLoading(show) {
    if (show) {
        loginBtn.style.display = 'none';
        loading.style.display = 'block';
        passwordInput.disabled = true;
        togglePassword.style.pointerEvents = 'none';
        togglePassword.style.opacity = '0.5';
    } else {
        loginBtn.style.display = 'block';
        loading.style.display = 'none';
        passwordInput.disabled = false;
        togglePassword.style.pointerEvents = 'auto';
        togglePassword.style.opacity = '1';
        checkButtonState();
    }
}

function encodeUserInput(str) {
    return str.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase()).join('');
}

function getAllowedKeys() {
    return activeAccessKeys;
}

function verifyUserInput(encodedInput) {
    const allowedKeys = getAllowedKeys();
    return allowedKeys.includes(encodedInput);
}

function setCookie(name, value, minutes) {
    const date = new Date();
    date.setTime(date.getTime() + (minutes * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Strict";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function lockLogin(lockDuration, lockType) {
    isLocked = true;
    passwordInput.disabled = true;
    loginBtn.disabled = true;
    togglePassword.style.pointerEvents = 'none';
    togglePassword.style.opacity = '0.5';
    checkButtonState();
    
    const lockEndTime = Date.now() + lockDuration;
    setStorageData('lockEndTime', lockEndTime);
    setStorageData('lockType', lockType);
    setCookie('lockEndTime', lockEndTime, 10);
    setCookie('lockType', lockType, 10);
    setCookie('attemptCount', attemptCount, 10);
    
    if (lockType !== 'profanity') {
        attemptCount = 0;
        setStorageData('attemptCount', attemptCount);
    }
    
    updateLockTimer();
}

function updateLockTimer() {
    let lockEndTime = parseInt(getStorageData('lockEndTime'));
    let lockType = getStorageData('lockType');
    
    if (!lockEndTime) {
        lockEndTime = parseInt(getCookie('lockEndTime'));
        lockType = getCookie('lockType');
    }
    if (!lockEndTime) return;
    
    const now = Date.now();
    const remainingTime = Math.ceil((lockEndTime - now) / 1000);
    
    if (remainingTime > 0) {
        isLocked = true;
        passwordInput.disabled = true;
        loginBtn.disabled = true;
        togglePassword.style.pointerEvents = 'none';
        togglePassword.style.opacity = '0.5';
        checkButtonState();
        
        if (lockTimer) clearInterval(lockTimer);
        
        const lockMessage = `Terlalu banyak percobaan! Tunggu ${formatTime(remainingTime)}.`;
        
        notification.classList.remove('success');
        notification.classList.add('error', 'show');
        notifText.textContent = lockMessage;
        progressBar.classList.remove('success');
        progressBar.classList.add('error');
        progressBar.style.width = '100%';
        
        lockTimer = setInterval(() => {
            const now = Date.now();
            const remaining = Math.ceil((lockEndTime - now) / 1000);
            if (remaining > 0) {
                notifText.textContent = `Terlalu banyak percobaan! Tunggu ${formatTime(remaining)}.`;
            } else {
                clearInterval(lockTimer);
                lockTimer = null;
                isLocked = false;
                attemptCount = 0;
                passwordInput.disabled = false;
                loginBtn.disabled = false;
                togglePassword.style.pointerEvents = 'auto';
                togglePassword.style.opacity = '1';
                notification.classList.remove('show');
                removeStorageData('lockEndTime');
                removeStorageData('lockType');
                removeStorageData('attemptCount');
                deleteCookie('lockEndTime');
                deleteCookie('lockType');
                deleteCookie('attemptCount');
                
                activeAccessKeys = resetAccessKeys();
                checkButtonState();
                
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 400);
            }
        }, 1000);
    } else {
        isLocked = false;
        attemptCount = 0;
        passwordInput.disabled = false;
        loginBtn.disabled = false;
        togglePassword.style.pointerEvents = 'auto';
        togglePassword.style.opacity = '1';
        removeStorageData('lockEndTime');
        removeStorageData('lockType');
        removeStorageData('attemptCount');
        deleteCookie('lockEndTime');
        deleteCookie('lockType');
        deleteCookie('attemptCount');
        
        activeAccessKeys = resetAccessKeys();
        checkButtonState();
    }
}

window.addEventListener('load', function() {
    const cookieAttempt = getCookie('attemptCount');
    if (cookieAttempt) {
        attemptCount = parseInt(cookieAttempt);
    }
    updateLockTimer();
    checkButtonState();
});

loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (isLocked || passwordInput.value.trim().length === 0) {
        return;
    }
    
    const userInput = passwordInput.value.trim();
    
    if (checkProhibitedWords(userInput)) {
        showLoading(true);
        setTimeout(() => {
            passwordInput.classList.add('input-error');
            passwordInput.classList.remove('input-success');
            passwordInput.value = '';
            passwordInput.setAttribute('type', 'password');
            togglePassword.textContent = '○';
            
            activeAccessKeys = resetAccessKeys();
            
            showLoading(false);
            lockLogin(validationRules.profanityLockDuration, 'profanity');
        }, 1000);
        return;
    }
    
    const encodedInput = encodeUserInput(userInput);
    
    showLoading(true);
    setTimeout(() => {
        if (verifyUserInput(encodedInput)) {
            passwordInput.classList.add('input-success');
            passwordInput.classList.remove('input-error');
            attemptCount = 0;
            removeStorageData('attemptCount');
            removeStorageData('lockEndTime');
            removeStorageData('lockType');
            deleteCookie('attemptCount');
            deleteCookie('lockEndTime');
            deleteCookie('lockType');
            
            activeAccessKeys = resetAccessKeys();
            
            showNotification('success', 'Password benar! Mengalihkan...');
            
            setTimeout(() => {
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.href = '../dashboard';
            }, 1500);
        } else {
            attemptCount++;
            setStorageData('attemptCount', attemptCount);
            setCookie('attemptCount', attemptCount, 1);
            passwordInput.classList.add('input-error');
            passwordInput.classList.remove('input-success');
            passwordInput.value = '';
            passwordInput.setAttribute('type', 'password');
            togglePassword.textContent = '○';
            
            activeAccessKeys = resetAccessKeys();
            
            if (attemptCount >= validationRules.maxAttempts) {
                showLoading(false);
                lockLogin(validationRules.normalLockDuration, 'normal');
                return;
            }
            showNotification('error', 'Password salah! Silakan coba lagi.');
            setTimeout(() => {
                passwordInput.classList.remove('input-error');
            }, 3000);
        }
        showLoading(false);
    }, 1000);
});

passwordInput.addEventListener('focus', function() {
    this.style.transform = 'scale(1.02)';
});

passwordInput.addEventListener('blur', function() {
    this.style.transform = 'scale(1)';
});

document.addEventListener('DOMContentLoaded', function() {
    checkButtonState();
    passwordInput.focus();
    if (performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD) {
        passwordInput.value = '';
        passwordInput.setAttribute('type', 'password');
        togglePassword.textContent = '○';
        checkButtonState();
    }
});

passwordInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !isLocked && passwordInput.value.trim().length > 0) {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

passwordInput.addEventListener('paste', function(e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    if (pastedText && !isLocked) {
        this.value = pastedText.trim();
        this.dispatchEvent(new Event('input'));
    }
});

document.addEventListener('visibilitychange', function() {
    if (!document.hidden && passwordInput) {
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
    }
});

window.addEventListener('beforeunload', function() {
    if (passwordInput && passwordInput.value) {
        passwordInput.value = '';
    }
});

function preventRightClick() {
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
}

function preventDevTools() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.shiftKey && e.key === 'C') || (e.ctrlKey && e.key === 'U') || (e.ctrlKey && e.shiftKey && e.key === 'J')) {
            e.preventDefault();
            return false;
        }
    });
}

preventRightClick();
preventDevTools();

setInterval(function() {
    if (window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 200) {
        document.body.innerHTML = '<div style="text-align:center;margin-top:50vh;transform:translateY(-50%);font-family:Arial,sans-serif;color:#333;">Akses Terblokir</div>';
    }
}, 500);

window.addEventListener('focus', function() {
    if (passwordInput && !passwordInput.disabled) {
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (passwordInput && !passwordInput.disabled) {
                passwordInput.focus();
            }
        }, 200);
    });
} else {
    setTimeout(() => {
        if (passwordInput && !passwordInput.disabled) {
            passwordInput.focus();
        }
    }, 200);
}

const announcements = [
    "Selamat datang di XIDZs-WRT! Nikmati Firmware Custom Terbaik , Stabil , anti ribet , anti drama Tapi Boong wkwkwk | Jangan Lupa Senam Jari Dulu Yah...",
    "Ingatlah waktu sholat hari ini. Jangan sampai terlewatkan kewajiban kita kepada Allah SWT.",
    "Sedekah adalah investasi terbaik untuk akhirat. Mulailah dengan yang kecil, bahkan senyuman pun adalah sedekah.",
    "Mari donasi untuk sesama yang membutuhkan. Setiap rupiah yang kita donasikan akan menjadi pahala yang tidak terputus.",
    "Donate untuk kebaikan, karena harta yang kita bagikan tidak akan mengurangi rizki kita, justru akan melipatgandakannya.",
    "Kesabaran adalah kunci kesuksesan. Orang yang sabar akan mendapatkan hasil yang indah di akhir perjuangannya.",
    "Kesombongan adalah awal dari kejatuhan. Rendah hati dan tawadhu adalah jalan menuju kemuliaan sejati.",
    "Jagalah lisanmu dari perkataan buruk. Lisan yang terjaga adalah cerminan hati yang bersih dan pikiran yang jernih.",
    "Sabar dalam menghadapi ujian adalah tanda keimanan yang kuat. Allah bersama orang-orang yang sabar.",
    "Perkataan baik membawa kebaikan, perkataan buruk membawa keburukan. Pilihlah kata-kata dengan bijaksana."
];

let currentAnnouncementIndex = 0;
let announcementInterval;

function typeText(text, element, callback) {
    element.textContent = '';
    let index = 0;
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, 30);
        } else if (callback) {
            callback();
        }
    }
    
    type();
}

function showAnnouncement() {
    const announcement = document.getElementById('announcement');
    const typingText = document.getElementById('typingText');
    
    if (!announcement || !typingText) return;
    
    announcement.classList.remove('show');
    
    setTimeout(() => {
        typeText(announcements[currentAnnouncementIndex], typingText, () => {
            announcement.classList.add('show');
            
            setTimeout(() => {
                announcement.classList.remove('show');
                
                setTimeout(() => {
                    currentAnnouncementIndex = (currentAnnouncementIndex + 1) % announcements.length;
                    showAnnouncement();
                }, 1000);
            }, 5000);
        });
    }, 200);
}

setTimeout(() => {
    showAnnouncement();
}, 1000);

function createSnowflakes() {
    const snowflakes = document.querySelectorAll('.snowflake');
    const snowflakeSymbols = ['❄', '❅', '❆'];
    
    snowflakes.forEach(snowflake => {
        const randomSymbol = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];
        snowflake.textContent = randomSymbol;
    });
}

createSnowflakes();

window.addEventListener('resize', function() {
    const announcement = document.getElementById('announcement');
    if (announcement && announcement.classList.contains('show')) {
        setTimeout(() => {
            announcement.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        }, 100);
    }
});
