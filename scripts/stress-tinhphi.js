/**
 * STRESS TEST — CÔNG CỤ TÍNH PHÍ (public/js/tinhphi.js)
 *
 * Chạy:  node scripts/stress-tinhphi.js
 *
 * Vì sao cần: đây là thứ trả ra SỐ TIỀN sale báo cho khách. Một tổ hợp trả sai,
 * hoặc trả "có phí" ở chỗ hãng không bán, là sai bậc phí với người thật.
 *
 * ☠️ Test này nạp CHÍNH file js/tinhphi.js (không chép lại logic sang đây).
 * Chép lại là thước cùng vật liệu: sửa một bên quên bên kia thì test vẫn xanh.
 * Cách nạp: đọc file, cắt bỏ phần đụng DOM, chạy trong sandbox có stub `fetch`.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GOC = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(GOC, 'public/js/tinhphi.js'), 'utf8');

// Sandbox: chỉ cần fetch (đọc file JSON dưới đĩa) + vài stub DOM rỗng.
const sandbox = {
  console,
  document: { getElementById: () => null, createElement: () => ({ click() {}, setAttribute() {} }) },
  window: {},
  URL: { createObjectURL: () => '', revokeObjectURL() {} },
  Blob: function () {},
  setTimeout,
  escapeHtml: s => String(s),
  NAV_ICONS: {},
  fetch: (u) => {
    const f = path.join(GOC, 'public', u.replace(/^\//, ''));
    return Promise.resolve({ ok: fs.existsSync(f), json: () => JSON.parse(fs.readFileSync(f, 'utf8')) });
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'tinhphi.js' });

// ☠️ Biến/hàm khai bằng `let`/`const`/`function` ở top-level KHÔNG trở thành thuộc
// tính của sandbox (khác `var`) — `sandbox.tpBang` sẽ luôn undefined. Phải lấy qua
// runInContext. Bẫy này làm bàn đo báo "KHONG NAP DUOC BANG PHI" trong khi code
// hoàn toàn đúng — đúng loại lỗi "thước sai chứ sản phẩm không sai".
const lay = ten => vm.runInContext(ten, sandbox);
const [tpNapBang, tpNapIul, tpNapPdf, traPhi, traPhiIul,
       tpSucKhoeCoDuoc, tpMenhGiaCoDuoc, tpKhoangTuoi,
       tpIulSucKhoeCoDuoc, tpIulMenhGia, tpIulKhoangTuoi,
       TP_GIOI, TP_SUCKHOE, TP_SUCKHOE_IUL, TP_KYHAN_IUL] =
  ['tpNapBang','tpNapIul','tpNapPdf','traPhi','traPhiIul',
   'tpSucKhoeCoDuoc','tpMenhGiaCoDuoc','tpKhoangTuoi',
   'tpIulSucKhoeCoDuoc','tpIulMenhGia','tpIulKhoangTuoi',
   'TP_GIOI','TP_SUCKHOE','TP_SUCKHOE_IUL','TP_KYHAN_IUL'].map(lay);

let tongCa = 0, loi = [];
const bao = (nhom, mo) => loi.push(nhom + ': ' + mo);

(async function () {
  await Promise.all([tpNapBang(), tpNapIul(), tpNapPdf(), lay("tpNapFile")()]);
  const bangTerm = lay("tpBang"), bangIul = lay("tpIul");
  if (!bangTerm || !bangIul) { console.log('KHONG NAP DUOC BANG PHI'); process.exit(1); }

  // ---- 1. TERM LIFE: quét MỌI tổ hợp trong bảng + biên ngoài -------------
  console.log('1. TERM LIFE — quet moi to hop');
  let tCo = 0, tKhong = 0;
  TP_GIOI.forEach(g => TP_SUCKHOE.forEach(s => {
    const kt = tpKhoangTuoi(g.ma, s.ma);
    const mgs = tpMenhGiaCoDuoc(g.ma, s.ma);
    const banDuoc = tpSucKhoeCoDuoc(g.ma).includes(s.ma);
    if (!banDuoc) {
      // Hãng không bán → MỌI tuổi/mệnh giá phải trả về "không có", không được văng
      [1, 30, 65, 200].forEach(t => [0, 100000, 999999].forEach(m => {
        tongCa++;
        const r = traPhi(g.ma, s.ma, t, m);
        if (r.co) bao('TERM', `${g.ma}/${s.ma} hang KHONG ban ma van tra ve phi (${t}t $${m})`);
        if (!r.vi) bao('TERM', `${g.ma}/${s.ma} tra "khong co" nhung KHONG NEU LY DO`);
      }));
      return;
    }
    // Trong khoảng: mọi tuổi × mọi mệnh giá
    for (let t = kt.tu; t <= kt.den; t++) mgs.forEach(m => {
      tongCa++;
      const r = traPhi(g.ma, s.ma, t, m);
      if (!r.co) { tKhong++; if (!r.vi) bao('TERM', `${g.ma}/${s.ma} ${t}t $${m}: khong co ma khong neu ly do`); return; }
      tCo++;
      bangTerm.kyHan.forEach(k => {
        const v = r.phi[k];
        if (v === undefined) bao('TERM', `${g.ma}/${s.ma} ${t}t $${m}: thieu ky han ${k}`);
        if (v !== null && !(v > 0)) bao('TERM', `${g.ma}/${s.ma} ${t}t $${m} ky han ${k}: phi khong hop le (${v})`);
      });
    });
    // Biên NGOÀI khoảng tuổi → phải "không có", tuyệt đối không nội suy
    [kt.tu - 1, kt.den + 1, -5, 0, 150].forEach(t => {
      tongCa++;
      if (traPhi(g.ma, s.ma, t, mgs[0]).co) bao('TERM', `${g.ma}/${s.ma}: tuoi ${t} NGOAI khoang ${kt.tu}-${kt.den} ma van tra phi`);
    });
    // Mệnh giá lạ → phải "không có"
    [1, 99999, 123456, 2000000].filter(m => !mgs.includes(m)).forEach(m => {
      tongCa++;
      if (traPhi(g.ma, s.ma, kt.tu, m).co) bao('TERM', `${g.ma}/${s.ma}: menh gia la $${m} ma van tra phi`);
    });
  }));
  console.log(`   ${tCo} to hop co phi · ${tKhong} to hop khong ban`);

  // ---- 2. IUL: quét mọi (kỳ hạn × giới × hạng) ---------------------------
  console.log('2. IUL — quet moi to hop');
  let iCo = 0, iKhong = 0;
  TP_KYHAN_IUL.forEach(k => TP_GIOI.forEach(g => TP_SUCKHOE_IUL.forEach(s => {
    const banDuoc = tpIulSucKhoeCoDuoc(k.ma, g.ma).includes(s.ma);
    if (!banDuoc) {
      [1, 45, 65].forEach(t => [100000, 500000].forEach(m => {
        tongCa++;
        const r = traPhiIul(k.ma, g.ma, s.ma, t, m);
        if (r.co) bao('IUL', `${k.ma}n/${g.ma}/${s.ma} KHONG ban ma van tra phi`);
        if (!r.vi) bao('IUL', `${k.ma}n/${g.ma}/${s.ma}: khong co ma khong neu ly do`);
      }));
      return;
    }
    const kt = tpIulKhoangTuoi(k.ma, g.ma, s.ma);
    const mgs = tpIulMenhGia(k.ma, g.ma, s.ma);
    for (let t = kt.tu; t <= kt.den; t++) mgs.forEach(m => {
      tongCa++;
      const r = traPhiIul(k.ma, g.ma, s.ma, t, m);
      if (!r.co) { iKhong++; if (!r.vi) bao('IUL', `${k.ma}n/${g.ma}/${s.ma} ${t}t $${m}: khong co ma khong neu ly do`); return; }
      iCo++;
      if (!(r.phi > 0)) bao('IUL', `${k.ma}n/${g.ma}/${s.ma} ${t}t $${m}: phi khong hop le (${r.phi})`);
    });
    [kt.tu - 1, kt.den + 1, 0, 200].forEach(t => {
      tongCa++;
      if (traPhiIul(k.ma, g.ma, s.ma, t, mgs[0]).co) bao('IUL', `${k.ma}n/${g.ma}/${s.ma}: tuoi ${t} NGOAI khoang ${kt.tu}-${kt.den} ma van tra phi`);
    });
    [1, 99999, 123456, 5000000].filter(m => !mgs.includes(m)).forEach(m => {
      tongCa++;
      if (traPhiIul(k.ma, g.ma, s.ma, kt.tu, m).co) bao('IUL', `${k.ma}n/${g.ma}/${s.ma}: menh gia la $${m} ma van tra phi`);
    });
  })));
  console.log(`   ${iCo} to hop co phi · ${iKhong} to hop khong ban`);

  // ---- 3. ĐẦU VÀO RÁC — không được văng, không được trả phi -------------
  console.log('3. Dau vao rac');
  const rac = [null, undefined, '', 'abc', NaN, Infinity, -1, 0, {}, [], '35'];
  rac.forEach(x => {
    tongCa += 2;
    try {
      const a = traPhi(x, x, x, x);
      if (a && a.co && typeof a.phi !== 'object') bao('RAC', `traPhi(${String(x)}) tra ve phi`);
    } catch (e) { bao('RAC', `traPhi(${String(x)}) VANG: ${e.message}`); }
    try {
      const b = traPhiIul(x, x, x, x, x);
      if (b && b.co) bao('RAC', `traPhiIul(${String(x)}) tra ve phi`);
    } catch (e) { bao('RAC', `traPhiIul(${String(x)}) VANG: ${e.message}`); }
  });
  // Tuổi/mệnh giá dạng CHUỖI (ô input trả chuỗi) — phải ra cùng kết quả với số
  ['MALE'].forEach(g => {
    const kt = tpKhoangTuoi(g, 'SNTBC'), m = tpMenhGiaCoDuoc(g, 'SNTBC')[0];
    tongCa++;
    const a = traPhi(g, 'SNTBC', kt.tu, m), b = traPhi(g, 'SNTBC', String(kt.tu), String(m));
    if (JSON.stringify(a) !== JSON.stringify(b)) bao('KIEU', 'tuoi/menh gia dang CHUOI ra ket qua khac dang SO');
  });

  // ---- 4. PDF: không bao giờ trỏ sai tổ hợp -----------------------------
  console.log('4. Bang tra PDF');
  const pdf = lay("tpPdf");
  if (pdf) {
    Object.keys(pdf.file || {}).forEach(k => {
      tongCa++;
      const p = k.split('|');   // CT|KY|GIOI|SK|TUOI|MG
      const o = p[0] === 'IUL' ? bangIul.bang[p[1] + '|' + p[2] + '|' + p[3]] : null;
      if (!o) { bao('PDF', `khoa ${k}: khong co nhom nay trong bang phi`); return; }
      const v = o.tuoi[+p[4]] && o.tuoi[+p[4]][+p[5]];
      if (v == null) bao('PDF', `khoa ${k}: to hop nay KHONG co phi trong bang phi`);
    });
    Object.keys(pdf.thuMuc || {}).forEach(k => {
      tongCa++;
      if (!/^IUL\|(15|20)(\|(MALE|FEMALE)\|(NTBC|TBC|EX1)(\|\d+)?)?$/.test(k)) bao('PDF', `khoa thu muc sai dinh dang: ${k}`);
    });
    if (pdf.capFile20) bao('PDF', 'capFile20 VAN CON — bo du lieu nay da bi loai (xem _capFile20)');
  }

  // ---- 5. BẢNG TRA 5.181 FILE: mọi khoá phải trỏ tổ hợp CÓ PHÍ THẬT -------
  // Đây là cửa chặn quan trọng nhất. Bản v1 (đã loại) trộn file 15 năm vào 20 năm
  // và gán tuổi = mệnh giá÷10.000 — cả hai đều bị bắt bởi đúng phép kiểm này.
  console.log('5. Bang tra file (pdf-file-iul.json)');
  const tep = lay('tpFile');
  if (!tep || !tep.file) { bao('FILE', 'KHONG nap duoc pdf-file-iul.json'); }
  else {
    let ok = 0;
    Object.keys(tep.file).forEach(k => {
      tongCa++;
      const p = k.split('|');            // KYHAN|GIOI|SUCKHOE|TUOI|MENHGIA
      if (p.length !== 5) { bao('FILE', `khoa sai dinh dang: ${k}`); return; }
      const o = bangIul.bang[`${p[0]}|${p[1]}|${p[2]}`];
      if (!o) { bao('FILE', `${k}: nhom nay khong co trong bang phi`); return; }
      const v = o.tuoi[+p[3]] && o.tuoi[+p[3]][+p[4]];
      if (v == null) { bao('FILE', `${k}: to hop KHONG co phi trong bang phi`); return; }
      const [a, b] = String(tep.file[k]).split(',');
      if (!a || !b) { bao('FILE', `${k}: thieu link pdf hoac csv`); return; }
      if (a === b) { bao('FILE', `${k}: pdf id TRUNG csv id`); return; }
      if (a.length < 20 || b.length < 20) { bao('FILE', `${k}: id qua ngan`); return; }
      ok++;
    });
    // Không ID nào được dùng cho hai tổ hợp khác nhau
    const tatCa = Object.values(tep.file).flatMap(v => String(v).split(','));
    const trung = tatCa.length - new Set(tatCa).size;
    tongCa++;
    if (trung) bao('FILE', `${trung} ID bi dung lai cho to hop khac`);
    console.log(`   ${ok} to hop hop le · ${trung} ID trung`);
  }

  // ---- KẾT ---------------------------------------------------------------
  console.log('');
  console.log('='.repeat(64));
  console.log(`TONG: ${tongCa.toLocaleString('en-US')} phep thu`);
  if (!loi.length) { console.log('KET QUA: 0 loi.'); return; }
  console.log(`KET QUA: ${loi.length} LOI`);
  loi.slice(0, 40).forEach(x => console.log('  - ' + x));
  if (loi.length > 40) console.log(`  ... con ${loi.length - 40} loi nua`);
  process.exitCode = 1;
})();
