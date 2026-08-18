#!/usr/bin/env node
/* ==========================================================================
   KIEM TRUOC KHI PUSH — cua chan cho nhung loi DA TAI DIEN nhieu lan.
   --------------------------------------------------------------------------
   Chu tool 18/08/2026: *"day la cac phan hay loi khi push code len, em phai ghi
   nho lai cac diem nay de tu chinh sua cho cac lan sau"*.

   ☠️ VIET THANH SCRIPT CHU KHONG PHAI GHI CHU. Loi dan nam trong tai lieu thi
   lan sau van quen — da vap dung the ngay 31/07 (luat "4 o dai ly" nam trong
   changelog tu 15/07 ma khong ai tra).

   Chay:  node scripts/kiem-truoc-push.js
   Thoat khac 0 = CO LOI, dung push.

   ⚠️ Script nay chi kiem duoc thu doc bang van ban. Phan HINH HOC (can giua,
   neo trai, chong chu, o nhap co nhan dien duoc khong) phai do tren DOM —
   xem muc "PHAI DO TAY" o cuoi CLAUDE.md muc 2h.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAU = [
  ['AIG IUL.svg', '2-Templates/AIG'],
  ['AIG Termlife.svg', '2-Templates/AIG'],
  ['IUL - NLG.svg', '2-Templates/NLG'],
  ['TERMLIFE - NLG.svg', '2-Templates/NLG'],
  ['Max-Funded Allianz.svg', '2-Templates/Allianz'],
];
const TRANG_VERSION = ['public/index.html', 'public/members.html', 'public/tool.html'];

let loi = 0, canh = 0;
const bao = (ok, ten, chiTiet) => {
  if (ok === true) console.log('  ✅ ' + ten);
  else if (ok === 'canh') { canh++; console.log('  ⚠️  ' + ten + (chiTiet ? '\n       ' + chiTiet : '')); }
  else { loi++; console.log('  ❌ ' + ten + (chiTiet ? '\n       ' + chiTiet : '')); }
};

// --- tach chu theo DONG, giong cach tool gom (tspan khong co y thi thuoc dong truoc)
function dongChu(svg) {
  const ra = [];
  for (const m of svg.matchAll(/<text[\s\S]*?<\/text>/g)) {
    const than = m[0].slice(m[0].indexOf('>') + 1, m[0].lastIndexOf('</text>'));
    const toks = [...than.matchAll(/<tspan\b[^>]*?\/>|<tspan\b[^>]*?>|<\/tspan>|[^<]+/g)].map(x => x[0]);
    const dong = new Map();
    let y = null, mo = null;
    for (const t of toks) {
      if (t.startsWith('<tspan')) {
        const my = t.match(/\by="([^"]*)"/); if (my) y = my[1];
        const k = y === null ? '0' : y;
        if (!dong.has(k)) dong.set(k, '');
        mo = t.endsWith('/>') ? null : k;
      } else if (t === '</tspan>') mo = null;
      else if (mo !== null) dong.set(mo, dong.get(mo) + t);
    }
    if (!dong.size) ra.push(than.replace(/<[^>]*>/g, '').trim());
    else for (const v of dong.values()) ra.push(v.trim());
  }
  return ra.filter(Boolean);
}

console.log('\n=== 1. DU LIEU KHACH HANG THAT CON SOT TRONG MAU? ===');
console.log('   (vap 18/08: 4 mau nhung san 3 ten khach that + ten/SDT dai ly)');
const CAM = [
  'Vu Nguyen', 'Dinh Thi Thao Nguyen', 'Chau Dang Khoa',
  'TONY PHU', 'Jason Huynh', '(346) 858-4277', '(832) 980-4749',
];
for (const [ten] of MAU) {
  const p = path.join('public/templates', ten);
  if (!fs.existsSync(p)) { bao(false, ten, 'KHONG CO FILE'); continue; }
  const ds = dongChu(fs.readFileSync(p, 'utf8'));
  const dinh = CAM.filter(c => ds.some(d => d.includes(c)));
  bao(dinh.length === 0, ten, dinh.length ? 'con: ' + dinh.join(' · ') : '');
}

console.log('\n=== 2. LOGO THINKSMART CO O CA 5 MAU? ===');
console.log('   (vap 18/08: 4 mau AIG/NLG thieu logo vi anh LIEN KET BI DUT trong .ai)');
for (const [ten] of MAU) {
  const p = path.join('public/templates', ten);
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  const co = /width="2370"\s+height="896"/.test(s);
  bao(co, ten, co ? '' : 'khong thay anh logo 2370x896');
}

console.log('\n=== 3. CHU CAM / LOI CHINH TA DA TUNG GAP ===');
const CHU_CAM = [['iNDEXED', 'chu i thuong'], ['INDEXD ', 'thieu chu E']];
for (const [ten] of MAU) {
  const p = path.join('public/templates', ten);
  if (!fs.existsSync(p)) continue;
  const ds = dongChu(fs.readFileSync(p, 'utf8')).join(' | ');
  const dinh = CHU_CAM.filter(([c]) => ds.includes(c));
  bao(dinh.length === 0, ten, dinh.length ? dinh.map(([c, v]) => c + ' (' + v + ')').join(' · ') : '');
}

console.log('\n=== 4. HAI NOI CHUA MAU CO KHOP NHAU? ===');
console.log('   (public/templates la thu CHAY THAT; 2-Templates bi gitignore)');
for (const [ten, noi] of MAU) {
  const a = path.join('public/templates', ten), b = path.join(noi, ten);
  if (!fs.existsSync(a) || !fs.existsSync(b)) { bao('canh', ten, 'thieu mot ben — bo qua'); continue; }
  const m = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  const ok = m(a) === m(b);
  bao(ok, ten, ok ? '' : 'md5 LECH — nho thay CA HAI noi');
}

console.log('\n=== 5. FILE TAM CON SOT TRONG public/templates? ===');
const rac = fs.readdirSync('public/templates').filter(f => /^__|\.bak$|\.tmp$/.test(f));
bao(rac.length === 0, 'khong con file tam', rac.length ? 'con: ' + rac.join(', ') : '');

console.log('\n=== 6. SO PHIEN BAN + NGAY CO KHOP O CA 3 TRANG? ===');
console.log('   (luat chu tool 18/08: push la phai bump. Da vap: ngay lech 11/08 vs 12/08)');
const ver = new Set(), ngay = new Set();
for (const f of TRANG_VERSION) {
  const s = fs.readFileSync(f, 'utf8');
  const v = (s.match(/version-badge">\s*(v[\d.]+)\s*</) || [])[1];
  const d = (s.match(/version-date">\s*([\d/]+)\s*</) || [])[1]
         || (s.match(/<span>\s*([\d/]{8,10})\s*·\s*Thinksmart/) || [])[1];
  ver.add(v); ngay.add(d);
  console.log('     ' + path.basename(f).padEnd(14) + (v || '?') + '   ' + (d || '?'));
}
bao(ver.size === 1, 'so phien ban giong nhau', ver.size === 1 ? '' : 'LECH: ' + [...ver].join(' vs '));
bao(ngay.size === 1, 'ngay giong nhau', ngay.size === 1 ? '' : 'LECH: ' + [...ngay].join(' vs '));

console.log('\n=== 7. TEMPLATES / DATA CO BI GAN ?v= KHONG? ===');
console.log('   (luat 2f-①: gan ?v= cho templates/data la sale om bang phi cu CA NAM)');
let gan = [];
for (const f of fs.readdirSync('public').filter(x => x.endsWith('.html'))) {
  const s = fs.readFileSync(path.join('public', f), 'utf8');
  for (const m of s.matchAll(/(templates\/[^"'?\s]+|data\/[^"'?\s]+)\?v=/g)) gan.push(f + ': ' + m[1]);
}
bao(gan.length === 0, 'templates/data khong gan ?v=', gan.join(' · '));

console.log('\n' + '='.repeat(62));
if (loi) {
  console.log('❌ CO ' + loi + ' LOI' + (canh ? ' va ' + canh + ' canh bao' : '') + ' — DUNG PUSH, sua xong chay lai.');
  process.exit(1);
}
console.log('✅ Qua het' + (canh ? ' (' + canh + ' canh bao, doc lai cho chac)' : '') +
  '.\n   ⚠️ Script nay KHONG kiem duoc phan hinh hoc — xem CLAUDE.md muc 2h.');
