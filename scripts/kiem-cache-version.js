#!/usr/bin/env node
/**
 * KIEM CACHE VERSION — chot chan cho luat cache moi (11/08/2026).
 * =============================================================================
 * VI SAO CAN FILE NAY
 *
 * 11/08/2026 server.js doi luat: file nao co `?v=` thi tra
 *     Cache-Control: public, max-age=31536000, immutable
 * tuc trinh duyet giu 1 NAM va KHONG bao gio hoi lai. Doi lai duoc gi: do tren
 * ban live, 16 file tinh moi luot vao trang deu phai hoi "co doi khong" — 16 vong
 * mang, 1.233 ms cong don. Nay con 0.
 *
 * ☠️ NHUNG NO DE LAI MOT CAI BAY MOI: sua noi dung file MA QUEN BUMP `?v=` thi
 * 77 sale om ban code cu SUOT MOT NAM, va khong co dau hieu gi ca — may minh
 * thi luon dung vi la file moi tai lan dau. Truoc khi doi luat, quen bump chi
 * cham mot nhip; sau khi doi luat, quen bump la HONG THAT.
 *
 * Nen rang buoc nay phai bao dam BANG CO CHE, khong bang tri nho:
 *   - `node scripts/kiem-cache-version.js`        -> soi, lech thi bao va thoat 1
 *   - `node scripts/kiem-cache-version.js --ghi`  -> chot lai sau khi da bump dung
 *
 * CHAY NO TRUOC MOI LAN PUSH.
 * =============================================================================
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GOC = path.resolve(__dirname, '..');
const PUBLIC = path.join(GOC, 'public');
const SO = path.join(__dirname, 'cache-version.json');
const GHI = process.argv.includes('--ghi');

// Bat cac the dang  src="..../ten.js?v=47"  hoac  href="ten.css?v=110"
const MAU = /(?:src|href)\s*=\s*"([^"?]+)\?v=([^"]+)"/g;

function bam(p) {
  return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 12);
}

// Doi duong dan trong HTML -> duong dan that tren o dia.
// "/js/core.js" (goc web) va "js/core.js" (tuong doi) deu tro vao public/.
function thanhDuongDanThat(duongDanHtml, fileHtml) {
  const p = duongDanHtml.startsWith('/')
    ? path.join(PUBLIC, duongDanHtml)
    : path.resolve(path.dirname(fileHtml), duongDanHtml);
  return fs.existsSync(p) ? p : null;
}

const htmls = fs.readdirSync(PUBLIC).filter(f => f.endsWith('.html')).map(f => path.join(PUBLIC, f));

const hienTai = {};   // "js/core.js" -> { v, bam, thay: ["tool.html:437"] }
const thieuFile = [];
const lechVersion = [];

for (const fileHtml of htmls) {
  const src = fs.readFileSync(fileHtml, 'utf8');
  const dong = src.split(/\r?\n/);
  let m;
  MAU.lastIndex = 0;
  while ((m = MAU.exec(src)) !== null) {
    const [, duongDan, v] = m;
    if (/^https?:/i.test(duongDan)) continue;              // CDN ngoai — khong quan
    const that = thanhDuongDanThat(duongDan, fileHtml);
    const nhan = path.relative(PUBLIC, that || duongDan).replace(/\\/g, '/');
    const soDong = dong.findIndex(l => l.includes(`${duongDan}?v=${v}`)) + 1;
    const oDau = `${path.basename(fileHtml)}:${soDong}`;

    if (!that) { thieuFile.push(`${oDau}  ->  ${duongDan}  (KHONG TIM THAY FILE)`); continue; }

    const b = bam(that);
    if (hienTai[nhan]) {
      // Cung mot file duoc nhieu trang nap: `?v=` phai GIONG NHAU, khong thi moi
      // trang cache mot ban khac nhau.
      if (hienTai[nhan].v !== v) {
        lechVersion.push(`${nhan}: ${hienTai[nhan].thay.join(', ')} ghi ?v=${hienTai[nhan].v} nhung ${oDau} ghi ?v=${v}`);
      }
      hienTai[nhan].thay.push(oDau);
    } else {
      hienTai[nhan] = { v, bam: b, thay: [oDau] };
    }
  }
}

if (GHI) {
  const ra = {};
  Object.keys(hienTai).sort().forEach(k => { ra[k] = { v: hienTai[k].v, bam: hienTai[k].bam }; });
  fs.writeFileSync(SO, JSON.stringify(ra, null, 2) + '\n');
  console.log(`Da chot ${Object.keys(ra).length} file vao ${path.relative(GOC, SO)}`);
  process.exit(0);
}

if (!fs.existsSync(SO)) {
  console.error('Chua co so ghi. Chay mot lan:  node scripts/kiem-cache-version.js --ghi');
  process.exit(1);
}
const so = JSON.parse(fs.readFileSync(SO, 'utf8'));

const quenBump = [];
const moi = [];
for (const [nhan, info] of Object.entries(hienTai)) {
  const cu = so[nhan];
  if (!cu) { moi.push(`${nhan}  (?v=${info.v})`); continue; }
  if (cu.bam !== info.bam && cu.v === info.v) {
    quenBump.push(`  ${nhan}\n      noi dung DA DOI nhung van ?v=${info.v}  —  sua o ${info.thay.join(', ')}\n      -> doi thanh ?v=${isNaN(+info.v) ? info.v + '-2' : (+info.v + 1)}`);
  }
}

let hong = false;
console.log(`\nSoi ${Object.keys(hienTai).length} file co ?v= trong ${htmls.length} trang HTML.\n`);

if (thieuFile.length) {
  hong = true;
  console.log('❌ THE TRO TOI FILE KHONG TON TAI:');
  thieuFile.forEach(x => console.log('  ' + x));
  console.log('');
}
if (lechVersion.length) {
  hong = true;
  console.log('❌ CUNG MOT FILE MA HAI TRANG GHI HAI SO ?v= KHAC NHAU:');
  lechVersion.forEach(x => console.log('  ' + x));
  console.log('');
}
if (quenBump.length) {
  hong = true;
  console.log('❌ SUA FILE MA QUEN BUMP ?v=  (day la loi lam sale om code cu 1 nam):');
  quenBump.forEach(x => console.log(x));
  console.log('');
}
if (moi.length) {
  console.log('ℹ️  File moi chua co trong so (khong phai loi, chot lai bang --ghi):');
  moi.forEach(x => console.log('  ' + x));
  console.log('');
}

if (hong) {
  console.log('=> SUA XONG thi chay lai, roi chot:  node scripts/kiem-cache-version.js --ghi\n');
  process.exit(1);
}
console.log('✅ Moi file co ?v= deu khop noi dung. An toan de push.\n');
