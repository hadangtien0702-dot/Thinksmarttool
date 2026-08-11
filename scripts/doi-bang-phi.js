/**
 * DOI BANG PHI THO -> JSON cho tool doc.
 *
 *   node scripts/doi-bang-phi.js
 *
 * Doc  : scripts/bang-phi-termlife-nlg.txt   (nguon that, co tong kiem tra tung dong)
 * Ghi  : public/data/bang-phi-termlife.json
 *
 * ☠️ CHAY LAI MOI KHI SUA FILE .txt. File .json la BAN SINH RA — dung sua tay,
 *    sua tay la lan sau chay lai script se mat.
 * ☠️ Script TU KIEM tong tung dong truoc khi ghi. Lech mot con so la dung han,
 *    khong ghi file. Sai phi bao hiem = sale bao sai bac phi cho khach that.
 */
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');
const NGUON = path.join(__dirname, 'bang-phi-termlife-nlg.txt');
const DICH = path.join(GOC, 'public', 'data', 'bang-phi-termlife.json');

// Ma sheet -> (gioi tinh, hang suc khoe) + danh sach menh gia cua CHINH sheet do.
// ⚠️ Moi sheet mot bo menh gia khac nhau — dung dung chung mot danh sach.
const DAY_DU = [100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000, 750000, 1000000];
const RUT_GON = [100000, 300000, 500000];
const SHEET = [
  { ma: 0, gioi: 'MALE',   suckhoe: 'SNTBC',  menhGia: DAY_DU },
  { ma: 1, gioi: 'MALE',   suckhoe: 'STBC',   menhGia: RUT_GON },
  { ma: 2, gioi: 'MALE',   suckhoe: 'ENTBC1', menhGia: RUT_GON },
  { ma: 3, gioi: 'FEMALE', suckhoe: 'SNTBC',  menhGia: DAY_DU },
  { ma: 4, gioi: 'FEMALE', suckhoe: 'ENTBC1', menhGia: RUT_GON }
  // FEMALE + STBC: KHONG CO — sep cua chu tool co y khong lam (chu tool xac nhan 10/08/2026)
];
const KY_HAN = [10, 15, 20, 30];   // thu tu 4 cot — xac dinh bang doi chieu forum, KHONG doan

const dong = fs.readFileSync(NGUON, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'));
const bang = {};
let oTong = 0, oTrong = 0, loi = [];

dong.forEach((l, i) => {
  const phan = l.split('|');
  if (phan.length !== 4) { loi.push(`dong ${i + 1}: khong du 4 phan`); return; }
  const [maStr, tuoiStr, soStr, tongStr] = phan;
  const sh = SHEET.find(s => s.ma === Number(maStr));
  if (!sh) { loi.push(`dong ${i + 1}: ma sheet la ${maStr}`); return; }
  const v = soStr.split(',');
  if (v.length !== sh.menhGia.length * KY_HAN.length) {
    loi.push(`dong ${i + 1}: co ${v.length} gia tri, cho doi ${sh.menhGia.length * KY_HAN.length}`);
    return;
  }
  // TU KIEM tong tung dong
  let tong = 0;
  v.forEach(x => { if (x !== '-') tong += Math.round(Number(x) * 100); });
  if (tong !== Number(tongStr)) { loi.push(`dong ${i + 1}: tong ${tong} != ${tongStr}`); return; }

  const khoa = sh.gioi + '|' + sh.suckhoe;
  bang[khoa] = bang[khoa] || { menhGia: sh.menhGia, tuoi: {} };
  const o = {};
  sh.menhGia.forEach((mg, k) => {
    const bo = v.slice(k * 4, k * 4 + 4).map(x => x === '-' ? null : Number(x));
    bo.forEach(x => { oTong++; if (x === null) oTrong++; });
    o[mg] = bo;
  });
  bang[khoa].tuoi[Number(tuoiStr)] = o;
});

if (loi.length) {
  console.error('DUNG — file nguon co van de, KHONG ghi JSON:');
  loi.slice(0, 20).forEach(x => console.error('  ' + x));
  process.exit(1);
}

// Khoang tuoi cua tung to hop (moi hang suc khoe mot khoang khac nhau)
Object.keys(bang).forEach(k => {
  const t = Object.keys(bang[k].tuoi).map(Number).sort((a, b) => a - b);
  bang[k].tuoiTu = t[0];
  bang[k].tuoiDen = t[t.length - 1];
});

const ra = {
  nguon: 'Google Sheet "2. Bang gia quote Term life NLG - Final" (sep cua chu tool lam va kiem tra)',
  chiLaySheet: 'Cac sheet co tien to "NEW" — ban cu trong cung file cho so KHAC, khong dung',
  doiChieu: '8/8 ca khop ban forum dang chay (10/08/2026)',
  ngayDoc: '2026-08-10',
  kyHan: KY_HAN,
  ghiChu: 'null = hang KHONG BAN muc do. Tuyet doi khong noi suy, khong lay so gan dung.',
  bang
};

fs.mkdirSync(path.dirname(DICH), { recursive: true });
fs.writeFileSync(DICH, JSON.stringify(ra), 'utf8');

console.log('Da ghi: public/data/bang-phi-termlife.json');
console.log('  To hop  : ' + Object.keys(bang).length + ' (' + Object.keys(bang).join(', ') + ')');
console.log('  So dong : ' + dong.length + ' | so o: ' + oTong + ' | o trong (khong ban): ' + oTrong);
console.log('  Dung luong: ' + Math.round(fs.statSync(DICH).size / 1024) + ' KB');
Object.keys(bang).forEach(k => {
  console.log('  ' + k.padEnd(15) + ' tuoi ' + bang[k].tuoiTu + '-' + bang[k].tuoiDen +
    ' | ' + bang[k].menhGia.length + ' menh gia');
});
