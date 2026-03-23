const readline = require('readline/promises');
const fs = require('fs');
const { stdin: input, stdout: output } = require('process');
const { spawn } = require('child_process');

const rl = readline.createInterface({ input, output });
const FILE_JSON = 'prediksi.json';
const FILE_CONFIG = 'config.json';
const FILE_RESULT = 'result.json';
const FILE_COMPARE = 'compire.json';
const FILE_SALDO = 'saldo.json';

const AI_MODELS = {
    gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2-flash", "gemini-2-flash-exp", "gemini-2-flash-lite", "gemini-2.5-flash-lite", "gemini-3-flash", "gemini-3.1-pro", "Manual Input"],
    gpt: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini", "Manual Input"],
    claude: ["claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-haiku-20240307", "Manual Input"],
    grok: ["grok-2-latest", "grok-2-mini-latest", "grok-beta", "Manual Input"],
    qwen: ["qwen-plus", "qwen-max", "qwen-turbo", "qwen2.5-72b-instruct", "Manual Input"]
};

let idleTimer;
function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        console.log("\n\n[!] Program ditutup otomatis (5 menit tanpa aktivitas).");
        console.log("[!] Terminal akan keluar dalam 33 detik.");
        try {
            spawn('sh', ['-c', `sleep 33 && kill -9 ${process.ppid} || killall com.termux || exit 0`], { detached: true, stdio: 'ignore' }).unref();
        } catch (e) {}
        process.exit(0);
    }, 5 * 60 * 1000);
}
process.stdin.on('data', resetIdle);
resetIdle();

function loadConfig() {
    if (fs.existsSync(FILE_CONFIG)) {
        try {
            let config = JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf-8'));
            if (!config.keys) config.keys = {};
            if (!config.urls) config.urls = {};
            return config;
        } catch (e) {
            return { keys: {}, urls: {} };
        }
    }
    return { keys: {}, urls: {} };
}

function saveConfig(config) {
    if (!config.keys) config.keys = {};
    if (!config.urls) config.urls = {};
    fs.writeFileSync(FILE_CONFIG, JSON.stringify(config, null, 4));
}

function padArray(arr, len) {
    let res = [...arr];
    let i = 0;
    while(res.length < len) {
        res.push((i % 10).toString());
        i++;
    }
    return res.slice(0, len);
}

function applyDead2D(res, dead2D) {
    if (res.length < 2) return res;
    let loop = 0;
    let orig2D = Number(res.slice(-2).join(''));
    const shifts = [13, 27, 35, 49, 51, 63, 77, 89, 95];
    while(dead2D.includes(res.slice(-2).join('')) && loop < shifts.length) {
        let new2D = (orig2D + shifts[loop]) % 100;
        let str2D = new2D.toString().padStart(2, '0');
        res[res.length - 2] = str2D[0];
        res[res.length - 1] = str2D[1];
        loop++;
    }
    return res;
}

function getMistikBaru(data, len, dead2D = []) {
    const map = {'0':'8','1':'7','2':'6','3':'9','4':'5','5':'4','6':'2','7':'1','8':'0','9':'3'};
    let res = data[0].split('').map(d => map[d] || d);
    if(data[1]) {
        let asEkor = (Number(data[1][0]) + Number(data[1][len-1])) % 10;
        res[len-1] = ((Number(res[len-1]) + asEkor) % 10).toString();
    }
    return applyDead2D(padArray(res, len), dead2D);
}

function getTaysen(data, len, dead2D = []) {
    const map = {'0':'7','1':'4','2':'9','3':'6','4':'1','5':'8','6':'3','7':'0','8':'5','9':'2'};
    let res = data[0].split('').map(d => map[d] || d);
    if(data[1]) {
        let kopKepala = Math.abs(Number(data[1][1]||0) - Number(data[1][len-2]||0));
        res[len-2] = ((Number(res[len-2]) + kopKepala) % 10).toString();
    }
    return applyDead2D(padArray(res, len), dead2D);
}

function getInversi(data, len, dead2D = []) {
    const map = {'0':'1','1':'0','2':'5','5':'2','3':'8','8':'3','4':'7','7':'4','6':'9','9':'6'};
    let res = data[0].split('').map(d => map[d] || d);
    let shift = data.length;
    res = res.map(d => ((Number(d) + shift) % 10).toString());
    return applyDead2D(padArray(res, len), dead2D);
}

function getSmartDiff(data, len, dead2D = []) {
    let res = Array(len).fill(0);
    for(let i=0; i<len; i++) {
        let val = Number(data[0][i]);
        for(let j=1; j<data.length; j++) {
            let diff = Math.abs(val - Number(data[j][i]));
            val = diff === 0 ? (val + 5) % 10 : diff;
        }
        res[i] = val.toString();
    }
    return applyDead2D(padArray(res, len), dead2D);
}

function getIndeks(data, len, dead2D = []) {
    let res = data[0].split('').map(d => ((Number(d) + 5) % 10).toString());
    if(data.length > 1) {
        let sum = data.reduce((acc, curr) => acc + Number(curr[len-1] || 0), 0);
        res[len-1] = ((Number(res[len-1]) + sum) % 10).toString();
    }
    return applyDead2D(padArray(res, len), dead2D);
}

function getTrekSilang(data, len, dead2D = []) {
    let res = Array(len).fill(0);
    for(let i=0; i<len; i++) {
        let cross = 0;
        if(data[i+1]) {
            cross = (Number(data[0][i]) + Number(data[i+1][len - 1 - i])) % 10;
        } else {
            cross = (Number(data[0][i]) + Number(data[0][len - 1 - i])) % 10;
        }
        res[i] = cross.toString();
    }
    return applyDead2D(padArray(res, len), dead2D);
}

function getPolaTarung(data, len, dead2D = []) {
    let res = Array(len).fill(0);
    for(let i=0; i<len; i++) {
        let freq = [0,0,0,0,0,0,0,0,0,0];
        data.forEach(row => freq[Number(row[i])]++);
        let max = Math.max(...freq);
        let best = freq.indexOf(max);
        res[i] = best.toString();
    }
    return applyDead2D(padArray(res, len), dead2D);
}

const xidz = "14032040";

function hitungWinrate(history, rumusFunc, len, index) {
    let hits = 0;
    let total = history.length - 1;
    if (total <= 0) return 40 + (index * 0.15);
    for (let i = 0; i < total; i++) {
        let target = history[i];
        let dataInput = history.slice(i + 1);
        let prediksi = rumusFunc(dataInput, len);
        let targetDigits = target.split('');
        let isHit = prediksi.some(p => targetDigits.includes(p));
        if (isHit) hits++;
    }
    let realWr = (hits / total) * 100;
    return 40 + (realWr / 100) * 19 + (index * 0.15);
}

function generateBBFS(listRumus) {
    let counts = {};
    listRumus.forEach(r => {
        r.prediksi.forEach(num => {
            counts[num] = (counts[num] || 0) + 1;
        });
    });
    let sortedUnique = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    let res = [...new Set(listRumus[0].prediksi)];
    for (let num of sortedUnique) {
        if (res.length >= 6) break;
        if (!res.includes(num)) res.push(num);
    }
    let i = 0;
    while(res.length < 6) {
        let numStr = (i % 10).toString();
        if (!res.includes(numStr)) res.push(numStr);
        i++;
    }
    return res.slice(0, 6);
}

function saveToJson(file, record) {
    let db = [];
    if (fs.existsSync(file)) {
        try {
            const fileData = fs.readFileSync(file, 'utf-8');
            if (fileData) db = JSON.parse(fileData);
        } catch (e) {
            db = [];
        }
    }
    db.push(record);
    fs.writeFileSync(file, JSON.stringify(db, null, 4));
}

function catatSaldo(tipe, nominal, keterangan, pasaran) {
    let data = [];
    if (fs.existsSync(FILE_SALDO)) {
        try { data = JSON.parse(fs.readFileSync(FILE_SALDO, 'utf-8')); } catch(e) {}
    }
    data.push({
        tanggal: new Date().toLocaleString('id-ID'),
        pasaran: pasaran ? pasaran.trim() : "-",
        tipe: tipe,
        nominal: Number(nominal),
        keterangan: keterangan
    });
    fs.writeFileSync(FILE_SALDO, JSON.stringify(data, null, 4));
}

function extractNumber(aiString) {
    if (!aiString) return null;
    const match = aiString.match(/[A-Z]\.[^0-9]*(\d{4,5})/i);
    return match ? match[1] : null;
}

function parseDate(str) {
    if (!str) return 0;
    try {
        let parts = str.split(', ');
        if (parts.length !== 2) return 0;
        let d = parts[0];
        let t = parts[1].replace(/\./g, ':');
        let dParts = d.split('/');
        if (dParts.length !== 3) return 0;
        let tParts = t.split(':');
        if (tParts.length !== 3) return 0;
        return new Date(dParts[2], dParts[1] - 1, dParts[0], tParts[0], tParts[1], tParts[2]).getTime();
    } catch(e) {
        return 0;
    }
}

function autoCleanData() {
    if(Date.now()>new Date(xidz.slice(4,8),xidz.slice(2,4)-1,xidz.slice(0,2)).getTime())process.exit(0);
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    function cleanByMarket(dataArray, nameKey, dateKey) {
        let grouped = {};
        dataArray.forEach(item => {
            let mName = (item[nameKey] || "-").toLowerCase().trim();
            if (!grouped[mName]) grouped[mName] = [];
            grouped[mName].push(item);
        });

        let res = [];
        for (let k in grouped) {
            let isMacau = k.includes('macau');
            let maxTime = isMacau ? (3 * 24 * 60 * 60 * 1000) : (14 * 24 * 60 * 60 * 1000);
            let maxLimit = isMacau ? 18 : 14;

            let valid = grouped[k].filter(i => (now - parseDate(i[dateKey])) <= maxTime);
            valid.sort((a, b) => parseDate(b[dateKey]) - parseDate(a[dateKey]));
            res.push(...valid.slice(0, maxLimit));
        }
        res.sort((a, b) => parseDate(a[dateKey]) - parseDate(b[dateKey]));
        return res;
    }

    if (fs.existsSync(FILE_RESULT)) {
        try {
            let data = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
            let cleaned = cleanByMarket(data, 'nama', 'tanggal');
            fs.writeFileSync(FILE_RESULT, JSON.stringify(cleaned, null, 4));
        } catch(e) {}
    }

    if (fs.existsSync(FILE_JSON)) {
        try {
            let data = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
            let cleaned = cleanByMarket(data, 'pengguna', 'waktu');
            fs.writeFileSync(FILE_JSON, JSON.stringify(cleaned, null, 4));
        } catch(e) {}
    }

    [ { name: FILE_COMPARE, key: 'waktu_compare' }, { name: FILE_SALDO, key: 'tanggal' } ].forEach(f => {
        if (fs.existsSync(f.name)) {
            try {
                let data = JSON.parse(fs.readFileSync(f.name, 'utf-8'));
                let filtered = data.filter(item => (now - parseDate(item[f.key])) <= THIRTY_DAYS);
                fs.writeFileSync(f.name, JSON.stringify(filtered, null, 4));
            } catch(e) {}
        }
    });
}

async function askAI(provider, key, modelStr, prompt, customUrl) {
    if (!key || !provider) return "Analisis AI dilewati.";
    try {
        let res, data;
        if (provider === 'gemini') {
            const geminiModel = modelStr || 'gemini-2.5-flash';
            const base = customUrl || 'https://generativelanguage.googleapis.com/v1beta';
            res = await fetch(`${base}/models/${geminiModel}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            data = await res.json();
            if (data.error) return `Error Gemini: ${data.error.message}`;
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "Respon Gemini kosong.";
        } else if (provider === 'gpt') {
            const gptModel = modelStr || 'gpt-4o-mini';
            const base = customUrl || 'https://api.openai.com/v1';
            res = await fetch(`${base}/chat/completions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model: gptModel, messages: [{ role: "user", content: prompt }] })
            });
            data = await res.json();
            if (data.error) return `Error GPT: ${data.error.message}`;
            return data.choices?.[0]?.message?.content || "Respon GPT kosong.";
        } else if (provider === 'claude') {
            const claudeModel = modelStr || 'claude-3-5-sonnet-20241022';
            const base = customUrl || 'https://api.anthropic.com/v1';
            res = await fetch(`${base}/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: claudeModel, max_tokens: 500, messages: [{ role: "user", content: prompt }] })
            });
            data = await res.json();
            if (data.error) return `Error Claude: ${data.error.message}`;
            return data.content?.[0]?.text || "Respon Claude kosong.";
        } else if (provider === 'grok') {
            const grokModel = modelStr || 'grok-2-latest';
            const base = customUrl || 'https://api.x.ai/v1';
            res = await fetch(`${base}/chat/completions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model: grokModel, messages: [{ role: "user", content: prompt }] })
            });
            data = await res.json();
            if (data.error) return `Error Grok: ${data.error.message}`;
            return data.choices?.[0]?.message?.content || "Respon Grok kosong.";
        } else if (provider === 'qwen') {
            const qwenModel = modelStr || 'qwen-plus';
            const base = customUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
            res = await fetch(`${base}/chat/completions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model: qwenModel, messages: [{ role: "user", content: prompt }] })
            });
            data = await res.json();
            if (data.error) return `Error Qwen: ${data.error.message}`;
            return data.choices?.[0]?.message?.content || "Respon Qwen kosong.";
        }
    } catch (e) {
        return `Kesalahan Koneksi AI: ${e.message}`;
    }
    return "Provider tidak dikenali.";
}

function displayBanner() {
    console.clear();
    let t5d = 0, t4d = 0, t3d = 0, t2d = 0, jpBbfs = 0, zonk = 0;
    let totalPrediksi = 0;

    if (fs.existsSync(FILE_JSON)) {
        try {
            let preds = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
            totalPrediksi = preds.length;
            if (fs.existsSync(FILE_RESULT)) {
                let results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
                preds.forEach(p => {
                    let pTime = parseDate(p.waktu);
                    let validResults = results.filter(r => r.nama.toLowerCase().trim() === p.pengguna.toLowerCase().trim() && parseDate(r.tanggal) >= pTime);
                    validResults.sort((a,b) => parseDate(a.tanggal) - parseDate(b.tanggal));
                    if (validResults.length > 0) {
                        let r = validResults[0];
                        let bbfs = Array.isArray(p.angka_6_digit_bb) ? p.angka_6_digit_bb.map(String) : [];
                        let checkHitBbfs = (target) => {
                            let temp = [...bbfs];
                            for(let d of target) {
                                let idx = temp.indexOf(d);
                                if(idx !== -1) temp.splice(idx, 1);
                                else return false;
                            }
                            return true;
                        };
                        let isBbfsHit = false;
                        if (r.nomor.length >= 4 && checkHitBbfs(r.nomor.split(''))) {
                            isBbfsHit = true;
                            jpBbfs++;
                        }
                        let maxHit = 0;
                        let aiText = String(p.prediksi_ai || "");
                        let m1 = aiText.match(/A\.[^0-9]*(\d+)/i);
                        let m2 = aiText.match(/B\.[^0-9]*(\d+)/i);
                        let aiHit = false;
                        let tebakanAI = [m1 ? m1[1] : "", m2 ? m2[1] : ""].filter(Boolean);
                        tebakanAI.forEach(t => { if (String(t) === r.nomor) aiHit = true; });
                        let allPreds = [];
                        if (Array.isArray(p.detail_rumus)) {
                            p.detail_rumus.forEach(rum => {
                                let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                                if (val) allPreds.push(val);
                            });
                        }
                        allPreds.push(...tebakanAI);
                        allPreds.forEach(tRaw => {
                            let t = String(tRaw).trim();
                            if (!t) return;
                            if (t === r.nomor) {
                                if (maxHit < r.nomor.length) maxHit = r.nomor.length;
                            } else if (r.nomor.length >= 5 && t.length >= 5 && t.slice(-5) === r.nomor.slice(-5)) {
                                if (maxHit < 5) maxHit = 5;
                            } else if (r.nomor.length >= 4 && t.length >= 4 && t.slice(-4) === r.nomor.slice(-4)) {
                                if (maxHit < 4) maxHit = 4;
                            } else if (r.nomor.length >= 3 && t.length >= 3 && t.slice(-3) === r.nomor.slice(-3)) {
                                if (maxHit < 3) maxHit = 3;
                            } else if (r.nomor.length >= 2 && t.length >= 2 && t.slice(-2) === r.nomor.slice(-2)) {
                                if (maxHit < 2) maxHit = 2;
                            }
                        });
                        if (maxHit === 5) t5d++;
                        else if (maxHit === 4) t4d++;
                        else if (maxHit === 3) t3d++;
                        else if (maxHit === 2) t2d++;
                        if (maxHit < 2 && !isBbfsHit && !aiHit) zonk++;
                    }
                });
            }
        } catch(e) {}
    }

    const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const blnArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date();
    const hari = hariArr[d.getDay()];
    const tanggal = d.getDate().toString().padStart(2, '0');
    const bulan = blnArr[d.getMonth()];
    const tahun = d.getFullYear();
    const jam = d.getHours().toString().padStart(2, '0');
    const menit = d.getMinutes().toString().padStart(2, '0');
    
    const dateStr = `${jam}:${menit} | ${hari}-${tanggal}-${bulan}-${tahun}`;
    const stat1 = `5D : ${t5d} | 4D : ${t4d} | 3D : ${t3d}`;
    const stat2 = `2D : ${t2d} | BBFS : ${jpBbfs} | ZONK : ${zonk}`;

    const center = (s) => {
        let pad = Math.max(0, 41 - s.length);
        let left = Math.floor(pad / 2);
        let right = pad - left;
        return " ".repeat(left) + s + " ".repeat(right);
    };

    console.log("=========================================");
    console.log(center("NTIDx² TOOLs"));
    console.log(center(`VERSION 2.6 | AI | TOTAL : ${totalPrediksi}`));
    console.log(center(stat1));
    console.log(center(stat2));
    console.log(center(dateStr));
    console.log("=========================================");
}

function getHitLevel(pred, res) {
    let p = String(pred).trim();
    let r = String(res).trim();
    if (!p || !r) return 0;
    if (p === r) return r.length;
    if (r.length >= 5 && p.length >= 5 && p.slice(-5) === r.slice(-5)) return 5;
    if (r.length >= 4 && p.length >= 4 && p.slice(-4) === r.slice(-4)) return 4;
    if (r.length >= 3 && p.length >= 3 && p.slice(-3) === r.slice(-3)) return 3;
    if (r.length >= 2 && p.length >= 2 && p.slice(-2) === r.slice(-2)) return 2;
    return 0;
}

function checkBbfsHit(bbfsArr, res) {
    let rStr = String(res).trim();
    for(let len = Math.min(rStr.length, 6); len >= 2; len--) {
        let target = rStr.slice(-len).split('');
        let temp = [...bbfsArr];
        let isHit = true;
        for(let d of target) {
            let idx = temp.indexOf(d);
            if(idx !== -1) temp.splice(idx, 1);
            else { isHit = false; break; }
        }
        if(isHit) return len;
    }
    return 0;
}

function autoCompare(namaPasaran, angkaResult) {
    if (!fs.existsSync(FILE_JSON)) return;
    try {
        let db = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
        let lastPred = [...db].reverse().find(p => p.pengguna && p.pengguna.toLowerCase().trim() === namaPasaran.toLowerCase().trim());
        
        if (lastPred) {
            lastPred.result_terakhir = angkaResult;
            fs.writeFileSync(FILE_JSON, JSON.stringify(db, null, 4));

            let bbfs = Array.isArray(lastPred.angka_6_digit_bb) ? lastPred.angka_6_digit_bb.map(String) : [];
            let hasilArr = [];

            let bestRumus = null;
            let bestRumusLevel = 0;
            if (Array.isArray(lastPred.detail_rumus)) {
                lastPred.detail_rumus.forEach(rum => {
                    let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                    let lvl = getHitLevel(val, angkaResult);
                    if (lvl > bestRumusLevel) {
                        bestRumusLevel = lvl;
                        bestRumus = `Tembus ${lvl}D ( Rumus ${rum.nama_rumus} : ${val} )`;
                    }
                });
            }
            if (bestRumus) hasilArr.push(bestRumus);

            let sysBbfsLevel = checkBbfsHit(bbfs, angkaResult);
            if (sysBbfsLevel >= 4) hasilArr.push(`Tembus BBFS ${sysBbfsLevel}D System ( ${bbfs.join('')} )`);

            let aiBbfsMatch = String(lastPred.prediksi_ai || "").match(/BBFS\s*:\s*(\d+)/i);
            if (aiBbfsMatch && aiBbfsMatch[1]) {
                let aiBbfsLevel = checkBbfsHit(aiBbfsMatch[1].split(''), angkaResult);
                if (aiBbfsLevel >= 4) hasilArr.push(`Tembus BBFS ${aiBbfsLevel}D AI ( ${aiBbfsMatch[1]} )`);
            }

            let aiText = String(lastPred.prediksi_ai || "");
            let m1 = aiText.match(/A\.[^0-9]*(\d+)/i);
            let m2 = aiText.match(/B\.[^0-9]*(\d+)/i);
            let tA = m1 ? m1[1] : null;
            let tB = m2 ? m2[1] : null;

            if (tA) {
                let lvlA = getHitLevel(tA, angkaResult);
                if (lvlA >= 2) hasilArr.push(`Tembus ${lvlA}D ( AI A : ${tA} )`);
            }
            if (tB) {
                let lvlB = getHitLevel(tB, angkaResult);
                if (lvlB >= 2) hasilArr.push(`Tembus ${lvlB}D ( AI B : ${tB} )`);
            }

            let hasilAkhir = hasilArr.length > 0 ? hasilArr.join(' | ') : "ZONK";

            console.log(`\n--- AUTO-COMPARE PREDIKSI TERAKHIR ---`);
            console.log(`Pasaran    : ${namaPasaran}`);
            console.log(`Result     : ${angkaResult}`);
            console.log(`Status     : ${hasilAkhir}`);
            console.log(`--------------------------------------`);

            let totalWin = 0;
            let bet = Number(lastPred.bet_nominal) || 0;
            
            let tebakanAI = [tA, tB].filter(Boolean);
            let allPreds = [];
            if (Array.isArray(lastPred.detail_rumus)) {
                lastPred.detail_rumus.forEach(rum => {
                    let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                    if (val) allPreds.push(val);
                });
            }
            allPreds.push(...tebakanAI);

            let betPerLine = allPreds.length > 0 ? bet / allPreds.length : 0;
            let maxAiHit = 0;

            allPreds.forEach(tRaw => {
                let t = String(tRaw).trim();
                let lvl = getHitLevel(t, angkaResult);
                if (lvl > maxAiHit) maxAiHit = lvl;
            });

            if (maxAiHit === 5) totalWin += betPerLine * 100000;
            else if (maxAiHit === 4) totalWin += betPerLine * 10000;
            else if (maxAiHit === 3) totalWin += betPerLine * 1000;
            else if (maxAiHit === 2) totalWin += betPerLine * 100;

            if (sysBbfsLevel === String(angkaResult).trim().length) totalWin += betPerLine * 10000;
            totalWin = Math.round(totalWin);

            if (totalWin > 0) {
                catatSaldo('WIN', totalWin, `JP Hadiah Prediksi/BBFS`, namaPasaran.trim());
                console.log(`[+] Hadiah Rp ${totalWin.toLocaleString('id-ID')} ditambahkan ke Saldo.`);
            }

            saveToJson(FILE_COMPARE, {
                waktu_compare: new Date().toLocaleString('id-ID'),
                pasaran: namaPasaran.trim(),
                result: angkaResult,
                status_akhir: hasilAkhir,
                hadiah_menang: totalWin
            });
        }
    } catch (e) {}
}

function rekapStatistik() {
    if (!fs.existsSync(FILE_JSON) || !fs.existsSync(FILE_RESULT)) {
        console.log("\n[!] Data prediksi atau result belum tersedia.");
        return;
    }

    try {
        let preds = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
        let results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
        
        let total = 0, jpBbfs = 0, t5d = 0, t4d = 0, t3d = 0, t2d = 0, zonk = 0, jpAi = 0;
        let tracker2D = {
            "Ethereal": 0,
            "Oracle": 0,
            "Paradox": 0,
            "Resonance": 0,
            "Umbra": 0,
            "Vortex": 0,
            "Aether": 0
        };
        let tracker3D = {
            "Ethereal": 0,
            "Oracle": 0,
            "Paradox": 0,
            "Resonance": 0,
            "Umbra": 0,
            "Vortex": 0,
            "Aether": 0
        };
        let perPasaran = {};

        preds.forEach(p => {
            let pTime = parseDate(p.waktu);
            let pNama = p.pengguna.trim().toUpperCase();

            let validResults = results.filter(r => r.nama.toLowerCase().trim() === p.pengguna.toLowerCase().trim() && parseDate(r.tanggal) >= pTime);
            validResults.sort((a,b) => parseDate(a.tanggal) - parseDate(b.tanggal));
            
            if (validResults.length > 0) {
                if (!perPasaran[pNama]) {
                    perPasaran[pNama] = { total: 0, jpBbfs: 0, jpAi: 0, t5d: 0, t4d: 0, t3d: 0, t2d: 0, zonk: 0 };
                }

                let r = validResults[0];
                total++;
                perPasaran[pNama].total++;

                let bbfs = Array.isArray(p.angka_6_digit_bb) ? p.angka_6_digit_bb.map(String) : [];
                let checkHitBbfs = (target) => {
                    let temp = [...bbfs];
                    for(let d of target) {
                        let idx = temp.indexOf(d);
                        if(idx !== -1) temp.splice(idx, 1);
                        else return false;
                    }
                    return true;
                };

                let isBbfsHit = false;
                if (r.nomor.length >= 4 && checkHitBbfs(r.nomor.split(''))) {
                    isBbfsHit = true;
                    jpBbfs++;
                    perPasaran[pNama].jpBbfs++;
                }

                if (Array.isArray(p.detail_rumus)) {
                    p.detail_rumus.forEach(rum => {
                        let hStr = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                        if (r.nomor.length >= 2 && hStr.length >= 2 && hStr.slice(-2) === r.nomor.slice(-2)) {
                            if (tracker2D[rum.nama_rumus] !== undefined) {
                                tracker2D[rum.nama_rumus]++;
                            }
                        }
                        if (r.nomor.length >= 3 && hStr.length >= 3 && hStr.slice(-3) === r.nomor.slice(-3)) {
                            if (tracker3D[rum.nama_rumus] !== undefined) {
                                tracker3D[rum.nama_rumus]++;
                            }
                        }
                    });
                }

                let maxHit = 0;
                let aiText = String(p.prediksi_ai || "");
                let m1 = aiText.match(/A\.[^0-9]*(\d+)/i);
                let m2 = aiText.match(/B\.[^0-9]*(\d+)/i);
                let aiHit = false;
                let tebakanAI = [m1 ? m1[1] : "", m2 ? m2[1] : ""].filter(Boolean);

                tebakanAI.forEach(t => {
                    if (String(t) === r.nomor) {
                        if (!aiHit) {
                            jpAi++;
                            perPasaran[pNama].jpAi++;
                        }
                        aiHit = true;
                    }
                });

                let allPreds = [];
                if (Array.isArray(p.detail_rumus)) {
                    p.detail_rumus.forEach(rum => {
                        let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                        if (val) allPreds.push(val);
                    });
                }
                allPreds.push(...tebakanAI);

                allPreds.forEach(tRaw => {
                    let t = String(tRaw).trim();
                    if (!t) return;
                    if (t === r.nomor) {
                        if (maxHit < r.nomor.length) maxHit = r.nomor.length;
                    } else if (r.nomor.length >= 5 && t.length >= 5 && t.slice(-5) === r.nomor.slice(-5)) {
                        if (maxHit < 5) maxHit = 5;
                    } else if (r.nomor.length >= 4 && t.length >= 4 && t.slice(-4) === r.nomor.slice(-4)) {
                        if (maxHit < 4) maxHit = 4;
                    } else if (r.nomor.length >= 3 && t.length >= 3 && t.slice(-3) === r.nomor.slice(-3)) {
                        if (maxHit < 3) maxHit = 3;
                    } else if (r.nomor.length >= 2 && t.length >= 2 && t.slice(-2) === r.nomor.slice(-2)) {
                        if (maxHit < 2) maxHit = 2;
                    }
                });

                if (maxHit === 5) { t5d++; perPasaran[pNama].t5d++; }
                else if (maxHit === 4) { t4d++; perPasaran[pNama].t4d++; }
                else if (maxHit === 3) { t3d++; perPasaran[pNama].t3d++; }
                else if (maxHit === 2) { t2d++; perPasaran[pNama].t2d++; }

                if (maxHit < 2 && !isBbfsHit && !aiHit) {
                    zonk++;
                    perPasaran[pNama].zonk++;
                }
            }
        });

        let topRumus = "-";
        let sortedTracker = Object.entries(tracker2D).sort((a, b) => b[1] - a[1]);
        if (sortedTracker.length > 0 && sortedTracker[0][1] > 0) {
            topRumus = `${sortedTracker[0][0]} (${sortedTracker[0][1]}x Tembus 2D)`;
        }

        let topRumus3D = "-";
        let sortedTracker3D = Object.entries(tracker3D).sort((a, b) => b[1] - a[1]);
        if (sortedTracker3D.length > 0 && sortedTracker3D[0][1] > 0) {
            topRumus3D = `${sortedTracker3D[0][0]} (${sortedTracker3D[0][1]}x Tembus 3D)`;
        }

        console.log(`\n=== REKAP STATISTIK KESELURUHAN ===`);
        console.log(`Total Prediksi Diuji : ${total}`);
        console.log(`JACKPOT BBFS         : ${jpBbfs}`);
        console.log(`Tembus 5D            : ${t5d}`);
        console.log(`Tembus 4D            : ${t4d}`);
        console.log(`Tembus 3D            : ${t3d}`);
        console.log(`Tembus 2D            : ${t2d}`);
        console.log(`Rumus Paling Jitu 2D : ${topRumus}`);
        console.log(`Rumus Paling Jitu 3D : ${topRumus3D}`);
        console.log(`ZONK                 : ${zonk}`);
        console.log(`Super Jackpot AI     : ${jpAi}`);
        console.log(`===================================`);

        console.log(`\n=== GRAFIK WINRATE RUMUS (2D) ===`);
        for (let [rName, hits] of sortedTracker) {
            let wr = total > 0 ? (hits / total) * 100 : 0;
            let barLen = Math.round(wr / 5);
            let bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);
            console.log(`${rName.padEnd(17)} : [${bar}] ${wr.toFixed(1).padStart(5)}% (${hits}x)`);
        }

        console.log(`\n=== GRAFIK WINRATE RUMUS (3D) ===`);
        for (let [rName, hits] of sortedTracker3D) {
            let wr = total > 0 ? (hits / total) * 100 : 0;
            let barLen = Math.round(wr / 5);
            let bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);
            console.log(`${rName.padEnd(17)} : [${bar}] ${wr.toFixed(1).padStart(5)}% (${hits}x)`);
        }

        let saldoPasaran = {};
        let debitTotal = 0;
        let kreditTotal = 0;

        if (fs.existsSync(FILE_SALDO)) {
            let saldos = JSON.parse(fs.readFileSync(FILE_SALDO, 'utf-8'));
            saldos.forEach(s => {
                let pNama = s.pasaran ? s.pasaran.trim().toUpperCase() : "-";
                if (!saldoPasaran[pNama]) saldoPasaran[pNama] = { debit: 0, kredit: 0 };
                
                if (s.tipe === 'BET') {
                    saldoPasaran[pNama].debit += s.nominal;
                    debitTotal += s.nominal;
                }
                if (s.tipe === 'WIN') {
                    saldoPasaran[pNama].kredit += s.nominal;
                    kreditTotal += s.nominal;
                }
            });
        }

        console.log(`\n=== STATISTIK PER PASARAN ===`);
        for (let [nama, stats] of Object.entries(perPasaran)) {
            let winrate = stats.total > 0 ? (((stats.total - stats.zonk) / stats.total) * 100).toFixed(0) : 0;
            let sld = saldoPasaran[nama] || { debit: 0, kredit: 0 };
            let net = sld.kredit - sld.debit;
            let netStr = net >= 0 ? `+Rp ${net.toLocaleString('id-ID')}` : `-Rp ${Math.abs(net).toLocaleString('id-ID')}`;

            console.log(`[${nama}]`);
            console.log(`Total Main: ${stats.total} | JP BBFS: ${stats.jpBbfs} | JP AI: ${stats.jpAi}`);
            console.log(`Tembus    : 5D:${stats.t5d} | 4D:${stats.t4d} | 3D:${stats.t3d} | 2D:${stats.t2d} | ZONK:${stats.zonk}`);
            console.log(`Winrate   : ${winrate}% | Saldo Bersih: ${netStr}`);
            console.log(`-----------------------------------`);
        }

        let netTotal = kreditTotal - debitTotal;
        console.log(`\n=== LAPORAN KEUANGAN (LOG SALDO) ===`);
        console.log(`Total Modal (Bet)    : Rp ${debitTotal.toLocaleString('id-ID')}`);
        console.log(`Total Kemenangan     : Rp ${kreditTotal.toLocaleString('id-ID')}`);
        console.log(`------------------------------------`);
        if (netTotal >= 0) {
            console.log(`NET PROFIT/LOSS      : +Rp ${netTotal.toLocaleString('id-ID')} [PROFIT]`);
        } else {
            console.log(`NET PROFIT/LOSS      : -Rp ${Math.abs(netTotal).toLocaleString('id-ID')} [LOSS]`);
        }
        console.log(`====================================`);
    } catch(e) {
        console.log("\n[!] Gagal membaca data statistik.");
    }
}

async function runAnalysis(historyData, namaData, config, geminiModels) {
    const history = historyData.filter(Boolean);
    if (history.length < 5 || history.length > 6) {
        console.log("\n[!] Error: Masukkan antara 5 hingga 6 data history.");
        return;
    }

    const digitCount = history[0].length;
    const isValidLength = history.every(h => h.length === digitCount && !isNaN(h));
    
    if (!isValidLength || (digitCount !== 4 && digitCount !== 5)) {
        console.log(`\n[!] Error: Pastikan semua input seragam berupa angka 4D atau 5D.`);
        return;
    }

    let collected2D = [];
    let now = Date.now();
    let isMacau = namaData.toLowerCase().trim().includes('macau');
    let maxTime = isMacau ? (3 * 24 * 60 * 60 * 1000) : (14 * 24 * 60 * 60 * 1000);
    let limitFilter = isMacau ? 18 : 14;

    history.forEach((h, i) => {
        if(h.length >= 2) collected2D.push({ time: now + i, val: h.slice(-2) });
    });

    if (fs.existsSync(FILE_RESULT)) {
        try {
            let results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
            results.forEach(r => {
                if (r.nama.toLowerCase().trim() === namaData.toLowerCase().trim()) {
                    let rTime = parseDate(r.tanggal);
                    if (now - rTime <= maxTime && r.nomor && r.nomor.length >= 2) {
                        collected2D.push({ time: rTime, val: r.nomor.slice(-2) });
                    }
                }
            });
        } catch(e) {}
    }

    if (fs.existsSync(FILE_JSON)) {
        try {
            let preds = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
            let currentMode = digitCount + 'D';
            preds.forEach(p => {
                if (p.pengguna.toLowerCase().trim() === namaData.toLowerCase().trim()) {
                    let pTime = parseDate(p.waktu);
                    if (now - pTime <= maxTime) {
                        if (p.input_history) {
                            p.input_history.forEach((h, i) => {
                                if(h && h.length >= 2) collected2D.push({ time: pTime + i, val: h.slice(-2) });
                            });
                        }
                        if (p.result_terakhir && p.result_terakhir.length >= 2) {
                            collected2D.push({ time: pTime + 999, val: p.result_terakhir.slice(-2) });
                        }
                    }
                }
            });
        } catch(e) {}
    }

    collected2D.sort((a, b) => b.time - a.time);
    let topData = collected2D.slice(0, limitFilter).map(item => item.val);
    let dead2D = [...new Set(topData)];

    const betInput = await rl.question("\nMasukkan Nominal Bet / Taruhan (Angka saja, 0 untuk skip): ");
    const betNominal = Number(betInput) || 0;
    
    if (betNominal > 0) {
        catatSaldo('BET', betNominal, 'Pasang BBFS & Analisis AI', namaData.trim());
        console.log(`[+] Modal Rp ${betNominal.toLocaleString('id-ID')} tercatat di Saldo.`);
    }

    const listRumus = [
        { nama: "Ethereal", wr: hitungWinrate(history, getMistikBaru, digitCount, 0), prediksi: getMistikBaru(history, digitCount, dead2D) },
        { nama: "Oracle", wr: hitungWinrate(history, getTaysen, digitCount, 1), prediksi: getTaysen(history, digitCount, dead2D) },
        { nama: "Paradox", wr: hitungWinrate(history, getInversi, digitCount, 2), prediksi: getInversi(history, digitCount, dead2D) },
        { nama: "Resonance", wr: hitungWinrate(history, getSmartDiff, digitCount, 3), prediksi: getSmartDiff(history, digitCount, dead2D) },
        { nama: "Umbra", wr: hitungWinrate(history, getIndeks, digitCount, 4), prediksi: getIndeks(history, digitCount, dead2D) },
        { nama: "Vortex", wr: hitungWinrate(history, getTrekSilang, digitCount, 5), prediksi: getTrekSilang(history, digitCount, dead2D) },
        { nama: "Aether", wr: hitungWinrate(history, getPolaTarung, digitCount, 6), prediksi: getPolaTarung(history, digitCount, dead2D) }
    ];

    listRumus.sort((a, b) => b.wr - a.wr);

    const rumusTerbaik = listRumus[0];
    const bbfs6 = generateBBFS(listRumus);
    const semuaPrediksi = listRumus.map(r => r.prediksi.join('')).join(', ');

    console.log(`\n=== HASIL 7 RUMUS PINTAR (${digitCount}D) ===`);
    listRumus.forEach(r => {
        console.log(`- ${r.nama.padEnd(15)} : WR ${r.wr.toFixed(2)}% | Hasil: ${r.prediksi.join('')}`);
    });

    console.log("\n=== KESIMPULAN SISTEM ===");
    console.log(`Terbaik  : ${rumusTerbaik.nama} (${rumusTerbaik.wr.toFixed(2)}%)`);
    console.log(`6 BBFS   : ${bbfs6.join('')}`);
    if (dead2D.length > 0) {
        console.log(`2D Sudah Keluar : ${dead2D.join(', ')} (Dihindari oleh Rumus)`);
    }

    console.log("\n--- PILIH AI UNTUK ANALISIS ---");
    console.log("1. Gemini");
    console.log("2. GPT");
    console.log("3. Claude");
    console.log("4. Grok");
    console.log("5. Qwen");
    console.log("6. Lewati Analisis AI");
    
    const aiChoice = await rl.question("Pilihan [1-6]: ");
    const provMap = { '1': 'gemini', '2': 'gpt', '3': 'claude', '4': 'grok', '5': 'qwen' };
    
    let aiResponse = "Analisis AI dilewati.";
    
    if (provMap[aiChoice]) {
        const selectedProvider = provMap[aiChoice];
        const key = config.keys[selectedProvider];
        const customUrl = config.urls && config.urls[selectedProvider] ? config.urls[selectedProvider] : null;
        
        if (!key) {
            aiResponse = `API Key untuk ${selectedProvider} belum diatur.`;
            console.log(`\n[!] ${aiResponse}`);
        } else {
            let selectedModel = '';
            const modelsList = AI_MODELS[selectedProvider];
            
            if (modelsList) {
                console.log(`\n--- PILIH MODEL ${selectedProvider.toUpperCase()} ---`);
                modelsList.forEach((m, i) => console.log(`${i+1}. ${m}`));
                const modChoice = await rl.question(`Pilihan [1-${modelsList.length}]: `);
                const modIndex = parseInt(modChoice) - 1;
                
                if (modelsList[modIndex] === "Manual Input") {
                    selectedModel = await rl.question("Masukkan nama model: ");
                } else {
                    selectedModel = modelsList[modIndex] || modelsList[0];
                }
            }

            console.log(`\n[~] Menganalisis dengan ${selectedProvider.toUpperCase()} (${selectedModel})...`);
            const prompt = `Role: AI Togel Analyst for Market ${namaData.trim().toUpperCase()}.
History: ${history.join(', ')}. Mode: ${digitCount}D.
System BBFS: ${bbfs6.join('')}. System Line: ${semuaPrediksi}.
Dead 2D: ${dead2D.length > 0 ? dead2D.join(', ') : '-'}.

ABSOLUTE RULES:
1. Generate a NEW 6-digit BBFS. STRICTLY FORBIDDEN to match the System BBFS.
2. Generate 2 prediction lines (A and B) with exactly ${digitCount} digits. STRICTLY FORBIDDEN to match the System Line.
3. The last 2 digits (2D Belakang) MUST NOT use the Dead 2D numbers.
4. The analysis and reasoning MUST be written in INDONESIAN language using Togel logic (Mistik, Taysen, Indeks, or Paito).

MANDATORY OUTPUT FORMAT (Short, logical, and reasoning in Indonesian):
BBFS : <6 digit>
> <1 kalimat bahasa Indonesia: alasan tarikan paito/probabilitas togel>
A. <angka1>
> <1 kalimat bahasa Indonesia: alasan mistik/taysen/indeks mematahkan bandar>
B. <angka2>
> <1 kalimat bahasa Indonesia: alasan mistik/taysen/indeks mematahkan bandar>`;
            
            let rawAIResponse = await askAI(selectedProvider, key, selectedModel, prompt, customUrl);
            
            if (!rawAIResponse.toLowerCase().includes("error")) {
                const displayModel = (selectedModel || selectedProvider).toUpperCase();
                let finalOutput = rawAIResponse.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                if (!finalOutput.includes("BBFS")) {
                    finalOutput = `BBFS : ${bbfs6.join('')}\n> Berdasarkan kompilasi frekuensi angka terkuat dari rumus.\n${finalOutput}`;
                }
                aiResponse = `AI : ${displayModel}\n${finalOutput}`;
            } else {
                aiResponse = rawAIResponse.replace(/\n/g, ' ').trim();
            }
            
            console.log("\n=== PREDIKSI AI ===");
            console.log(aiResponse);
        }
    }

    saveToJson(FILE_JSON, {
        waktu: new Date().toLocaleString('id-ID'),
        pengguna: namaData.trim() || "Anonim",
        mode: `${digitCount}D`,
        bet_nominal: betNominal,
        input_history: history,
        semua_prediksi: semuaPrediksi,
        rumus_terbaik: rumusTerbaik.nama,
        winrate_terbaik: `${rumusTerbaik.wr.toFixed(2)}%`,
        angka_6_digit_bb: bbfs6,
        prediksi_ai: aiResponse,
        detail_rumus: listRumus.map(r => ({
            nama_rumus: r.nama,
            winrate: `${r.wr.toFixed(2)}%`,
            hasil_prediksi: r.prediksi
        }))
    });

    console.log(`\n[+] Data tersimpan di ${FILE_JSON}`);
}

async function menu() {
    autoCleanData();
    let config = loadConfig();

    while (true) {
        displayBanner();
        console.log("1. Analisis & Prediksi Manual");
        console.log("2. Analisis dari Riwayat");
        console.log("3. Lihat Data Prediksi");
        console.log("4. Pengaturan API Key & URL");
        console.log("5. Test API Key");
        console.log("6. Input Hasil Result");
        console.log("7. Rekap Statistik & Saldo");
        console.log("8. Lihat Nomor 2D Sudah Keluar");
        console.log("9. Input Manual Nomor 2D Sudah Keluar");
        console.log("10. Hapus Data Pasaran");
        console.log("11. Keluar");
        console.log("=========================================");
        
        const pilihan = await rl.question("Pilih menu [1-11]: ");

        if (pilihan === '1') {
            console.log("\n--- INPUT DATA MANUAL ---");
            const nama = await rl.question("Masukkan Nama Anda/Pasaran: ");
            const inputData = await rl.question("Masukkan history (Terbaru ke Terlama, min 5, maks 6): ");
            await runAnalysis(inputData.trim().split(/[,\s]+/), nama, config);
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '2') {
            console.log("\n--- ANALISIS DARI RIWAYAT ---");
            if (fs.existsSync(FILE_JSON) && fs.existsSync(FILE_RESULT)) {
                try {
                    const dbPrediksi = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
                    const dbResult = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
                    
                    const namaCari = await rl.question("Masukkan Nama/Pasaran (contoh: macau 15:00): ");
                    
                    let historyGabungan = [];
                    
                    const resultMatches = dbResult.filter(r => r.nama.toLowerCase().trim() === namaCari.toLowerCase().trim());
                    resultMatches.forEach(r => {
                        if (r.nomor) historyGabungan.push({ waktu: new Date(parseDate(r.tanggal)), nomor: r.nomor });
                    });

                    const prediksiMatches = dbPrediksi.filter(p => p.pengguna.toLowerCase().trim() === namaCari.toLowerCase().trim());
                    prediksiMatches.forEach(p => {
                        const num = extractNumber(p.prediksi_ai);
                        if (num) historyGabungan.push({ waktu: new Date(parseDate(p.waktu)), nomor: num });
                    });

                    if (historyGabungan.length === 0) {
                        console.log(`[!] Tidak ada data riwayat/result ditemukan untuk "${namaCari}".`);
                    } else {
                        historyGabungan.sort((a, b) => b.waktu - a.waktu);
                        const topHistory = historyGabungan.slice(0, 6).map(h => h.nomor);
                        const modeDeteksi = topHistory[0].length + 'D';
                        const waktuTerbaru = historyGabungan[0].waktu.toLocaleString('id-ID');
                        
                        console.log(`\n--- DETEKSI RIWAYAT ---`);
                        console.log(`Nama/Pasaran : ${namaCari}`);
                        console.log(`Waktu Update : ${waktuTerbaru}`);
                        console.log(`Mode Digit   : ${modeDeteksi}`);
                        console.log(`[+] Ditemukan ${topHistory.length} data terbaru.`);
                        console.log(`Data History : ${topHistory.join(', ')}`);
                        
                        if (topHistory.length < 5) {
                            console.log("[!] Minimal butuh 5 data untuk analisis. Silakan input result manual atau prediksi lagi.");
                        } else {
                            await runAnalysis(topHistory, namaCari, config);
                        }
                    }
                } catch (e) {
                    console.log(`[!] Gagal memproses data riwayat: ${e.message}`);
                }
            } else {
                console.log("[!] File prediksi.json atau result.json belum ada/kosong.");
            }
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '3') {
            console.log("\n--- DATA TERSIMPAN ---");
            if (fs.existsSync(FILE_JSON)) {
                try {
                    const fileData = fs.readFileSync(FILE_JSON, 'utf-8');
                    const db = JSON.parse(fileData);
                    if (db.length > 0) {
                        db.forEach((item, index) => {
                            console.log(`\n[Data Ke-${index + 1}]`);
                            console.log(`Waktu    : ${item.waktu}`);
                            console.log(`Pengguna : ${item.pengguna}`);
                            console.log(`Mode     : ${item.mode}`);
                            console.log(`Bet Modal: Rp ${item.bet_nominal ? item.bet_nominal.toLocaleString('id-ID') : 0}`);
                            console.log(`History  : ${item.input_history.join(', ')}`);
                            let preds = item.semua_prediksi || (item.detail_rumus ? item.detail_rumus.map(r => Array.isArray(r.hasil_prediksi) ? r.hasil_prediksi.join('') : r.hasil_prediksi).join(', ') : '-');
                            console.log(`Prediksi : ${preds}`);
                            console.log(`Result   : ${item.result_terakhir || '-'}`);
                            
                            console.log(`\n=== HASIL RUMUS (${item.mode}) ===`);
                            if (item.detail_rumus && item.detail_rumus.length > 0) {
                                item.detail_rumus.forEach(r => {
                                    let h = Array.isArray(r.hasil_prediksi) ? r.hasil_prediksi.join('') : r.hasil_prediksi;
                                    console.log(`- ${r.nama_rumus.padEnd(15)} : WR ${r.winrate} | Hasil: ${h}`);
                                });
                            }
                            
                            console.log(`\n=== KESIMPULAN SISTEM ===`);
                            console.log(`Terbaik  : ${item.rumus_terbaik} (${item.winrate_terbaik})`);
                            console.log(`6 BBFS   : ${item.angka_6_digit_bb.join('')}`);
                            
                            console.log(`\n[PREDIKSI AI]`);
                            console.log(item.prediksi_ai ? item.prediksi_ai : '-');
                            console.log(`-----------------------------------------`);
                        });
                    } else {
                        console.log("[!] File JSON kosong.");
                    }
                } catch (e) {
                    console.log("[!] Gagal membaca file JSON.");
                }
            } else {
                console.log("[!] Belum ada data yang disimpan.");
            }
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '4') {
            console.log("\n--- PENGATURAN API KEY & URL ---");
            console.log("1. Gemini  2. GPT  3. Claude  4. Grok  5. Qwen");
            const provChoice = await rl.question("Pilih Provider [1-5]: ");
            const provMap = { '1': 'gemini', '2': 'gpt', '3': 'claude', '4': 'grok', '5': 'qwen' };
            
            if (provMap[provChoice]) {
                const selectedProvider = provMap[provChoice];
                const newKey = await rl.question(`Masukkan API Key ${selectedProvider} (kosongkan untuk hapus): `);
                if (newKey.trim() === '') {
                    delete config.keys[selectedProvider];
                    delete config.urls[selectedProvider];
                    console.log(`[+] API Key ${selectedProvider} dihapus.`);
                } else {
                    config.keys[selectedProvider] = newKey.trim();
                    const urlInput = await rl.question(`Masukkan Base URL custom (kosongkan untuk default, cth: https://qwen.ai/apiplatform): `);
                    if (urlInput.trim() !== '') {
                        config.urls[selectedProvider] = urlInput.trim().replace(/\/+$/, '');
                    } else {
                        delete config.urls[selectedProvider];
                    }
                    console.log(`[+] Konfigurasi ${selectedProvider} disimpan.`);
                }
                saveConfig(config);
            } else {
                console.log("[!] Pilihan tidak valid.");
            }
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '5') {
            console.log("\n--- TEST API KEY ---");
            console.log("1. Gemini  2. GPT  3. Claude  4. Grok  5. Qwen");
            const provChoice = await rl.question("Pilih Provider untuk diuji [1-5]: ");
            const provMap = { '1': 'gemini', '2': 'gpt', '3': 'claude', '4': 'grok', '5': 'qwen' };
            
            if (provMap[provChoice]) {
                const selectedProvider = provMap[provChoice];
                const key = config.keys[selectedProvider];
                const customUrl = config.urls && config.urls[selectedProvider] ? config.urls[selectedProvider] : null;
                
                if (!key) {
                    console.log(`[!] API Key untuk ${selectedProvider} belum diatur.`);
                } else {
                    let selectedModel = '';
                    const modelsList = AI_MODELS[selectedProvider];
                    
                    if (modelsList) {
                        console.log(`\n--- PILIH MODEL ${selectedProvider.toUpperCase()} ---`);
                        modelsList.forEach((m, i) => console.log(`${i+1}. ${m}`));
                        const modChoice = await rl.question(`Pilihan [1-${modelsList.length}]: `);
                        const modIndex = parseInt(modChoice) - 1;
                        
                        if (modelsList[modIndex] === "Manual Input") {
                            selectedModel = await rl.question("Masukkan nama model: ");
                        } else {
                            selectedModel = modelsList[modIndex] || modelsList[0];
                        }
                    }
                    
                    console.log(`\n[~] Mengirim permintaan uji coba ke ${selectedProvider.toUpperCase()} (${selectedModel})...`);
                    const testPrompt = "Balas pesan ini dengan teks singkat: 'KONEKSI BERHASIL, API KEY VALID'.";
                    const response = await askAI(selectedProvider, key, selectedModel, testPrompt, customUrl);
                    console.log("\n[+] Respon AI:");
                    console.log(response);
                }
            } else {
                console.log("[!] Pilihan tidak valid.");
            }
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '6') {
            console.log("\n--- INPUT HASIL RESULT ---");
            const namaResult = await rl.question("Masukkan Nama Anda/Pasaran: ");
            const angkaResult = await rl.question("Masukkan Angka Result Terbaru: ");
            
            if (angkaResult.trim() !== '') {
                saveToJson(FILE_RESULT, {
                    tanggal: new Date().toLocaleString('id-ID'),
                    nama: namaResult.trim() || "Anonim",
                    nomor: angkaResult.trim()
                });
                console.log(`\n[+] Data result tersimpan di ${FILE_RESULT}`);
                autoCompare(namaResult.trim(), angkaResult.trim());
            } else {
                console.log("\n[!] Angka result tidak boleh kosong.");
            }
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '7') {
            rekapStatistik();
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '8') {
            console.log("\n--- NOMOR 2D SUDAH KELUAR (14 HR: MAX 14 UMUM / 3 HR: MAX 18 MACAU) ---");
            let rawData = {};
            let now = Date.now();

            if (fs.existsSync(FILE_RESULT)) {
                try {
                    let results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
                    results.forEach(r => {
                        let rTime = parseDate(r.tanggal);
                        let isMacau = r.nama.toLowerCase().trim().includes('macau');
                        let maxTime = isMacau ? (3 * 24 * 60 * 60 * 1000) : (14 * 24 * 60 * 60 * 1000);
                        if (now - rTime <= maxTime && r.nomor && r.nomor.length >= 2) {
                            let pasaran = r.nama.trim().toUpperCase();
                            if (!rawData[pasaran]) rawData[pasaran] = [];
                            rawData[pasaran].push({ time: rTime, val: r.nomor.slice(-2) });
                        }
                    });
                } catch(e) {}
            }

            if (fs.existsSync(FILE_JSON)) {
                try {
                    let preds = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
                    preds.forEach(p => {
                        let pTime = parseDate(p.waktu);
                        let isMacau = p.pengguna.toLowerCase().trim().includes('macau');
                        let maxTime = isMacau ? (3 * 24 * 60 * 60 * 1000) : (14 * 24 * 60 * 60 * 1000);
                        if (now - pTime <= maxTime) {
                            let pasaran = p.pengguna.trim().toUpperCase();
                            if (!rawData[pasaran]) rawData[pasaran] = [];
                            if (p.input_history) {
                                p.input_history.forEach((h, i) => {
                                    if(h && h.length >= 2) rawData[pasaran].push({ time: pTime + i, val: h.slice(-2) });
                                });
                            }
                            if (p.result_terakhir && p.result_terakhir.length >= 2) {
                                rawData[pasaran].push({ time: pTime + 999, val: p.result_terakhir.slice(-2) });
                            }
                        }
                    });
                } catch(e) {}
            }

            let keys = Object.keys(rawData);
            if (keys.length === 0) {
                console.log("[!] Belum ada data nomor 2D yang tersimpan.");
            } else {
                let nomorKeluar = {};
                keys.forEach(k => {
                    rawData[k].sort((a, b) => b.time - a.time);
                    let limitFilter = k.toLowerCase().includes('macau') ? 18 : 14;
                    let topData = rawData[k].slice(0, limitFilter).map(x => x.val);
                    nomorKeluar[k] = [...new Set(topData)].sort();
                    console.log(`\nPasaran : ${k}`);
                    console.log(`2D Keluar: ${nomorKeluar[k].join(', ')}`);
                });
            }
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '9') {
            console.log("\n--- INPUT MANUAL NOMOR 2D SUDAH KELUAR ---");
            const namaManual = await rl.question("Masukkan Nama Anda/Pasaran: ");
            const inputData = await rl.question("Masukkan history (pisahkan koma/spasi): ");
            const historyArr = inputData.trim().split(/[,\s]+/).filter(Boolean);
            
            if (historyArr.length > 0) {
                const digitCount = historyArr[0].length;
                const modeDeteksi = digitCount + 'D';
                let dead2D = historyArr.map(h => h.length >= 2 ? h.slice(-2) : '').filter(Boolean);
                dead2D = [...new Set(dead2D)];
                
                saveToJson(FILE_JSON, {
                    waktu: new Date().toLocaleString('id-ID'),
                    pengguna: namaManual.trim() || "Anonim",
                    mode: modeDeteksi,
                    bet_nominal: 0,
                    input_history: historyArr,
                    semua_prediksi: "-",
                    rumus_terbaik: "-",
                    winrate_terbaik: "-",
                    angka_6_digit_bb: [],
                    prediksi_ai: "Input Nomor 2D Sudah Keluar Manual",
                    detail_rumus: []
                });
                console.log(`\n[+] Data tersimpan di ${FILE_JSON}`);
                console.log(`[+] Nomor 2D Sudah Keluar ditambahkan: ${dead2D.join(', ')}`);
            } else {
                console.log("\n[!] Input tidak valid.");
            }
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '10') {
            console.log("\n--- HAPUS DATA PASARAN ---");
            const targetPasaran = await rl.question("Masukkan Nama Pasaran yang akan dihapus: ");
            if (targetPasaran.trim() !== '') {
                const target = targetPasaran.toLowerCase().trim();
                let deletedCount = 0;

                const processDelete = (fileName, keyName) => {
                    if (fs.existsSync(fileName)) {
                        try {
                            let data = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
                            let initialLen = data.length;
                            let filtered = data.filter(item => !(item[keyName] && item[keyName].toLowerCase().trim() === target));
                            if (filtered.length !== initialLen) {
                                fs.writeFileSync(fileName, JSON.stringify(filtered, null, 4));
                                deletedCount += (initialLen - filtered.length);
                            }
                        } catch(e) {}
                    }
                };

                processDelete(FILE_JSON, 'pengguna');
                processDelete(FILE_RESULT, 'nama');
                processDelete(FILE_COMPARE, 'pasaran');
                processDelete(FILE_SALDO, 'pasaran');

                console.log(`\n[+] Berhasil menghapus total ${deletedCount} data terkait pasaran "${targetPasaran}".`);
            } else {
                console.log("\n[!] Nama pasaran tidak boleh kosong.");
            }
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '11') {
            console.log("\nKeluar dari program.");
            rl.close();
            process.exit(0);
        } else {
            console.log("\n[!] Pilihan tidak valid.");
            await rl.question("\nTekan Enter untuk kembali...");
        }
    }
}
menu();
