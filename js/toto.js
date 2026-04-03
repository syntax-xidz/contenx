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
const FILE_DATA = 'data.json';

const AI_MODELS = {
    gemini: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2-flash", "gemini-2-flash-exp", "gemini-2-flash-lite", "gemini-2.5-flash-lite", "gemini-3-flash", "gemini-3.1-pro", "Manual Input"],
    gpt: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini", "Manual Input"],
    claude: ["claude-3-5-sonnet-20241022", "claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-haiku-20240307", "Manual Input"],
    grok: ["grok-2-latest", "grok-2-mini-latest", "grok-beta", "Manual Input"],
    qwen: ["qwen3.5-plus", "qwen3.5-max", "qwen3.5-turbo", "qwen2.5-72b-instruct", "Manual Input"]
};

let idleTimer;
function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
        console.log("\n\n[!] Program ditutup otomatis (5 menit tanpa aktivitas).");
        console.log("Semoga Beruntung Kawan");
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.clear();
        console.log("exit");
        try {
            spawn('sh', ['-c', `kill -9 ${process.ppid} || killall com.termux || exit 0`], { detached: true, stdio: 'ignore' }).unref();
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
            if (!config.activeRumus) config.activeRumus = "Aether";
            if (!config.limit2d) config.limit2d = 14;
            if (config.consecutiveZonk === undefined) config.consecutiveZonk = 0;
            if (!config.activeBbfs) config.activeBbfs = "Markov";
            if (config.consecutiveBbfsZonk === undefined) config.consecutiveBbfsZonk = 0;
            return config;
        } catch (e) {
            return { keys: {}, urls: {}, activeRumus: "Aether", limit2d: 14, consecutiveZonk: 0, activeBbfs: "Markov", consecutiveBbfsZonk: 0 };
        }
    }
    return { keys: {}, urls: {}, activeRumus: "Aether", limit2d: 14, consecutiveZonk: 0, activeBbfs: "Markov", consecutiveBbfsZonk: 0 };
}

function saveConfig(config) {
    if (!config.keys) config.keys = {};
    if (!config.urls) config.urls = {};
    if (!config.activeRumus) config.activeRumus = "Aether";
    if (!config.limit2d) config.limit2d = 14;
    if (config.consecutiveZonk === undefined) config.consecutiveZonk = 0;
    if (!config.activeBbfs) config.activeBbfs = "Markov";
    if (config.consecutiveBbfsZonk === undefined) config.consecutiveBbfsZonk = 0;
    fs.writeFileSync(FILE_CONFIG, JSON.stringify(config, null, 4));
}

function getDigitCat(d) {
    let n = Number(d);
    if(isNaN(n)) return 'KE';
    let size = n >= 5 ? 'B' : 'K';
    let parity = n % 2 === 0 ? 'E' : 'G';
    return size + parity;
}

function getNextCatPattern(historySlice, pos) {
    if(!historySlice || historySlice.length < 2) return null;
    let trans = {};
    for(let i = 0; i < historySlice.length - 1; i++) {
        let curr = getDigitCat(historySlice[i][pos]);
        let prev = getDigitCat(historySlice[i+1][pos]);
        if(!trans[prev]) trans[prev] = {};
        trans[prev][curr] = (trans[prev][curr] || 0) + 1;
    }
    let lastCat = getDigitCat(historySlice[0][pos]);
    if(trans[lastCat]) {
        let sorted = Object.entries(trans[lastCat]).sort((a,b)=>b[1]-a[1]);
        if(sorted.length > 0) return sorted[0][0];
    }
    let counts = {};
    historySlice.forEach(h => {
        let c = getDigitCat(h[pos]);
        counts[c] = (counts[c] || 0) + 1;
    });
    let sortedCounts = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    return sortedCounts.length > 0 ? sortedCounts[0][0] : null;
}

function applySmart2D(res, data, dead2D) {
    if (res.length < 2) return res;
    
    let targetKepCat = getNextCatPattern(data, res.length-2);
    let targetEkorCat = getNextCatPattern(data, res.length-1);
    
    let origKepala = Number(res[res.length-2]);
    let origEkor = Number(res[res.length-1]);
    
    let validKepala = [];
    for(let i=0; i<10; i++) {
        if(!targetKepCat || getDigitCat(i) === targetKepCat) validKepala.push(i);
    }
    if(validKepala.length === 0) validKepala = [0,1,2,3,4,5,6,7,8,9];

    let validEkor = [];
    for(let i=0; i<10; i++) {
        if(!targetEkorCat || getDigitCat(i) === targetEkorCat) validEkor.push(i);
    }
    if(validEkor.length === 0) validEkor = [0,1,2,3,4,5,6,7,8,9];

    let bestKepala = validKepala.reduce((prev, curr) => Math.abs(curr - origKepala) < Math.abs(prev - origKepala) ? curr : prev);
    let bestEkor = validEkor.reduce((prev, curr) => Math.abs(curr - origEkor) < Math.abs(prev - origEkor) ? curr : prev);

    let final2D = `${bestKepala}${bestEkor}`;

    if (dead2D && dead2D.includes(final2D)) {
        let found = false;
        for(let shift=1; shift<validEkor.length; shift++) {
            let altEkor = validEkor[(validEkor.indexOf(bestEkor) + shift) % validEkor.length];
            let alt2D = `${bestKepala}${altEkor}`;
            if(!dead2D.includes(alt2D)) {
                final2D = alt2D;
                found = true;
                break;
            }
        }
        if(!found) {
            for(let shift=1; shift<validKepala.length; shift++) {
                let altKepala = validKepala[(validKepala.indexOf(bestKepala) + shift) % validKepala.length];
                let alt2D = `${altKepala}${bestEkor}`;
                if(!dead2D.includes(alt2D)) {
                    final2D = alt2D;
                    break;
                }
            }
        }
    }

    res[res.length - 2] = final2D[0];
    res[res.length - 1] = final2D[1];
    return res;
}

function getMistisLamaWave(data, len, dead2D = []) {
    const ml = [1,0,5,8,7,2,9,4,3,6];
    let res = [];
    for(let i=0; i<len; i++) {
        let v = Number(data[0]?.[i]||0);
        let p = Number(data[1]?.[(i+1)%len]||0);
        res.push(((ml[v] + p) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getMistisBaruShift(data, len, dead2D = []) {
    const mb = [8,7,6,9,5,4,2,1,0,3];
    let res = [];
    for(let i=0; i<len; i++) {
        let sum = data.reduce((a, b) => a + Number(b[i]||0), 0);
        res.push(mb[sum % 10].toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getIndexPola(data, len, dead2D = []) {
    const ind = [5,6,7,8,9,0,1,2,3,4];
    let res = [];
    for(let i=0; i<len; i++) {
        let v = Number(data[0]?.[i]||0);
        res.push(ind[(v + i) % 10].toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getTessonHarmonic(data, len, dead2D = []) {
    const ts2 = [9,4,8,6,7,1,3,0,2,5];
    let res = [];
    for(let i=0; i<len; i++) {
        let v1 = Number(data[0]?.[i]||0);
        let v2 = ts2[Number(data[1]?.[i]||0)];
        res.push((Math.abs(v1 - (v2||0)) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getGayaBaruSync(data, len, dead2D = []) {
    const gb = [9,2,1,0,5,4,8,6,7,3];
    let res = [];
    for(let i=0; i<len; i++) {
        let col = data.map(r => Number(r[i]||0));
        res.push(gb[Math.max(...col) % 10].toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getAsKopCross(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let As = Number(data[0]?.[0]||0);
        let Kop = Number(data[0]?.[1]||0);
        let curr = Number(data[0]?.[i]||0);
        res.push(((As + Kop + curr + i) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getKepalaEkorCross(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let Kep = Number(data[0]?.[len-2]||0);
        let Ek = Number(data[0]?.[len-1]||0);
        let curr = Number(data[1]?.[i]||0);
        res.push((Math.abs((Kep * Ek) - curr + i) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getBijiTogel(data, len, dead2D = []) {
    let res = [];
    let sum = data[0].split('').reduce((a,b)=>a+Number(b),0);
    let biji = (sum % 9 === 0 && sum > 0) ? 9 : sum % 9;
    for(let i=0; i<len; i++) {
        let colSum = data.reduce((a,b)=>a+Number(b[i]||0),0);
        res.push(((colSum + biji) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getPaitoJarak(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let diff = 0;
        for(let j=0; j<data.length-1; j++) diff += Math.abs(Number(data[j]?.[i]||0) - Number(data[j+1]?.[i]||0));
        res.push((diff % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getAngkaIkut(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let counts = Array(10).fill(0);
        data.forEach(r => { if(r[i]) counts[Number(r[i])]++; });
        let ai = counts.indexOf(Math.max(...counts));
        res.push(((Number(data[0]?.[i]||0) + ai) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getColokBebasMatrix(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let diagSum = 0;
        data.forEach((r, j) => { diagSum += Number(r[(i+j)%len]||0); });
        res.push((diagSum % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getColokMacauCross(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let col = data.map(r => Number(r[i]||0));
        res.push(((Math.min(...col) + Math.max(...col)) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getShioShift(data, len, dead2D = []) {
    let res = [];
    let sum = data[0].split('').reduce((a,b)=>a+Number(b),0);
    let shio = (sum % 12) + 1;
    for(let i=0; i<len; i++) res.push(((Number(data[0]?.[i]||0) + shio) % 10).toString());
    return applySmart2D(res, data, dead2D);
}

function getSnakingPola(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let v1 = Number(data[0]?.[i]||0);
        let v2 = Number(data[1]?.[(i+1)%len]||0);
        res.push(((v1 + v2 + 2) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getQuantumTogel(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let v = Number(data[0]?.[i]||0);
        res.push((Math.floor((v * v + i) / 2) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getGanjilGenapSync(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let v = Number(data[0]?.[i]||0);
        let p = Number(data[1]?.[i]||0);
        res.push((v % 2 === 0 ? (v + p + 1) % 10 : Math.abs(v - p) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getBesarKecilFlip(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let v = Number(data[0]?.[i]||0);
        res.push((v >= 5 ? 9 - v : v + 5).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getKombinasiPaito(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let sum = data.reduce((a,b,j)=>a+Number(b[i]||0)*(j+1), 0);
        res.push(((sum + i) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getKopEkorSync(data, len, dead2D = []) {
    let res = [];
    let Kop = Number(data[0]?.[1]||0);
    let Ek = Number(data[0]?.[len-1]||0);
    for(let i=0; i<len; i++) {
        let curr = Number(data[0]?.[i]||0);
        res.push(((curr + Math.abs(Kop - Ek) + i) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getPoltarCross(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let top = Number(data[0]?.[i]||0);
        let bot = Number(data[data.length-1]?.[i]||0);
        res.push(((top + bot + i) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getAscendingMistis(data, len, dead2D = []) {
    const ml = [1,0,5,8,7,2,9,4,3,6];
    let res = [];
    for(let i=0; i<len; i++) {
        let col = data.map(r => Number(r[i]||0)).sort((a,b)=>a-b);
        let median = col[Math.floor(col.length/2)];
        res.push(ml[median].toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getDiagonalShift(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let d1 = Number(data[0]?.[i]||0);
        let d2 = Number(data[1]?.[(len-1)-i]||0);
        res.push(((d1 + d2 + 5) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getNeptuTemporal(data, len, dead2D = []) {
    let res = [];
    let neptu = [5, 4, 3, 7, 8, 9, 6];
    let dayWeight = neptu[new Date().getDay()];
    for(let i=0; i<len; i++) {
        let v = Number(data[0]?.[i]||0);
        res.push(((v + dayWeight + i) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getKembarTracker(data, len, dead2D = []) {
    let res = [];
    for(let i=0; i<len; i++) {
        let isTwin = data[0][i] === data[0][(i+1)%len];
        let v = Number(data[0]?.[i]||0);
        res.push((isTwin ? (v + 3) % 10 : (v * 2) % 10).toString());
    }
    return applySmart2D(res, data, dead2D);
}

function getEkorMagic(data, len, dead2D = []) {
    const ind = [5,6,7,8,9,0,1,2,3,4];
    let res = [];
    let Ek = Number(data[0]?.[len-1]||0);
    for(let i=0; i<len; i++) {
        let curr = Number(data[0]?.[i]||0);
        res.push(ind[Math.abs(curr - Ek) % 10].toString());
    }
    return applySmart2D(res, data, dead2D);
}

function analyzeHistoryData(history) {
    let ganjil = 0, genap = 0, besar = 0, kecil = 0;
    let kembar = [];
    history.forEach(h => {
        let chars = h.split('');
        chars.forEach(c => {
            let num = parseInt(c);
            if (num % 2 === 0) genap++; else ganjil++;
            if (num >= 5) besar++; else kecil++;
        });
        if (new Set(chars).size < chars.length) kembar.push(h);
    });
    return { ganjil, genap, besar, kecil, kembar };
}

const RUMUS_FUNCTIONS = {
    "Void": getMistisLamaWave,
    "Flux": getMistisBaruShift,
    "Nova": getIndexPola,
    "Apex": getTessonHarmonic,
    "Rift": getGayaBaruSync,
    "Rune": getAsKopCross,
    "Glyph": getKepalaEkorCross,
    "Hex": getBijiTogel,
    "Omen": getPaitoJarak,
    "Sigil": getAngkaIkut,
    "Myth": getColokBebasMatrix,
    "Fate": getColokMacauCross,
    "Halo": getShioShift,
    "Prism": getSnakingPola,
    "Soul": getQuantumTogel,
    "Seer": getGanjilGenapSync,
    "Veil": getBesarKecilFlip,
    "Zeno": getKombinasiPaito,
    "Lore": getKopEkorSync,
    "Echo": getPoltarCross,
    "Core": getAscendingMistis,
    "Node": getDiagonalShift,
    "Onyx": getNeptuTemporal,
    "Shard": getKembarTracker,
    "Spark": getEkorMagic
};

const RUMUS_SETS = {
    "Aether": ["Void", "Flux", "Nova", "Apex", "Rift"],
    "Enigma": ["Rune", "Glyph", "Hex", "Omen", "Sigil"],
    "Astral": ["Myth", "Fate", "Halo", "Prism", "Soul"],
    "Oracle": ["Seer", "Veil", "Zeno", "Lore", "Echo"],
    "Lumina": ["Core", "Node", "Onyx", "Shard", "Spark"]
};

function bbfsMarkov(listRumus, history) {
    let w = Array(10).fill(0);
    const ML = [1,0,5,8,7,2,9,4,3,6];
    const IND = [5,6,7,8,9,0,1,2,3,4];
    if (history && history.length > 1) {
        for(let i=0; i<history.length-1; i++) {
            let curr = history[i], next = history[i+1];
            for(let j=0; j<Math.min(curr.length, next.length); j++) {
                let dC = Number(curr[j]), dN = Number(next[j]);
                if(!isNaN(dC) && !isNaN(dN)) {
                    w[dN] += 2;
                    if (dN === ML[dC]) w[dN] += 3;
                    if (dN === IND[dC]) w[dN] += 2;
                }
            }
        }
    }
    listRumus.forEach((r, idx) => r.prediksi.forEach(d => { if(!isNaN(Number(d))) w[Number(d)] += Math.max(1, 5 - idx); }));
    let sorted = w.map((val, idx) => ({d: idx.toString(), v: val})).sort((a,b) => b.v - a.v);
    let res = new Set();
    for(let item of sorted) { res.add(item.d); if(res.size === 6) break; }
    return Array.from(res);
}

function bbfsEntropy(listRumus, history) {
    let w = Array(10).fill(0);
    let odd = 0, even = 0, big = 0, small = 0;
    if(history) history.forEach(h => h.split('').forEach(d => {
        let n = Number(d);
        if(!isNaN(n)) {
            if(n%2===0) even++; else odd++;
            if(n>=5) big++; else small++;
        }
    }));
    let boostOdd = even > odd;
    let boostBig = small > big;

    listRumus.forEach((r, idx) => {
        r.prediksi.forEach(d => {
            let n = Number(d);
            if(!isNaN(n)) {
                let score = Math.max(1, 5 - idx);
                if (boostOdd && n%2!==0) score *= 1.5;
                if (!boostOdd && n%2===0) score *= 1.5;
                if (boostBig && n>=5) score *= 1.5;
                if (!boostBig && n<5) score *= 1.5;
                w[n] += score;
            }
        });
    });
    let sorted = w.map((val, idx) => ({d: idx.toString(), v: val})).sort((a,b) => b.v - a.v);
    let res = new Set();
    for(let item of sorted) { res.add(item.d); if(res.size === 6) break; }
    return Array.from(res);
}

function bbfsGolden(listRumus, history) {
    let w = Array(10).fill(0);
    const TS2 = [9,4,8,6,7,1,3,0,2,5];
    if (history) {
        history.forEach(h => h.split('').forEach(d => {
            let n = Number(d);
            if(!isNaN(n)) {
                let taysen = TS2[n];
                w[taysen] += 1.618;
            }
        }));
    }
    listRumus.forEach((r, idx) => {
        r.prediksi.forEach(d => {
            let n = Number(d);
            if(!isNaN(n)) w[n] += (5 - idx) * 1.618;
        });
    });
    let sorted = w.map((val, idx) => ({d: idx.toString(), v: val})).sort((a,b) => b.v - a.v);
    let res = new Set();
    for(let item of sorted) { res.add(item.d); if(res.size === 6) break; }
    return Array.from(res);
}

function bbfsTensor(listRumus, history) {
    let w = Array(10).fill(0);
    let mat = [];
    if(history) history.forEach(h => mat.push(h.split('').map(Number).filter(n=>!isNaN(n))));
    let len = mat[0] ? mat[0].length : 4;
    let colSums = Array(len).fill(0);
    mat.forEach((row, i) => {
        row.forEach((val, j) => {
            colSums[j] += val;
            let cross = (val * (i+1) * (j+1)) % 10;
            w[cross] += 1.5;
        });
    });
    colSums.forEach(sum => w[sum%10] += 2);

    listRumus.forEach((r, idx) => r.prediksi.forEach(d => {
        if(!isNaN(Number(d))) w[Number(d)] += Math.max(1, 5 - idx);
    }));
    let sorted = w.map((val, idx) => ({d: idx.toString(), v: val})).sort((a,b) => b.v - a.v);
    let res = new Set();
    for(let item of sorted) { res.add(item.d); if(res.size === 6) break; }
    return Array.from(res);
}

function bbfsCascade(listRumus, history) {
    let w = Array(10).fill(0);
    let posW = [Array(10).fill(0), Array(10).fill(0), Array(10).fill(0), Array(10).fill(0), Array(10).fill(0)];
    if(history && history.length > 0 && history[0]) {
        history.forEach((h, idx) => {
            let weight = Math.pow(1.5, history.length - idx); 
            h.split('').forEach((d, pos) => {
                let n = Number(d);
                if(!isNaN(n)) {
                    w[n] += weight;
                    if(pos < 5) posW[pos][n] += weight;
                }
            });
        });
    }
    let res = new Set();
    if(history && history.length > 0 && history[0]) {
        for(let p=0; p<history[0].length; p++) {
            let maxIdx = 0; let maxV = -1;
            for(let i=0; i<10; i++) { if(posW[p][i] > maxV) { maxV = posW[p][i]; maxIdx = i; } }
            res.add(maxIdx.toString());
        }
    }
    listRumus.forEach((r, idx) => r.prediksi.forEach(d => {
        if(!isNaN(Number(d))) w[Number(d)] += (5 - idx) * 2;
    }));
    let sorted = w.map((val, idx) => ({d: idx.toString(), v: val})).sort((a,b) => b.v - a.v);
    for(let item of sorted) { res.add(item.d); if(res.size === 6) break; }
    let arr = Array.from(res);
    let iter = 0;
    while(arr.length < 6) { let str = (iter%10).toString(); if(!arr.includes(str)) arr.push(str); iter++; }
    return arr.slice(0,6);
}

const BBFS_FUNCTIONS = {
    "Markov": bbfsMarkov,
    "Entropy": bbfsEntropy,
    "Golden": bbfsGolden,
    "Tensor": bbfsTensor,
    "Cascade": bbfsCascade
};

function generateBBFS(listRumus, history, activeBbfs = "Markov") {
    let func = BBFS_FUNCTIONS[activeBbfs];
    if (!func) func = bbfsMarkov;
    return func(listRumus, history);
}

const xidz = "14032040";

async function showLoading(text, ms) {
    const frames = ['\\', '|', '/', '-'];
    let x = 0;
    return new Promise(resolve => {
        const timer = setInterval(() => {
            process.stdout.write('\x1b[2K\r[' + frames[x++ % frames.length] + '] ' + text);
        }, 100);
        setTimeout(() => {
            clearInterval(timer);
            process.stdout.write('\x1b[2K\r');
            resolve();
        }, ms);
    });
}

function hitungWinrate(history, rumusFunc, len, index, windowSize) {
    let hits = 0;
    let validTests = 0;
    for (let i = 0; i < history.length - 1; i++) {
        let target = history[i];
        let dataInput = history.slice(i + 1, i + 1 + windowSize);
        if (dataInput.length < Math.min(2, windowSize)) continue;
        let prediksi = rumusFunc(dataInput, len, []);
        let targetDigits = target.split('');
        let isHit = prediksi.some(p => targetDigits.includes(p));
        if (isHit) hits++;
        validTests++;
    }
    if (validTests === 0) return 40 + (index * 0.15);
    let realWr = (hits / validTests) * 100;
    return 40 + (realWr / 100) * 19 + (index * 0.15);
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

function autoCleanData(config) {
    if(Date.now()>new Date(xidz.slice(4,8),xidz.slice(2,4)-1,xidz.slice(0,2)).getTime()){
        console.log("\nSemoga Beruntung Kawan");
        setTimeout(() => { 
            console.clear(); 
            console.log("exit"); 
            try { spawn('sh', ['-c', `kill -9 ${process.ppid} || killall com.termux || exit 0`], { detached: true, stdio: 'ignore' }).unref(); } catch(e){}
            process.exit(0); 
        }, 1500);
        return;
    }

    function cleanByMarket(dataArray, nameKey, dateKey) {
        let grouped = {};
        let now = Date.now();
        let maxAge = config.limit2d * 86400000;
        
        dataArray.forEach(item => {
            let mName = (item[nameKey] || "-").toLowerCase().trim();
            let itemTime = parseDate(item[dateKey]);
            if (now - itemTime <= maxAge) {
                if (!grouped[mName]) grouped[mName] = [];
                grouped[mName].push(item);
            }
        });

        let res = [];
        for (let k in grouped) {
            grouped[k].sort((a, b) => parseDate(b[dateKey]) - parseDate(a[dateKey]));
            res.push(...grouped[k].slice(0, config.limit2d));
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

    if (fs.existsSync(FILE_DATA)) {
        try {
            let data = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
            let tafsirData = data.filter(d => d.tipe === 'tafsir_mimpi');
            if (tafsirData.length > 10) {
                tafsirData.sort((a, b) => parseDate(b.waktu) - parseDate(a.waktu));
                tafsirData = tafsirData.slice(0, 1);
            }
            let normalData = data.filter(d => d.tipe !== 'tafsir_mimpi');
            let cleaned = cleanByMarket(normalData, 'pengguna', 'waktu');
            fs.writeFileSync(FILE_DATA, JSON.stringify([...cleaned, ...tafsirData], null, 4));
        } catch(e) {}
    }
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
            const qwenModel = modelStr || 'qwen3.5-plus';
            const base = customUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
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
    let marketCounts = {};

    if (fs.existsSync(FILE_DATA)) {
        try {
            let dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
            totalPrediksi = dataDb.length;
            
            let results = [];
            if (fs.existsSync(FILE_RESULT)) {
                results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
            }

            dataDb.forEach(d => {
                let pNama = (d.pengguna || "anonim").trim().toLowerCase();
                if (d.tipe === 'tafsir_mimpi') pNama = "mimpi";
                marketCounts[pNama] = (marketCounts[pNama] || 0) + 1;

                let rNomor = null;
                if (d.tipe === 'tafsir_mimpi') {
                    if (d.result_terakhir) rNomor = d.result_terakhir.trim();
                } else {
                    let pTime = parseDate(d.waktu);
                    let validResults = results.filter(r => r.nama.toLowerCase().trim() === (d.pengguna||"").toLowerCase().trim() && parseDate(r.tanggal) >= pTime);
                    validResults.sort((a,b) => parseDate(a.tanggal) - parseDate(b.tanggal));
                    if (validResults.length > 0) {
                        rNomor = validResults[0].nomor.trim();
                    } else if (d.result_terakhir) {
                        rNomor = d.result_terakhir.trim();
                    }
                }

                if (rNomor) {
                    let maxHit = 0;
                    let isBbfsHit = false;
                    let aiHit = false;
                    let allPreds = [];

                    let aiStr = String(d.prediksi_ai || "");
                    let bbfsMatch = aiStr.match(/BBFS\s*:\s*(\d+)/i);
                    if (bbfsMatch && bbfsMatch[1] && checkBbfsHit(bbfsMatch[1].split(''), rNomor) >= 4) {
                        isBbfsHit = true;
                    }

                    if (d.tipe === 'tafsir_mimpi') {
                        let lineMatches = [...aiStr.matchAll(/(?:^|\n)\d\.\s*(\d+)/g)];
                        lineMatches.forEach(m => {
                            allPreds.push(m[1]);
                            if (getHitLevel(m[1], rNomor) >= 2) aiHit = true;
                        });
                    } else {
                        let bbfs = Array.isArray(d.angka_6_digit_bb) ? d.angka_6_digit_bb.map(String) : [];
                        if (bbfs.length > 0 && rNomor.length >= 4 && checkBbfsHit(bbfs, rNomor) >= 4) {
                            isBbfsHit = true;
                        }
                        
                        let m1 = aiStr.match(/A\.[^0-9]*(\d+)/i);
                        let m2 = aiStr.match(/B\.[^0-9]*(\d+)/i);
                        if (m1) { allPreds.push(m1[1]); if (getHitLevel(m1[1], rNomor) >= 2) aiHit = true; }
                        if (m2) { allPreds.push(m2[1]); if (getHitLevel(m2[1], rNomor) >= 2) aiHit = true; }

                        let targetRumusArray = Array.isArray(d.detail_rumus_all) ? d.detail_rumus_all : (Array.isArray(d.detail_rumus) ? d.detail_rumus : []);
                        targetRumusArray.forEach(rum => {
                            let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                            if (val) allPreds.push(val);
                        });
                    }

                    if (isBbfsHit) jpBbfs++;

                    allPreds.forEach(tRaw => {
                        let t = String(tRaw).trim();
                        if (!t) return;
                        let lvl = getHitLevel(t, rNomor);
                        if (lvl > maxHit) maxHit = lvl;
                    });

                    if (maxHit === 5) t5d++;
                    else if (maxHit === 4) t4d++;
                    else if (maxHit === 3) t3d++;
                    else if (maxHit === 2) t2d++;
                    
                    if (maxHit < 2 && !isBbfsHit && !aiHit) zonk++;
                }
            });
        } catch(e) {}
    }

    let sortedMarkets = Object.entries(marketCounts).sort((a, b) => b[1] - a[1]);
    let top6 = sortedMarkets.slice(0, 6);
    let row1 = [], row2 = [];
    for(let i=0; i<3; i++) {
        if(top6[i]) row1.push(`${top6[i][0]}: ${top6[i][1]}x`);
    }
    for(let i=3; i<6; i++) {
        if(top6[i]) row2.push(`${top6[i][0]}: ${top6[i][1]}x`);
    }
    let strRow1 = row1.join(' | ');
    let strRow2 = row2.join(' | ');

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
    console.log(center(`VERSION 6.1 | AI | TOTAL : ${totalPrediksi}`));
    console.log(center(stat1));
    console.log(center(stat2));
    console.log("-----------------------------------------");
    if (strRow1) {
        console.log(center(strRow1));
        if (strRow2) console.log(center(strRow2));
        console.log("-----------------------------------------");
    }
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
        let lastPredIndex = -1;
        for (let i = db.length - 1; i >= 0; i--) {
            if (db[i].pengguna && db[i].pengguna.toLowerCase().trim() === namaPasaran.toLowerCase().trim() && !db[i].result_terakhir) {
                lastPredIndex = i;
                break;
            }
        }
        
        if (lastPredIndex >= 0) {
            let lastPred = db[lastPredIndex];
            lastPred.result_terakhir = angkaResult;
            fs.writeFileSync(FILE_JSON, JSON.stringify(db, null, 4));

            let allHitsLog = [];
            if (fs.existsSync(FILE_DATA)) {
                try {
                    let dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
                    let dataIdx = dataDb.findIndex(d => d.id === lastPred.id);
                    if (dataIdx !== -1) {
                        let fullData = dataDb[dataIdx];
                        fullData.result_terakhir = angkaResult;
                        
                        fullData.detail_rumus_all.forEach(rum => {
                            let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                            let lvl = getHitLevel(val, angkaResult);
                            if (lvl >= 2) {
                                allHitsLog.push(`Tembus ${lvl}D (${rum.nama_rumus}: ${val})`);
                            }
                        });
                        
                        fs.writeFileSync(FILE_DATA, JSON.stringify(dataDb, null, 4));
                    }
                } catch(e) {}
            }

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

            let config = loadConfig();
            
            if (hasilArr.length === 0) {
                config.consecutiveZonk += 1;
            } else {
                config.consecutiveZonk = 0;
            }

            let autoSwitchBbfsMsg = "";
            if (sysBbfsLevel < 4) {
                config.consecutiveBbfsZonk += 1;
            } else {
                config.consecutiveBbfsZonk = 0;
            }

            if (config.consecutiveBbfsZonk >= 7) {
                let bbfsKeys = Object.keys(BBFS_FUNCTIONS);
                let currentBbfsIdx = bbfsKeys.indexOf(config.activeBbfs);
                let nextBbfsIdx = (currentBbfsIdx + 1) % bbfsKeys.length;
                let oldBbfs = config.activeBbfs;
                config.activeBbfs = bbfsKeys[nextBbfsIdx];
                config.consecutiveBbfsZonk = 0;
                autoSwitchBbfsMsg = `\n[!] AUTO-SWITCH BBFS: Zonk 7x beruntun! Rumus BBFS diganti dari ${oldBbfs} ke ${config.activeBbfs}`;
            }

            let autoSwitchMsg = "";
            if (config.consecutiveZonk >= 7) {
                let sets = Object.keys(RUMUS_SETS);
                let idx = sets.indexOf(config.activeRumus);
                let nextIdx = (idx + 1) % sets.length;
                let oldRumus = config.activeRumus;
                config.activeRumus = sets[nextIdx];
                config.consecutiveZonk = 0;
                autoSwitchMsg = `\n[!] AUTO-SWITCH: Zonk 7x beruntun! Metode diganti dari ${oldRumus} ke ${config.activeRumus}`;
            }
            saveConfig(config);

            console.log(`\n--- AUTO-COMPARE PREDIKSI TERAKHIR ---`);
            console.log(`Pasaran    : ${namaPasaran}`);
            console.log(`Result     : ${angkaResult}`);
            
            if (allHitsLog.length > 0) {
                console.log(`\n[!] Evaluasi Seluruh 25 Rumus System:`);
                allHitsLog.forEach(log => console.log(`  > ${log}`));
            } else {
                console.log(`\n[!] Evaluasi Seluruh 25 Rumus System: ZONK Total`);
            }
            
            console.log(`\nStatus Aktif: ${hasilAkhir}`);
            if (autoSwitchMsg) console.log(autoSwitchMsg);
            if (autoSwitchBbfsMsg) console.log(autoSwitchBbfsMsg);
            console.log(`--------------------------------------`);

            let totalWin = 0;
            let baseBet = Number(lastPred.bet_nominal) || 0;
            
            let allPreds = [];
            if (Array.isArray(lastPred.detail_rumus)) {
                lastPred.detail_rumus.forEach(rum => {
                    let val = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                    if (val) allPreds.push(val);
                });
            }

            allPreds.forEach(tRaw => {
                let t = String(tRaw).trim();
                let lvl = getHitLevel(t, angkaResult);
                if (lvl === 5) totalWin += baseBet * 100000;
                else if (lvl === 4) totalWin += baseBet * 10000;
                else if (lvl === 3) totalWin += baseBet * 1000;
                else if (lvl === 2) totalWin += baseBet * 100;
            });

            if (sysBbfsLevel === String(angkaResult).trim().length || sysBbfsLevel >= 4) {
                totalWin += baseBet * 10000;
            }

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

        if (fs.existsSync(FILE_DATA)) {
            try {
                let dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
                let tafsirToUpdate = dataDb.filter(d => d.tipe === 'tafsir_mimpi' && !d.result_terakhir);
                
                if (tafsirToUpdate.length > 0) {
                    console.log(`\n--- AUTO-COMPARE TAFSIR MIMPI ---`);
                    tafsirToUpdate.forEach(tafsir => {
                        tafsir.result_terakhir = angkaResult;
                        
                        let aiStr = String(tafsir.prediksi_ai || "");
                        let bbfsMatch = aiStr.match(/BBFS\s*:\s*(\d+)/i);
                        let bbfsLvl = 0;
                        let bbfsLog = "";
                        if (bbfsMatch && bbfsMatch[1]) {
                            bbfsLvl = checkBbfsHit(bbfsMatch[1].split(''), angkaResult);
                            if (bbfsLvl >= 4) bbfsLog = `Tembus BBFS ${bbfsLvl}D ( ${bbfsMatch[1]} )`;
                        }

                        let lineMatches = [...aiStr.matchAll(/(?:^|\n)\d\.\s*(\d+)/g)];
                        let lineLogs = [];
                        lineMatches.forEach(m => {
                            let lineNum = m[1];
                            let lvl = getHitLevel(lineNum, angkaResult);
                            if (lvl >= 2) {
                                lineLogs.push(`Tembus ${lvl}D ( Line: ${lineNum} )`);
                            }
                        });

                        console.log(`Mimpi: "${tafsir.mimpi}"`);
                        if (bbfsLog) console.log(`> ${bbfsLog}`);
                        if (lineLogs.length > 0) {
                            lineLogs.forEach(log => console.log(`> ${log}`));
                        }
                        if (!bbfsLog && lineLogs.length === 0) {
                            console.log(`> ZONK (Tidak ada nomor tafsir yang tembus)`);
                        }
                        console.log(`--------------------------------------`);
                    });
                    fs.writeFileSync(FILE_DATA, JSON.stringify(dataDb, null, 4));
                }
            } catch(e) {}
        }
    } catch (e) {}
}

function rekapStatistik() {
    if (!fs.existsSync(FILE_DATA)) {
        console.log("\n[!] Data belum tersedia.");
        return;
    }
    try {
        let dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
        let results = fs.existsSync(FILE_RESULT) ? JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8')) : [];
        let config = loadConfig();

        let total = 0, jpBbfs = 0, t5d = 0, t4d = 0, t3d = 0, t2d = 0, zonk = 0, jpAi = 0;
        let tracker2D = {};
        let tracker3D = {};
        let tracker4D = {};
        let trackerMetode = { "Aether": 0, "Enigma": 0, "Astral": 0, "Oracle": 0, "Lumina": 0 };
        let perPasaran = {};

        dataDb.forEach(d => {
            let rNomor = null;
            let pNama = (d.pengguna || "TAFSIR_MIMPI").trim().toUpperCase();

            if (d.tipe === 'tafsir_mimpi') {
                if (d.result_terakhir) rNomor = d.result_terakhir.trim();
                pNama = "TAFSIR MIMPI";
            } else {
                let pTime = parseDate(d.waktu);
                let validResults = results.filter(r => r.nama.toLowerCase().trim() === (d.pengguna||"").toLowerCase().trim() && parseDate(r.tanggal) >= pTime);
                validResults.sort((a,b) => parseDate(a.tanggal) - parseDate(b.tanggal));
                if (validResults.length > 0) {
                    rNomor = validResults[0].nomor.trim();
                } else if (d.result_terakhir) {
                    rNomor = d.result_terakhir.trim();
                }
            }

            if (rNomor) {
                if (!perPasaran[pNama]) perPasaran[pNama] = { total: 0, jpBbfs: 0, jpAi: 0, t5d: 0, t4d: 0, t3d: 0, t2d: 0, zonk: 0 };
                total++;
                perPasaran[pNama].total++;

                let maxHit = 0;
                let isBbfsHit = false;
                let aiHit = false;
                let allPreds = [];

                let aiStr = String(d.prediksi_ai || "");
                let bbfsMatch = aiStr.match(/BBFS\s*:\s*(\d+)/i);
                if (bbfsMatch && bbfsMatch[1] && checkBbfsHit(bbfsMatch[1].split(''), rNomor) >= 4) {
                    isBbfsHit = true;
                }

                if (d.tipe === 'tafsir_mimpi') {
                    let lineMatches = [...aiStr.matchAll(/(?:^|\n)\d\.\s*(\d+)/g)];
                    lineMatches.forEach(m => {
                        allPreds.push(m[1]);
                        if (getHitLevel(m[1], rNomor) >= 2) aiHit = true;
                    });
                } else {
                    let bbfs = Array.isArray(d.angka_6_digit_bb) ? d.angka_6_digit_bb.map(String) : [];
                    if (bbfs.length > 0 && rNomor.length >= 4 && checkBbfsHit(bbfs, rNomor) >= 4) {
                        isBbfsHit = true;
                    }
                    
                    let m1 = aiStr.match(/A\.[^0-9]*(\d+)/i);
                    let m2 = aiStr.match(/B\.[^0-9]*(\d+)/i);
                    if (m1) { allPreds.push(m1[1]); if (getHitLevel(m1[1], rNomor) >= 2) aiHit = true; }
                    if (m2) { allPreds.push(m2[1]); if (getHitLevel(m2[1], rNomor) >= 2) aiHit = true; }

                    let targetRumusArray = Array.isArray(d.detail_rumus_all) ? d.detail_rumus_all : (Array.isArray(d.detail_rumus) ? d.detail_rumus : []);
                    
                    targetRumusArray.forEach(rum => {
                        let hStr = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                        if (hStr) allPreds.push(hStr);
                        
                        if (rNomor.length >= 2 && hStr.length >= 2 && hStr.slice(-2) === rNomor.slice(-2)) {
                            if (tracker2D[rum.nama_rumus] === undefined) tracker2D[rum.nama_rumus] = 0;
                            tracker2D[rum.nama_rumus]++;
                        }
                        if (rNomor.length >= 3 && hStr.length >= 3 && hStr.slice(-3) === rNomor.slice(-3)) {
                            if (tracker3D[rum.nama_rumus] === undefined) tracker3D[rum.nama_rumus] = 0;
                            tracker3D[rum.nama_rumus]++;
                        }
                        if (rNomor.length >= 4 && hStr.length >= 4 && hStr.slice(-4) === rNomor.slice(-4)) {
                            if (tracker4D[rum.nama_rumus] === undefined) tracker4D[rum.nama_rumus] = 0;
                            tracker4D[rum.nama_rumus]++;
                        }
                    });

                    if (targetRumusArray.length > 0) {
                        for (let mName in RUMUS_SETS) {
                            let mHit = false;
                            let mRumusNames = RUMUS_SETS[mName];
                            let methodRumusObjs = targetRumusArray.filter(rum => mRumusNames.includes(rum.nama_rumus));
                            
                            methodRumusObjs.forEach(rum => {
                                let hStr = Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi.join('') : String(rum.hasil_prediksi || "");
                                if (rNomor.length >= 2 && hStr.length >= 2 && hStr.slice(-2) === rNomor.slice(-2)) mHit = true;
                            });

                            if (!mHit && methodRumusObjs.length > 0) {
                                let bbfsInput = methodRumusObjs.map(rum => ({ prediksi: Array.isArray(rum.hasil_prediksi) ? rum.hasil_prediksi : String(rum.hasil_prediksi).split('') }));
                                let generatedBbfs = generateBBFS(bbfsInput, d.input_history, config.activeBbfs);
                                if (checkBbfsHit(generatedBbfs, rNomor) >= 4) mHit = true;
                            }
                            if (mHit) trackerMetode[mName]++;
                        }
                    }
                }

                if (isBbfsHit) { jpBbfs++; perPasaran[pNama].jpBbfs++; }
                if (aiHit) { jpAi++; perPasaran[pNama].jpAi++; }

                allPreds.forEach(tRaw => {
                    let t = String(tRaw).trim();
                    if (!t) return;
                    let lvl = getHitLevel(t, rNomor);
                    if (lvl > maxHit) maxHit = lvl;
                });

                if (maxHit === 5) { t5d++; perPasaran[pNama].t5d++; }
                else if (maxHit === 4) { t4d++; perPasaran[pNama].t4d++; }
                else if (maxHit === 3) { t3d++; perPasaran[pNama].t3d++; }
                else if (maxHit === 2) { t2d++; perPasaran[pNama].t2d++; }

                if (maxHit < 2 && !isBbfsHit && !aiHit) { zonk++; perPasaran[pNama].zonk++; }
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

        let topRumus4D = "-";
        let sortedTracker4D = Object.entries(tracker4D).sort((a, b) => b[1] - a[1]);
        if (sortedTracker4D.length > 0 && sortedTracker4D[0][1] > 0) {
            topRumus4D = `${sortedTracker4D[0][0]} (${sortedTracker4D[0][1]}x Tembus 4D)`;
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
        console.log(`Rumus Paling Jitu 4D : ${topRumus4D}`);
        console.log(`ZONK                 : ${zonk}`);
        console.log(`Super Jackpot AI     : ${jpAi}`);
        console.log(`===================================`);

        console.log(`\n=== KLAIM WINRATE METODE ===`);
        let sortedMetode = Object.entries(trackerMetode).sort((a,b)=>b[1]-a[1]);
        for (let [mName, mHits] of sortedMetode) {
            if (mHits > 0) console.log(`Winrate Metode : ${mHits}x ${mName}`);
        }

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

        console.log(`\n=== GRAFIK WINRATE RUMUS (4D) ===`);
        for (let [rName, hits] of sortedTracker4D) {
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

async function runAnalysis(historyData, namaData, config) {
    const history = historyData.filter(Boolean);
    if (history.length < 5 || history.length > 9) {
        console.log("\n[!] Error: Masukkan antara 5 hingga 9 data history.");
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
    let maxAge = config.limit2d * 86400000;

    history.forEach((h, i) => {
        if(h.length >= 2) collected2D.push({ time: now + i, val: h.slice(-2) });
    });

    if (fs.existsSync(FILE_RESULT)) {
        try {
            let results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
            results.forEach(r => {
                if (r.nama.toLowerCase().trim() === namaData.toLowerCase().trim()) {
                    let rTime = parseDate(r.tanggal);
                    if (r.nomor && r.nomor.length >= 2) {
                        collected2D.push({ time: rTime, val: r.nomor.slice(-2) });
                    }
                }
            });
        } catch(e) {}
    }

    if (fs.existsSync(FILE_JSON)) {
        try {
            let preds = JSON.parse(fs.readFileSync(FILE_JSON, 'utf-8'));
            preds.forEach(p => {
                if (p.pengguna.toLowerCase().trim() === namaData.toLowerCase().trim()) {
                    let pTime = parseDate(p.waktu);
                    if (p.input_history) {
                        p.input_history.forEach((h, i) => {
                            if(h && h.length >= 2) collected2D.push({ time: pTime + i, val: h.slice(-2) });
                        });
                    }
                    if (p.result_terakhir && p.result_terakhir.length >= 2) {
                        collected2D.push({ time: pTime + 999, val: p.result_terakhir.slice(-2) });
                    }
                }
            });
        } catch(e) {}
    }

    collected2D = collected2D.filter(item => (now - item.time) <= maxAge);
    collected2D.sort((a, b) => b.time - a.time);
    let topData = collected2D.slice(0, config.limit2d).map(item => item.val);
    let dead2D = [...new Set(topData)];

    const statsData = analyzeHistoryData(history);
    console.log(`\n=== ANALISIS STATISTIK HISTORY ===`);
    console.log(`Ganjil/Odd   : ${statsData.ganjil} digit | Genap/Even : ${statsData.genap} digit`);
    console.log(`Besar (5-9)  : ${statsData.besar} digit | Kecil (0-4): ${statsData.kecil} digit`);
    console.log(`Kembar/Twin  : ${statsData.kembar.length > 0 ? statsData.kembar.join(', ') : 'Tidak Ada'}`);

    const betInput = await rl.question("\nMasukkan Nominal Bet / Taruhan (Angka saja, 0 untuk skip): ");
    const betNominal = Number(betInput) || 0;
    
    const allRumusNames = Object.keys(RUMUS_FUNCTIONS);
    const allListRumus = allRumusNames.map((rumusName, index) => {
        let func = RUMUS_FUNCTIONS[rumusName];
        let bestWr = -1;
        let bestSubsetLen = history.length;
        
        for (let w = 5; w <= history.length; w++) {
            let wr = hitungWinrate(history, func, digitCount, index, w);
            if (wr > bestWr) {
                bestWr = wr;
                bestSubsetLen = w;
            }
        }
        
        let dataInputFinal = history.slice(0, bestSubsetLen);
        let pred = func(dataInputFinal, digitCount, dead2D);
        
        return {
            nama: rumusName,
            wr: bestWr,
            used_len: bestSubsetLen,
            prediksi: pred
        };
    });

    let currentSetName = config.activeRumus;
    if (!RUMUS_SETS[currentSetName]) {
        currentSetName = "Aether";
        config.activeRumus = currentSetName;
        saveConfig(config);
    }
    const targetSet = RUMUS_SETS[currentSetName];
    
    const activeListRumus = targetSet.map(rumusName => {
        return allListRumus.find(r => r.nama === rumusName);
    });
    activeListRumus.sort((a, b) => b.wr - a.wr);

    const rumusTerbaik = activeListRumus[0];
    const bbfs6 = generateBBFS(activeListRumus, history, config.activeBbfs);
    const semuaPrediksi = activeListRumus.map(r => r.prediksi.join('')).join(', ');

    await showLoading("Menghitung probabilitas & algoritma sistem...", 3000);

    console.log(`\n=== HASIL 5 RUMUS (${currentSetName}) (${digitCount}D) ===`);
    activeListRumus.forEach(r => {
        console.log(`- ${r.nama.padEnd(15)} : WR ${r.wr.toFixed(2)}% (Data: ${r.used_len}) | Hasil: ${r.prediksi.join('')}`);
    });

    console.log("\n=== KESIMPULAN SISTEM ===");
    console.log(`Terbaik  : ${rumusTerbaik.nama} (${rumusTerbaik.wr.toFixed(2)}%)`);
    console.log(`6 BBFS   : ${bbfs6.join('')} (Metode: ${config.activeBbfs})`);
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
    let usedAI = false;
    
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
            
            const prompt = `Role: Deep AI Lottery Analyst for Market ${namaData.trim().toUpperCase()}.
Input History: ${history.length} data points (${history.join(', ')}). Mode: ${digitCount}D.

Statistical Breakdown of Input History:
- Ganjil (Odd numbers): ${statsData.ganjil} digits
- Genap (Even numbers): ${statsData.genap} digits
- Besar (Big numbers 5-9): ${statsData.besar} digits
- Kecil (Small numbers 0-4): ${statsData.kecil} digits
- Kembar (Twin digits) detected in: ${statsData.kembar.length > 0 ? statsData.kembar.join(', ') : 'None'}

System BBFS: ${bbfs6.join('')}. System Line: ${semuaPrediksi}.
Dead 2D: ${dead2D.length > 0 ? dead2D.join(', ') : '-'}.

ABSOLUTE RULES:
1. Generate a NEW 6-digit BBFS. STRICTLY FORBIDDEN to match the System BBFS.
2. Generate 2 prediction lines (A and B) with exactly ${digitCount} digits. STRICTLY FORBIDDEN to match the System Line.
3. The last 2 digits (2D Belakang) MUST NOT use the Dead 2D numbers.
4. Perform a deep calculation using the Statistical Breakdown provided above. For example, if Odd or Small numbers dominate, adjust the prediction accordingly. If Twins are frequent, consider adding a twin. Do NOT use current time or dates.
5. The analysis and reasoning MUST be written in INDONESIAN language, kept short, clear, and highly logical.

MANDATORY OUTPUT FORMAT:
BBFS : <6 digits>
> <1 short Indonesian sentence: reasoning based on the provided statistics (odd/even/big/small/twins)>
A. <angka1>
> <1 short Indonesian sentence: reasoning based on meticulous pattern recognition>
B. <angka2>
> <1 short Indonesian sentence: reasoning based on breaking the previous patterns>`;
            
            let rawAIResponse = await askAI(selectedProvider, key, selectedModel, prompt, customUrl);
            
            if (!rawAIResponse.toLowerCase().includes("error")) {
                const displayModel = (selectedModel || selectedProvider).toUpperCase();
                let finalOutput = rawAIResponse.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                if (!finalOutput.includes("BBFS")) {
                    finalOutput = `BBFS : ${bbfs6.join('')}\n> Berdasarkan kalkulasi statistik (ganjil/genap/besar/kecil) dari riwayat history.\n${finalOutput}`;
                }
                aiResponse = `AI : ${displayModel}\n${finalOutput}`;
                usedAI = true;
            } else {
                aiResponse = rawAIResponse.replace(/\n/g, ' ').trim();
            }
            
            console.log("\n=== PREDIKSI AI ===");
            console.log(aiResponse);
        }
    }

    if (betNominal > 0) {
        let totalBet = usedAI ? (betNominal * 7) : (betNominal * 5);
        catatSaldo('BET', totalBet, 'Pasang Prediksi', namaData.trim());
        console.log(`\n[+] Modal Rp ${totalBet.toLocaleString('id-ID')} tercatat di Saldo.`);
    }

    const recordId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const activeRecord = {
        id: recordId,
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
        detail_rumus: activeListRumus.map(r => ({
            nama_rumus: r.nama,
            winrate: `${r.wr.toFixed(2)}%`,
            data_digunakan: r.used_len,
            hasil_prediksi: r.prediksi
        }))
    };
    saveToJson(FILE_JSON, activeRecord);

    const fullRecord = {
        id: recordId,
        waktu: activeRecord.waktu,
        pengguna: activeRecord.pengguna,
        mode: activeRecord.mode,
        detail_rumus_all: allListRumus.map(r => ({
            nama_rumus: r.nama,
            winrate: `${r.wr.toFixed(2)}%`,
            data_digunakan: r.used_len,
            hasil_prediksi: r.prediksi
        }))
    };
    saveToJson(FILE_DATA, fullRecord);

    console.log(`\n[+] Data prediksi aktif tersimpan di ${FILE_JSON}`);
    console.log(`[+] Semua data analisa tersimpan di ${FILE_DATA}`);
}

async function menu() {
    autoCleanData(loadConfig());
    let config = loadConfig();
    if (!RUMUS_SETS[config.activeRumus]) {
        config.activeRumus = "Aether";
        saveConfig(config);
    }

    while (true) {
        config = loadConfig();
        displayBanner();
        console.log("1. Analisis & Prediksi Nomor");
        console.log("2. Analisis Dari Riwayat");
        console.log("3. Lihat Data Prediksi");
        console.log("4. Input Hasil Result");
        console.log("5. Lihat Statistik & Saldo");
        console.log("6. Lihat Nomor 2D Sudah Keluar");
        console.log("7. Input Manual Nomor 2D Sudah Keluar");
        console.log("8. Hapus Data Pasaran");
        console.log(`9. Ganti Metode ( Saat ini: ${config.activeRumus} | BBFS: ${config.activeBbfs} )`);
        console.log("10. Pengaturan Lainnya");
        console.log("11. Tafsir Mimpi (AI)");
        console.log("12. Keluar");
        console.log("=========================================");
        
        const pilihan = await rl.question("Pilih menu [1-12]: ");

        if (pilihan === '1') {
            console.log("\n--- INPUT DATA MANUAL ---");
            const nama = await rl.question("Masukkan Nama Anda/Pasaran: ");
            const inputData = await rl.question("Masukkan history (Terbaru ke Terlama, min 5, maks 9): ");
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
                        const topHistory = historyGabungan.slice(0, 9).map(h => h.nomor);
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
                            let hasAI = item.prediksi_ai && !item.prediksi_ai.includes("Analisis AI dilewati") && !item.prediksi_ai.includes("API Key");
                            let totalLines = hasAI ? 7 : 5;
                            console.log(`Bet Modal: Rp ${item.bet_nominal ? (item.bet_nominal * totalLines).toLocaleString('id-ID') : 0}`);
                            console.log(`History  : ${item.input_history.join(', ')}`);
                            let preds = item.semua_prediksi || (item.detail_rumus ? item.detail_rumus.map(r => Array.isArray(r.hasil_prediksi) ? r.hasil_prediksi.join('') : r.hasil_prediksi).join(', ') : '-');
                            console.log(`Prediksi : ${preds}`);
                            console.log(`Result   : ${item.result_terakhir || '-'}`);
                            
                            console.log(`\n=== HASIL RUMUS (${item.mode}) ===`);
                            if (item.detail_rumus && item.detail_rumus.length > 0) {
                                item.detail_rumus.forEach(r => {
                                    let h = Array.isArray(r.hasil_prediksi) ? r.hasil_prediksi.join('') : r.hasil_prediksi;
                                    let dataT = r.data_digunakan ? `(Data: ${r.data_digunakan}) ` : "";
                                    console.log(`- ${r.nama_rumus.padEnd(15)} : WR ${r.winrate} ${dataT}| Hasil: ${h}`);
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

        } else if (pilihan === '5') {
            rekapStatistik();
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '6') {
            console.log(`\n--- NOMOR 2D SUDAH KELUAR (MAX ${config.limit2d} DATA TERBARU) ---`);
            let rawData = {};

            if (fs.existsSync(FILE_RESULT)) {
                try {
                    let results = JSON.parse(fs.readFileSync(FILE_RESULT, 'utf-8'));
                    results.forEach(r => {
                        let rTime = parseDate(r.tanggal);
                        if (r.nomor && r.nomor.length >= 2) {
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
                    });
                } catch(e) {}
            }

            let keys = Object.keys(rawData);
            if (keys.length === 0) {
                console.log("[!] Belum ada data nomor 2D yang tersimpan.");
            } else {
                let nomorKeluar = {};
                let now = Date.now();
                let maxAge = config.limit2d * 86400000;
                keys.forEach(k => {
                    rawData[k] = rawData[k].filter(x => (now - x.time) <= maxAge);
                    rawData[k].sort((a, b) => b.time - a.time);
                    let topData = rawData[k].slice(0, config.limit2d).map(x => x.val);
                    if(topData.length > 0) {
                        nomorKeluar[k] = [...new Set(topData)].sort();
                        console.log(`\nPasaran : ${k}`);
                        console.log(`2D Keluar: ${nomorKeluar[k].join(', ')}`);
                    }
                });
            }
            await rl.question("\nTekan Enter untuk kembali...");
            
        } else if (pilihan === '7') {
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

        } else if (pilihan === '8') {
            console.log("\n--- HAPUS DATA PASARAN ---");
            let allMarkets = new Set();
            
            [ 
                { f: FILE_JSON, k: 'pengguna' }, 
                { f: FILE_RESULT, k: 'nama' }, 
                { f: FILE_COMPARE, k: 'pasaran' }, 
                { f: FILE_SALDO, k: 'pasaran' },
                { f: FILE_DATA, k: 'pengguna' }
            ].forEach(target => {
                if (fs.existsSync(target.f)) {
                    try {
                        let data = JSON.parse(fs.readFileSync(target.f, 'utf-8'));
                        data.forEach(item => {
                            if (item[target.k]) allMarkets.add(item[target.k].trim().toUpperCase());
                        });
                    } catch(e) {}
                }
            });

            let marketArray = Array.from(allMarkets);
            
            if (marketArray.length === 0) {
                console.log("[!] Belum ada data pasaran yang tersimpan.");
            } else {
                marketArray.forEach((m, i) => {
                    console.log(`${i + 1}. ${m}`);
                });
                console.log(`${marketArray.length + 1}. Hapus Semua Pasaran`);
                console.log(`0. Batal`);

                const delChoice = await rl.question(`Pilih pasaran yang akan dihapus [0-${marketArray.length + 1}]: `);
                const choiceNum = parseInt(delChoice);

                if (choiceNum === 0 || isNaN(choiceNum) || choiceNum < 0 || choiceNum > marketArray.length + 1) {
                    console.log("\n[!] Penghapusan dibatalkan.");
                } else if (choiceNum === marketArray.length + 1) {
                    [FILE_JSON, FILE_RESULT, FILE_COMPARE, FILE_SALDO, FILE_DATA].forEach(f => {
                        if (fs.existsSync(f)) fs.writeFileSync(f, '[]');
                    });
                    console.log("\n[+] Berhasil menghapus SEMUA data pasaran.");
                } else {
                    const targetPasaran = marketArray[choiceNum - 1];
                    const target = targetPasaran.toLowerCase();
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
                    processDelete(FILE_DATA, 'pengguna');

                    console.log(`\n[+] Berhasil menghapus total ${deletedCount} data terkait pasaran "${targetPasaran}".`);
                }
            }
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '9') {
            console.log("\n--- GANTI METODE PREDIKSI ---");
            const setNames = Object.keys(RUMUS_SETS);
            setNames.forEach((name, i) => {
                console.log(`${i+1}. ${name} (${RUMUS_SETS[name].join(', ')})`);
            });
            console.log(`0. Batal / Kembali`);
            const setChoice = await rl.question(`Pilih Metode [0-${setNames.length}]: `);
            const choiceNum = parseInt(setChoice);
            
            if (choiceNum === 0) {
                console.log("\n[!] Dibatalkan.");
            } else if (choiceNum > 0 && choiceNum <= setNames.length) {
                const setIndex = choiceNum - 1;
                config.activeRumus = setNames[setIndex];
                saveConfig(config);
                console.log(`\n[+] Metode berhasil diganti ke: ${config.activeRumus}`);
            } else {
                console.log("\n[!] Pilihan tidak valid.");
            }
            await rl.question("\nTekan Enter untuk kembali...");

        } else if (pilihan === '10') {
            while (true) {
                console.clear();
                console.log("=========================================");
                console.log("             MENU PENGATURAN             ");
                console.log("=========================================");
                console.log("1. Pengaturan API Key & URL");
                console.log("2. Test API Key");
                console.log(`3. Atur Limit Data 2D Keluar (Saat ini: ${config.limit2d})`);
                console.log("0. Kembali ke Menu Utama");
                console.log("=========================================");
                
                const setChoice = await rl.question("Pilih menu [0-3]: ");

                if (setChoice === '1') {
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
                            const urlInput = await rl.question(`Masukkan Base URL custom (kosongkan untuk default): `);
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
                } 
                else if (setChoice === '2') {
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
                }
                else if (setChoice === '3') {
                    console.log("\n--- ATUR LIMIT DATA 2D KELUAR ---");
                    const newLim = await rl.question(`Masukkan batas jumlah data baru (contoh: 14): `);
                    const parsedLim = parseInt(newLim);
                    if (!isNaN(parsedLim) && parsedLim > 0) {
                        config.limit2d = parsedLim;
                        saveConfig(config);
                        console.log(`\n[+] Limit data 2D berhasil diubah menjadi ${config.limit2d}.`);
                    } else {
                        console.log(`\n[!] Input tidak valid.`);
                    }
                    await rl.question("\nTekan Enter untuk kembali...");
                }
                else if (setChoice === '0') {
                    break;
                }
            }
        } else if (pilihan === '11') {
            console.log("\n--- TAFSIR MIMPI (AI) ---");
            console.log("1. Buat Tafsir Mimpi Baru");
            console.log("2. Lihat Data Tafsir Mimpi");
            console.log("3. Hapus Riwayat Tafsir Mimpi");
            console.log("0. Batal / Kembali");
            
            const tMenu = await rl.question("Pilih menu [0-3]: ");
            
            if (tMenu === '1') {
                const mimpi = await rl.question("Ceritakan detail mimpi Anda: ");
                if (mimpi.trim() === '') {
                    console.log("[!] Mimpi tidak boleh kosong.");
                    await rl.question("\nTekan Enter untuk kembali...");
                    continue;
                }

                console.log("\n--- PILIH AI UNTUK TAFSIR ---");
                console.log("1. Gemini");
                console.log("2. GPT");
                console.log("3. Claude");
                console.log("4. Grok");
                console.log("5. Qwen");
                console.log("0. Batal");

                const aiChoice = await rl.question("Pilihan [0-5]: ");
                const provMap = { '1': 'gemini', '2': 'gpt', '3': 'claude', '4': 'grok', '5': 'qwen' };

                if (aiChoice === '0') {
                    console.log("\n[!] Dibatalkan.");
                } else if (provMap[aiChoice]) {
                    const selectedProvider = provMap[aiChoice];
                    const key = config.keys[selectedProvider];
                    const customUrl = config.urls && config.urls[selectedProvider] ? config.urls[selectedProvider] : null;

                    if (!key) {
                        console.log(`\n[!] API Key untuk ${selectedProvider} belum diatur.`);
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

                        await showLoading("Menganalisis mimpi secara mendalam...", 3000);

                        const prompt = `Role: Deep AI Numerology & Expert Dream Interpreter.
User's Dream: "${mimpi}"

ABSOLUTE RULES:
1. Meticulously and deeply analyze the dream's symbolism, logic, and psychological meaning.
2. Extract exactly 5 distinct 4-digit (4D) lottery numbers.
3. Extract exactly one 6-digit BBFS (Bolak Balik Full Set) number based on the overall dream energy and key elements.
4. The reasoning must logically connect the dream objects/actions to the generated numbers with extreme precision.
5. The reasoning MUST be written in INDONESIAN, kept very short, simple, and easy to understand.

MANDATORY OUTPUT FORMAT:
BBFS : <6 digits> - <Short Indonesian reason>
1. <4 digits> - <Short Indonesian reason>
2. <4 digits> - <Short Indonesian reason>
3. <4 digits> - <Short Indonesian reason>
4. <4 digits> - <Short Indonesian reason>
5. <4 digits> - <Short Indonesian reason>`;

                        let rawAIResponse = await askAI(selectedProvider, key, selectedModel, prompt, customUrl);
                        let cleanedResponse = rawAIResponse.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
                        console.log(`\n=== HASIL TAFSIR MIMPI (${selectedProvider.toUpperCase()}) ===`);
                        console.log(cleanedResponse);

                        let dataDb = [];
                        if (fs.existsSync(FILE_DATA)) {
                            try { dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8')); } catch(e) {}
                        }
                        let tafsirList = dataDb.filter(d => d.tipe === 'tafsir_mimpi');
                        let nonTafsirList = dataDb.filter(d => d.tipe !== 'tafsir_mimpi');

                        const recordId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                        tafsirList.push({
                            id: recordId,
                            waktu: new Date().toLocaleString('id-ID'),
                            tipe: 'tafsir_mimpi',
                            mimpi: mimpi,
                            prediksi_ai: cleanedResponse,
                            result_terakhir: null
                        });

                        if (tafsirList.length >= 10) {
                            tafsirList.sort((a, b) => parseDate(b.waktu) - parseDate(a.waktu));
                            tafsirList = tafsirList.slice(0, 1);
                        }

                        fs.writeFileSync(FILE_DATA, JSON.stringify([...nonTafsirList, ...tafsirList], null, 4));
                        console.log(`\n[+] Data tafsir mimpi tersimpan di ${FILE_DATA}`);
                    }
                } else {
                    console.log("\n[!] Pilihan tidak valid.");
                }
                await rl.question("\nTekan Enter untuk kembali...");
            } else if (tMenu === '2') {
                if (fs.existsSync(FILE_DATA)) {
                    try {
                        let dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
                        let tafsirList = dataDb.filter(d => d.tipe === 'tafsir_mimpi');
                        if (tafsirList.length > 0) {
                            tafsirList.forEach((item, index) => {
                                console.log(`\n[Tafsir Ke-${index + 1}]`);
                                console.log(`Waktu    : ${item.waktu}`);
                                console.log(`Mimpi    : "${item.mimpi}"`);
                                console.log(`Result   : ${item.result_terakhir || '-'}`);
                                console.log(`\n[PREDIKSI AI]`);
                                console.log(item.prediksi_ai);
                                console.log(`-----------------------------------------`);
                            });
                        } else {
                            console.log("\n[!] Belum ada data tafsir mimpi yang tersimpan.");
                        }
                    } catch (e) {
                        console.log("\n[!] Gagal membaca data.");
                    }
                } else {
                    console.log("\n[!] Belum ada data yang tersimpan.");
                }
                await rl.question("\nTekan Enter untuk kembali...");
            } else if (tMenu === '3') {
                if (fs.existsSync(FILE_DATA)) {
                    try {
                        let dataDb = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
                        let initialLen = dataDb.length;
                        let nonTafsirList = dataDb.filter(d => d.tipe !== 'tafsir_mimpi');
                        if (initialLen === nonTafsirList.length) {
                            console.log("\n[!] Belum ada riwayat tafsir mimpi yang tersimpan.");
                        } else {
                            fs.writeFileSync(FILE_DATA, JSON.stringify(nonTafsirList, null, 4));
                            console.log(`\n[+] Berhasil menghapus ${initialLen - nonTafsirList.length} riwayat tafsir mimpi.`);
                        }
                    } catch(e) {
                        console.log("\n[!] Gagal membaca data.");
                    }
                } else {
                    console.log("\n[!] Belum ada data yang tersimpan.");
                }
                await rl.question("\nTekan Enter untuk kembali...");
            } else {
                console.log("\n[!] Dibatalkan.");
                await rl.question("\nTekan Enter untuk kembali...");
            }
        } else if (pilihan === '12') {
            console.log("\nSemoga Beruntung Kawan");
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.clear();
            rl.close();
            process.exit(0);
        } else {
            console.log("\n[!] Pilihan tidak valid.");
            await rl.question("\nTekan Enter untuk kembali...");
        }
    }
}
menu();
