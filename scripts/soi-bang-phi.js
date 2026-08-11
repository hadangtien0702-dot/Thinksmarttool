/**
 * SOI BANG PHI TERM LIFE — tim so bat thuong trong chinh du lieu.
 *
 *   node scripts/soi-bang-phi.js
 *
 * ☠️ VI SAO CAN: doi chieu voi forum chi chung minh "toi chep dung nhung gi forum
 * co". Neu BANG GOC gõ nhầm thì ca hai deu sai giong nhau va khong ai thay.
 * (Ngay 10/08/2026 da tim ra 6 o nghi go nham trong bang IUL bang cach nay.)
 *
 * Ba phep soi, khong phu thuoc vao forum:
 *   1. KY HAN dai hon phai DAT hon: 10 <= 15 <= 20 <= 30 (cung tuoi, cung menh gia)
 *   2. TUOI cao hon phai DAT hon (cung menh gia, cung ky han)
 *   3. Trong cung MOT BAC menh gia, tang menh gia thi phi phai tang
 *      ⚠️ Term life co "banding": qua mot nguong thi don gia/1000 giam han, nen
 *      250k CO THE re hon 200k. Do la that, khong phai loi -> chi bao, khong ket toi.
 */
const fs = require('fs');
const path = require('path');

const MG = {
  0: [100000,150000,200000,250000,300000,350000,400000,450000,500000,750000,1000000],
  1: [100000,300000,500000],
  2: [100000,300000,500000],
  3: [100000,150000,200000,250000,300000,350000,400000,450000,500000,750000,1000000],
  4: [100000,300000,500000]
};
const TEN = ['MALE-SNTBC','MALE-STBC','MALE-ENTBC1','FEMALE-SNTBC','FEMALE-ENTBC1'];
const KY = [10, 15, 20, 30];

const bang = {};
fs.readFileSync(path.join(__dirname, 'bang-phi-termlife-nlg.txt'), 'utf8')
  .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
  .forEach(l => {
    const [si, tuoi, so] = l.split('|');
    const v = so.split(',').map(x => x === '-' ? null : Number(x));
    bang[si] = bang[si] || {};
    bang[si][tuoi] = {};
    MG[si].forEach((mg, i) => { bang[si][tuoi][mg] = v.slice(i * 4, i * 4 + 4); });
  });

const loi = { kyHan: [], tuoi: [], menhGia: [] };
let soO = 0;

Object.keys(bang).forEach(si => {
  const tuoi = Object.keys(bang[si]).map(Number).sort((a, b) => a - b);

  // 1. KY HAN dai hon phai dat hon
  tuoi.forEach(t => MG[si].forEach(mg => {
    const v = bang[si][t][mg];
    v.forEach(x => { if (x !== null) soO++; });
    for (let i = 1; i < 4; i++) {
      if (v[i] !== null && v[i - 1] !== null && v[i] < v[i - 1]) {
        loi.kyHan.push(`${TEN[si]} ${t}t ${mg / 1000}k: ${KY[i]} nam ($${v[i]}) RE HON ${KY[i-1]} nam ($${v[i-1]})`);
      }
    }
  }));

  // 2. TUOI cao hon phai dat hon
  MG[si].forEach(mg => KY.forEach((k, i) => {
    for (let j = 1; j < tuoi.length; j++) {
      const a = bang[si][tuoi[j - 1]][mg][i], b = bang[si][tuoi[j]][mg][i];
      if (a !== null && b !== null && b < a) {
        loi.tuoi.push(`${TEN[si]} ${mg / 1000}k ${k} nam: ${tuoi[j]}t ($${b}) RE HON ${tuoi[j-1]}t ($${a})`);
      }
    }
  }));

  // 3. Menh gia tang thi phi tang (co the vi pham hop le do banding -> chi liet ke)
  tuoi.forEach(t => KY.forEach((k, i) => {
    for (let j = 1; j < MG[si].length; j++) {
      const a = bang[si][t][MG[si][j - 1]][i], b = bang[si][t][MG[si][j]][i];
      if (a !== null && b !== null && b < a) {
        loi.menhGia.push(`${TEN[si]} ${t}t ${k} nam: ${MG[si][j]/1000}k ($${b}) RE HON ${MG[si][j-1]/1000}k ($${a})`);
      }
    }
  }));
});

console.log('SOI BANG PHI TERM LIFE — ' + soO.toLocaleString('en-US') + ' o');
console.log('='.repeat(72));
console.log('');
console.log('1. KY HAN DAI HON PHAI DAT HON (10<=15<=20<=30): ' +
  (loi.kyHan.length ? loi.kyHan.length + ' cho SAI' : 'DAT — khong co cho nao sai'));
loi.kyHan.slice(0, 12).forEach(x => console.log('   ' + x));
console.log('');
// ⚠️ LOC TRUOC KHI KET TOI (bai hoc 10/08/2026): phi term life co HAI hien tuong
// THAT khien hai phep soi duoi day "bao sai" ma khong phai loi:
//   • Tuoi 20–25 phi GIAM dan — tu vong do tai nan cua nam gioi dinh o dau 20.
//   • "Banding": qua nguong menh gia thi don gia/1000 giam han -> 250k re hon 200k.
// Nen chi coi la DANG NGO khi no nam NGOAI hai vung do.
const tuoiTre = loi.tuoi.filter(x => { const m = x.match(/: (\d+)t /); return m && +m[1] <= 26; });
const tuoiLon = loi.tuoi.filter(x => { const m = x.match(/: (\d+)t /); return m && +m[1] > 26; });
console.log('2. TUOI CAO HON PHAI DAT HON');
console.log('   • Tuoi <= 26: ' + tuoiTre.length + ' cho — BINH THUONG (phi tre tuoi giam dan, khong phai loi)');
console.log('   • Tuoi > 26 : ' + tuoiLon.length + ' cho' + (tuoiLon.length ? '  <<< DANG NGO' : ' — sach'));
tuoiLon.slice(0, 15).forEach(x => console.log('       ' + x));
console.log('');
const nguong = {};
loi.menhGia.forEach(x => { const m = x.match(/: (\d+)k .* (\d+)k /); if (m) { const k = m[2] + 'k -> ' + m[1] + 'k'; nguong[k] = (nguong[k] || 0) + 1; } });
console.log('3. MENH GIA LON HON MA RE HON: ' + loi.menhGia.length + ' cho');
console.log('   Gom o dung nhung NGUONG nao (neu chi vai nguong co dinh = "banding" that):');
Object.entries(nguong).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('       ' + k + ' : ' + v + ' cho'));
