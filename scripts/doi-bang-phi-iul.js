/**
 * DOI BANG PHI IUL THO -> JSON cho tool doc.
 *
 *   node scripts/doi-bang-phi-iul.js
 *
 * Doc  : scripts/bang-phi-iul-nlg-20nam-ntbc.txt  +  scripts/bang-phi-iul-nlg-dot2.txt
 * Ghi  : public/data/bang-phi-iul.json
 *
 * ☠️ File .json la BAN SINH RA — dung sua tay.
 * ☠️ Script TU KIEM tong tung dong truoc khi ghi; lech mot con so la DUNG HAN.
 * ☠️ 6 o bat thuong trong bang 20 nam NTBC duoc GIU NGUYEN theo lenh chu tool
 *    10/08/2026 ("so drive la chuan"). Xem dau file .txt.
 */
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..');
const NGUON = [
  path.join(__dirname, 'bang-phi-iul-nlg-20nam-ntbc.txt'),
  path.join(__dirname, 'bang-phi-iul-nlg-dot2.txt')
];
const DICH = path.join(GOC, 'public', 'data', 'bang-phi-iul.json');

// Ma trong file .txt -> (ky han, gioi tinh, hang suc khoe)
const MA = {
  '20FN': ['20', 'FEMALE', 'NTBC'], '20MN': ['20', 'MALE', 'NTBC'],
  '20FE': ['20', 'FEMALE', 'EX1'],  '20ME': ['20', 'MALE', 'EX1'],
  '20MT': ['20', 'MALE', 'TBC'],
  '15FN': ['15', 'FEMALE', 'NTBC'], '15MN': ['15', 'MALE', 'NTBC']
  // 15 nam KHONG co TBC/EX1 — da do tren forum: chon 15 Years thi hai nut do bi khoa.
};

const mgTheoMa = {};
const bang = {};
const loi = [];
let soDong = 0, soO = 0, oTrong = 0;

NGUON.forEach(f => {
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (!l) return;
    if (l.startsWith('#MG ')) {
      const m = l.match(/^#MG (\w+)=(.+)$/);
      if (m) mgTheoMa[m[1]] = m[2].split(',').map(Number);
      return;
    }
    if (l.startsWith('#')) return;

    const p = l.split('|');
    if (p.length !== 4) { loi.push(`${path.basename(f)} dong ${i + 1}: khong du 4 phan`); return; }
    const [ma, tuoiStr, soStr, tongStr] = p;
    const mg = mgTheoMa[ma];
    if (!mg) { loi.push(`ma ${ma} chua khai bao #MG`); return; }
    if (!MA[ma]) { loi.push(`ma ${ma} khong co trong bang MA`); return; }

    const v = soStr.split(',');
    if (v.length !== mg.length) { loi.push(`${ma} tuoi ${tuoiStr}: ${v.length} gia tri, cho doi ${mg.length}`); return; }

    let tong = 0;
    v.forEach(x => { if (x !== '-') tong += Math.round(Number(x) * 100); });
    if (tong !== Number(tongStr)) { loi.push(`${ma} tuoi ${tuoiStr}: tong ${tong} != ${tongStr}`); return; }

    const [ky, gioi, sk] = MA[ma];
    const khoa = ky + '|' + gioi + '|' + sk;
    bang[khoa] = bang[khoa] || { menhGia: mg, tuoi: {} };
    const o = {};
    mg.forEach((m, k) => {
      soO++;
      const n = v[k] === '-' ? null : Number(v[k]);
      if (n === null) oTrong++;
      o[m] = n;
    });
    bang[khoa].tuoi[Number(tuoiStr)] = o;
    soDong++;
  });
});

if (loi.length) {
  console.error('DUNG — nguon co van de, KHONG ghi JSON:');
  loi.slice(0, 20).forEach(x => console.error('  ' + x));
  process.exit(1);
}

// Khoang tuoi CO BAN THAT (bo qua nhung tuoi ma ca dong deu trong) + menh gia
// thuc su co so, de giao dien chi bay ra thu ban duoc.
Object.keys(bang).forEach(k => {
  const o = bang[k];
  const coSo = Object.keys(o.tuoi).map(Number)
    .filter(t => o.menhGia.some(m => o.tuoi[t][m] !== null)).sort((a, b) => a - b);
  o.tuoiTu = coSo[0];
  o.tuoiDen = coSo[coSo.length - 1];
  o.menhGiaCoSo = o.menhGia.filter(m => coSo.some(t => o.tuoi[t][m] !== null));
});

const ra = {
  nguon: 'Google Sheet "Bang quote gia IUL 2025" 15 NAM + 20 NAM (Drive chu tool, sep lam va kiem tra)',
  ngayDoc: '2026-08-10',
  doiChieu: '7/7 ca khop ban forum dang chay — moi sheet mot ca',
  canhBao: '6 o trong 2 sheet NTBC 20 nam pha vo quy luat ti le; GIU NGUYEN theo lenh chu tool. Xem dau file .txt.',
  ghiChu: 'null = hang KHONG BAN muc do. Tuyet doi khong noi suy.',
  bang
};

fs.mkdirSync(path.dirname(DICH), { recursive: true });
fs.writeFileSync(DICH, JSON.stringify(ra), 'utf8');

console.log('Da ghi: public/data/bang-phi-iul.json');
console.log('  ' + soDong + ' dong | ' + soO + ' o | ' + oTrong + ' o trong');
console.log('  Dung luong: ' + Math.round(fs.statSync(DICH).size / 1024) + ' KB');
console.log('');
Object.keys(bang).sort().forEach(k => {
  const o = bang[k];
  console.log('  ' + k.padEnd(20) + 'tuoi ' + String(o.tuoiTu).padStart(2) + '-' + o.tuoiDen +
    ' | ' + o.menhGiaCoSo.length + '/' + o.menhGia.length + ' menh gia co so');
});
