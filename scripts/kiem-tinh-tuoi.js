/**
 * KIEM VET CAN ham tinh tuoi bao hiem (public/js/tinhtuoi.js).
 *
 *   node scripts/kiem-tinh-tuoi.js
 *
 * ☠️ VI SAO CO FILE NAY (10/08/2026): sai tuoi bao hiem = sale bao gia sai bac phi
 * cho khach THAT. Ban forum cua chu tool KHONG dung lam chuan duoc — do ngay
 * 10/08/2026 phat hien no co 3 loi (tuoi that -1 vao dung ngay sinh nhat; "ngay
 * tang tuoi" som 1 ngay; sinh 29/02 bi cong 7 thang thay vi 6).
 * Nen o day kiem bang cach CHO HAI BAN CAI DAT DOC LAP CAI NHAU:
 *   A = ban that trong tinhtuoi.js (cong ngay thang bang Date)
 *   B = ban viet lai o duoi (dem so thang tron + so ngay le)
 * Ba lop:
 *   1. Moi ngay sinh trong 100 nam, mot ngay tinh
 *   2. 89 ngay sinh x 800 ngay tinh lien tiep
 *   3. "Ngay tang tuoi": dung hom do con so PHAI doi, hom truoc PHAI chua doi
 *
 * LAN CHAY 10/08/2026: 102.347 phep tinh, 0 loi.
 * (Truoc do co 8 ca lech, deu la sinh 29/02 — do B hieu sinh nhat la 01/03 con A
 *  hieu la 28/02. Chu tool chot 28/02, da sua B cho khop.)
 */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'tinhtuoi.js'), 'utf8');
const lay = ten => {
  // ⚠️ Phai khop 'function <ten>(' — tim bang tien to thi `ttDocNgay` an nham vao
  // `ttDocNgayTheo` (dung lai bai hoc "khop bang mot dau hieu se bat nham").
  const i = src.indexOf('function ' + ten + '(');
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
};
// ⚠️ Them ham moi vao day khi tinhtuoi.js tach ham — thieu mot cai la script chet
// ngay tu dau (tot: chet on ao hon la kiem thieu ma van bao DAT).
eval(['ttDungNgay', 'ttDocNgayTheo', 'ttDocNgay', 'ttSinhNhatTrongNam', 'ttCongThang', 'tinhTuoiBaoHiem']
  .map(lay).join('\n'));

// ---- A. BAN CAI DAT THU HAI: dem thang + ngay da troi qua, khong dung Date arithmetic
function banHai(ns, homNay) {
  const y = homNay.getFullYear(), m = homNay.getMonth() + 1, d = homNay.getDate();
  // tuoi that
  const cuoiThang = (yy, mm) => new Date(yy, mm, 0).getDate();
  // ☠️ CHU TOOL CHOT 10/08/2026: sinh 29/02, nam khong nhuan thi sinh nhat tinh la
  // 28/02 (khong phai 01/03). Phai kep NGAY TRUOC khi so sanh, khong thi ban B
  // hieu sinh nhat la 01/03 va lech 1 tuoi voi ban A trong 3 ngay moi nam.
  const ngayTrongNam = yy => Math.min(ns.ngay, cuoiThang(yy, ns.thang));
  const chuaToiSN = (m < ns.thang || (m === ns.thang && d < ngayTrongNam(y)));
  let that = y - ns.nam;
  if (chuaToiSN) that--;
  const namSN = chuaToiSN ? y - 1 : y;
  const ngaySN = ngayTrongNam(namSN);
  // so thang tron da troi qua ke tu sinh nhat do
  // ⚠️ Neo theo `ngaySN` (ngay sinh nhat DA KEP), khong phai `ns.ngay` tho. Sinh
  // 29/02 nam thuong co sinh nhat 28/02 -> moc 6 thang phai la 28/08, dung ns.ngay
  // se ra 29/08 va lech 1 tuoi dung 1 ngay moi nam.
  let thangTroi = (y - namSN) * 12 + (m - ns.thang);
  if (d < Math.min(ngaySN, cuoiThang(y, m))) thangTroi--;
  // so ngay le sau khi tru het thang tron
  const mocThang = new Date(namSN, ns.thang - 1 + thangTroi, 1);
  const ngayMoc = Math.min(ngaySN, cuoiThang(mocThang.getFullYear(), mocThang.getMonth() + 1));
  const ngayLe = Math.round((new Date(y, m - 1, d) - new Date(mocThang.getFullYear(), mocThang.getMonth(), ngayMoc)) / 86400000);
  const cong = (thangTroi > 6) || (thangTroi === 6 && ngayLe > 0);
  return { that, bh: cong ? that + 1 : that };
}

const D = (y, m, d) => new Date(y, m - 1, d);
const chuoi = ns => `${String(ns.thang).padStart(2,'0')}/${String(ns.ngay).padStart(2,'0')}/${ns.nam}`;

// ---------- LOP 1: quet MOI ngay sinh 100 nam, voi 1 ngay tinh ----------
let n1 = 0, loi1 = [];
{
  const homNay = D(2026, 8, 10);
  for (let t = D(1926, 1, 1); t <= homNay; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) {
    const ns = ttDocNgay(`${String(t.getMonth()+1).padStart(2,'0')}/${String(t.getDate()).padStart(2,'0')}/${t.getFullYear()}`);
    const a = tinhTuoiBaoHiem(ns, homNay), b = banHai(ns, homNay);
    n1++;
    if (a.tuoiThat !== b.that || a.tuoiBaoHiem !== b.bh) loi1.push(`${chuoi(ns)} A(${a.tuoiThat}/${a.tuoiBaoHiem}) B(${b.that}/${b.bh})`);
    else if (a.tuoiBaoHiem !== a.tuoiThat && a.tuoiBaoHiem !== a.tuoiThat + 1) loi1.push(`${chuoi(ns)} bat bien vo: ${a.tuoiThat}/${a.tuoiBaoHiem}`);
    else if (a.tuoiThat < 0) loi1.push(`${chuoi(ns)} tuoi am`);
  }
}

// ---------- LOP 2: 120 ngay sinh x 800 ngay tinh lien tiep ----------
let n2 = 0, loi2 = [], loiMoc = [];
{
  const dsSinh = [];
  for (let m = 1; m <= 12; m++) for (const d of [1, 8, 15, 28, 29, 30, 31]) {
    const ns = ttDocNgay(`${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}/1990`);
    if (ns) dsSinh.push(ns);
  }
  ['02/29/1992', '02/29/2000', '02/29/2024', '12/31/1999', '01/01/2000'].forEach(s => dsSinh.push(ttDocNgay(s)));

  for (const ns of dsSinh) {
    for (let i = 0; i < 800; i++) {
      const homNay = new Date(2026, 0, 1 + i);
      const a = tinhTuoiBaoHiem(ns, homNay), b = banHai(ns, homNay);
      n2++;
      if (a.tuoiThat !== b.that || a.tuoiBaoHiem !== b.bh) {
        if (loi2.length < 8) loi2.push(`${chuoi(ns)} @${homNay.toLocaleDateString('en-US')} A(${a.tuoiThat}/${a.tuoiBaoHiem}) B(${b.that}/${b.bh})`);
      }
      // LOP 3: dung ngay "moc tang tuoi" thi con so PHAI doi, hom truoc PHAI chua doi
      if (i % 37 === 0) {
        const moc = a.mocTiepTheo;
        const truoc = new Date(moc.getFullYear(), moc.getMonth(), moc.getDate() - 1);
        const tMoc = tinhTuoiBaoHiem(ns, moc).tuoiBaoHiem;
        const tTruoc = tinhTuoiBaoHiem(ns, truoc).tuoiBaoHiem;
        if (!(moc > homNay)) loiMoc.push(`${chuoi(ns)} @${homNay.toLocaleDateString('en-US')}: moc khong nam o tuong lai`);
        else if (tMoc !== tTruoc + 1) loiMoc.push(`${chuoi(ns)} moc ${moc.toLocaleDateString('en-US')}: hom truoc ${tTruoc}, dung hom do ${tMoc} (phai +1)`);
      }
    }
  }
}

console.log('LOP 1 — moi ngay sinh trong 100 nam (1 ngay tinh)');
console.log('  So ca: ' + n1.toLocaleString('en-US') + ' | Lech: ' + loi1.length);
loi1.slice(0, 5).forEach(x => console.log('    ' + x));
console.log('');
console.log('LOP 2 — 89 ngay sinh x 800 ngay tinh lien tiep');
console.log('  So ca: ' + n2.toLocaleString('en-US') + ' | Lech giua hai ban cai dat: ' + loi2.length);
loi2.forEach(x => console.log('    ' + x));
console.log('');
console.log('LOP 3 — kiem "ngay tang tuoi" (mau ' + Math.round(n2/37) + ' lan)');
console.log('  Sai: ' + loiMoc.length);
loiMoc.slice(0, 5).forEach(x => console.log('    ' + x));
console.log('');
console.log('TONG: ' + (n1 + n2).toLocaleString('en-US') + ' phep tinh, ' +
  (loi1.length + loi2.length + loiMoc.length) + ' loi.');
