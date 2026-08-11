require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- ADMIN (Supabase service_role) — CHỈ server-side, đọc khoá từ env (.env / Vercel) ---
// service_role BỎ QUA RLS → CHỈ dùng trong /api/admin/* có kiểm quyền (requireAdmin).
// Chưa set key → supabaseAdmin = null → endpoint trả 503, phần còn lại của tool vẫn chạy.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;
const TEMP_PASSWORD = 'Drt$2022';          // mật khẩu tạm mặc định (chủ tool 23/07) — user tự đổi sau
const PHONG_BAN_HOP_LE = ['Sale', 'Agent', 'MKT', 'CS', 'Admin'];
const ROLE_TAO_HOP_LE = ['user', 'admin']; // quyền được phép tạo qua form (KHÔNG tạo super_admin qua UI)

// Body parser
app.use(express.json({ limit: '50mb' }));

// GỠ 21/07/2026 khi merge feat/login vào mainV1.1: trước đó "/", "/login",
// "/videos" bị redirect 302 về /tool vì portal còn dở, chưa muốn đội sale thấy.
// Portal đã xong (login + phân quyền + quản lý thành viên) nên trả lại trang chủ.
// Nếu cần giấu portal lần nữa: đặt lại khối redirect TRƯỚC express.static
// (static sẽ tự trả public/index.html cho "/" nếu đặt sau).

// Static files from "public" directory
//
// ☠️☠️ ĐỌC TRƯỚC KHI SỬA CACHE Ở ĐÂY: KHỐI NÀY **KHÔNG CHẠY TRÊN BẢN LIVE**.
// Vercel phục vụ `public/` thẳng từ CDN biên, request không bao giờ tới hàm Node.
// Đo được 11/08/2026 — dấu hiệu nằm ở `X-Vercel-Id`:
//     /js/core.js?v=47  ->  hkg1::s4htd-…          MỘT chặng  = CDN trả thẳng
//     /api/library      ->  hkg1::iad1::bm7zq-…    HAI chặng  = biên -> hàm ở iad1
// Tôi đã sửa đúng chỗ này, push, rồi đo lại: HTML mới lên nhưng `Cache-Control`
// KHÔNG đổi chút nào. Sửa ở đây chỉ ăn khi chạy `node server.js` ở máy.
// => Luật cache CHO BẢN LIVE nằm ở **`vercel.json`** (mục `headers`). Sửa một chỗ
//    phải sửa cả chỗ kia, không thì máy mình và bản live cư xử khác nhau.
//
// ☠️ CACHE — sửa 11/08/2026 sau khi ĐO trên bản live.
// Trước đó express.static để mặc định `max-age=0, must-revalidate`, nghĩa là MỖI lần
// vào trang trình duyệt phải hỏi lại máy chủ TỪNG file một dù file không đổi. Đo thật
// trên thinksmarttool-gy6f.vercel.app: 16/16 file trả 304 (không tải lại nội dung)
// nhưng vẫn tốn 1.233 ms tổng vòng hỏi — chạy 6 kết nối song song vẫn ~206 ms đứng
// không, trước cả khi chạy được dòng JS đầu tiên.
//
// Trong khi đó tool ĐÃ có sẵn cơ chế `?v=` (style.css?v=110, core.js?v=47...) —
// chính là thứ sinh ra để cache vĩnh viễn. Nên luật ở đây là:
//
//   CÓ `?v=`  → cache 1 năm, immutable (đổi nội dung thì bump `?v=`, ra khoá cache mới)
//   KHÔNG có  → giữ nguyên must-revalidate như cũ
//
// ⚠️ VÌ SAO DỰA VÀO `?v=` CHỨ KHÔNG THEO ĐUÔI FILE: những thứ KHÔNG có `?v=` đúng là
// những thứ TUYỆT ĐỐI không được cache lâu — `public/data/*.json` (BẢNG PHÍ BẢO HIỂM)
// và `public/templates/*` (mẫu proposal). Chủ tool thay bảng phí mà sale ôm bản cũ
// 1 năm là báo SAI SỐ TIỀN cho khách. Bám theo `?v=` thì hai nhóm đó tự động an toàn
// vì chúng vốn không mang tham số này.
// ⚠️ File .html cũng luôn phải hỏi lại — nó chính là chỗ chứa các con số `?v=`.
const CACHE_MOT_NAM = 31536000;
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    const coDauVan = !!(res.req && res.req.query && res.req.query.v);
    const laHtml = /\.html?$/i.test(filePath);
    res.setHeader('Cache-Control', (coDauVan && !laHtml)
      ? `public, max-age=${CACHE_MOT_NAM}, immutable`
      : 'public, max-age=0, must-revalidate');
  }
}));

// Root workspace directory
const WORKSPACE_DIR = __dirname;

// Helper to check if a path is safe (remains inside the workspace and is an SVG file)
function isPathSafe(relativeFilePath) {
  if (!relativeFilePath) return false;
  
  // Resolve absolute path
  const absolutePath = path.resolve(WORKSPACE_DIR, relativeFilePath);
  
  // Must start with workspace directory and end with .svg
  const isInsideWorkspace = absolutePath.startsWith(WORKSPACE_DIR);
  const isSvg = absolutePath.toLowerCase().endsWith('.svg');
  
  return isInsideWorkspace && isSvg;
}

// Only these workspace folders belong to the Proposal/Name Card tools — design WIP
// folders (1-Design, 5-Design-Sections, ...) must NOT leak into the file tree.
const PROPOSAL_SCAN_DIRS = ['2-Templates', '4-Clients', 'Name Card'];

// Helper to recursively list SVG files
function getSvgFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  const isRoot = path.resolve(dir) === path.resolve(WORKSPACE_DIR);

  files.forEach(file => {
    // At the workspace root, only descend into the tool-owned folders (allowlist)
    if (isRoot && !PROPOSAL_SCAN_DIRS.includes(file)) return;
    // Never descend into archived subfolders
    if (file === '_Archive') return;
    
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getSvgFiles(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.svg')) {
      const relativePath = path.relative(WORKSPACE_DIR, filePath).replace(/\\/g, '/');
      const parts = relativePath.split('/');
      let category = parts[0];
      if (file.toLowerCase().includes('iul')) {
        category = 'IUL';
      } else if (file.toLowerCase().includes('term')) {
        category = 'Term Life';
      } else if (relativePath.toLowerCase().includes('name card')) {
        category = 'Name Card';
      }
      const parentFolder = path.dirname(relativePath).replace(/\\/g, '/');
      
      fileList.push({
        name: file,
        path: relativePath,
        category: category,
        folder: parentFolder,
        size: stat.size,
        mtime: stat.mtime
      });
    }
  });
  
  return fileList;
}

// API: Get all SVGs
app.get('/api/svgs', (req, res) => {
  try {
    const svgs = getSvgFiles(WORKSPACE_DIR);

    // Also include the committed copies in public/templates/ so proposals still show on
    // deploys (e.g. Vercel) where the gitignored 2-Templates masters aren't present.
    // Dedupe by filename so local runs (which DO have 2-Templates) don't double up.
    const templatesDir = path.join(WORKSPACE_DIR, 'public', 'templates');
    if (fs.existsSync(templatesDir)) {
      const seen = new Set(svgs.map(f => f.name.toLowerCase()));
      fs.readdirSync(templatesDir).forEach(file => {
        if (!file.toLowerCase().endsWith('.svg') || seen.has(file.toLowerCase())) return;
        const abs = path.join(templatesDir, file);
        let stat;
        try { stat = fs.statSync(abs); } catch (e) { return; }
        const lower = file.toLowerCase();
        const isNameCard = lower.includes('name card');
        const carrier = lower.includes('aig') ? 'AIG' : lower.includes('nlg') ? 'NLG' : lower.includes('allianz') ? 'Allianz' : 'Khác';
        const category = lower.includes('iul') ? 'IUL'
          : lower.includes('term') ? 'Term Life'
          : (isNameCard ? 'Name Card' : carrier);
        svgs.push({
          name: file,
          path: 'public/templates/' + file,
          category,
          // Synthetic folder so the client treats these as protected masters under the right carrier
          folder: isNameCard ? 'Name Card/Chung' : '2-Templates/' + carrier,
          size: stat.size,
          mtime: stat.mtime
        });
      });
    }

    // Trên Vercel (serverless, filesystem chỉ-đọc/tạm thời) → client lưu nháp vào localStorage
    // của trình duyệt thay vì ghi file server. Local (node server.js) giữ nguyên ghi 4-Clients/.
    res.json({ success: true, svgs, draftsMode: process.env.VERCEL ? 'browser' : 'server' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get single SVG content
app.get('/api/svgs/content', (req, res) => {
  const { path: relativePath } = req.query;
  
  if (!isPathSafe(relativePath)) {
    return res.status(400).json({ success: false, error: 'Đường dẫn file không hợp lệ hoặc không an toàn.' });
  }
  
  try {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy file.' });
    }
    
    const content = fs.readFileSync(absolutePath, 'utf8');
    res.json({ success: true, path: relativePath, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Save SVG content
app.post('/api/svgs/save', (req, res) => {
  const { path: relativePath, content } = req.body;

  if (!isPathSafe(relativePath)) {
    return res.status(400).json({ success: false, error: 'Đường dẫn file không hợp lệ hoặc không an toàn.' });
  }

  // Protect master templates: never allow overwriting files inside "2-Templates" or "Name Card"
  const normalizedRel = relativePath.replace(/\\/g, '/').toLowerCase();
  if (normalizedRel.startsWith('2-templates/') || normalizedRel.startsWith('name card/') || normalizedRel.startsWith('public/templates/')) {
    return res.status(403).json({ success: false, error: 'Đây là file MẪU GỐC, không thể ghi đè. Hãy bấm "Tạo Proposal Mới" để tạo bản sao cho khách hàng rồi chỉnh sửa trên bản sao đó.' });
  }
  
  if (typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'Nội dung file phải là chuỗi ký tự.' });
  }
  
  try {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    
    // Ensure parent directory exists (just in case)
    const parentDir = path.dirname(absolutePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    fs.writeFileSync(absolutePath, content, 'utf8');
    res.json({ success: true, message: 'Đã lưu file thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Clone a template into a client proposal (saved in "4-Clients" folder)
app.post('/api/svgs/clone', (req, res) => {
  const { templatePath, clientName, content } = req.body;

  if (!isPathSafe(templatePath)) {
    return res.status(400).json({ success: false, error: 'Đường dẫn file mẫu không hợp lệ.' });
  }
  if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập tên khách hàng.' });
  }

  try {
    const absoluteTemplate = path.resolve(WORKSPACE_DIR, templatePath);
    if (!fs.existsSync(absoluteTemplate)) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy file mẫu.' });
    }

    // Sanitize client name for filename usage
    const safeName = clientName.trim().replace(/[\\/:*?"<>|]/g, '').slice(0, 60);
    const baseName = path.basename(templatePath, path.extname(templatePath));

    const clientsDir = path.join(WORKSPACE_DIR, '4-Clients');
    if (!fs.existsSync(clientsDir)) {
      fs.mkdirSync(clientsDir, { recursive: true });
    }

    // Avoid overwriting an existing client's proposal
    let fileName = `${safeName} - ${baseName}.svg`;
    let targetPath = path.join(clientsDir, fileName);
    let counter = 2;
    while (fs.existsSync(targetPath)) {
      fileName = `${safeName} - ${baseName} (${counter}).svg`;
      targetPath = path.join(clientsDir, fileName);
      counter++;
    }

    // If the client sent edited content, use it; otherwise copy the template file
    if (typeof content === 'string' && content.trim() !== '') {
      fs.writeFileSync(targetPath, content, 'utf8');
    } else {
      fs.copyFileSync(absoluteTemplate, targetPath);
    }

    const relativePath = path.relative(WORKSPACE_DIR, targetPath).replace(/\\/g, '/');
    res.json({ success: true, path: relativePath, name: fileName });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Delete a client draft — ONLY .svg files inside "4-Clients" (masters can never be deleted)
app.post('/api/svgs/delete', (req, res) => {
  const { path: relativePath } = req.body;

  if (!isPathSafe(relativePath)) {
    return res.status(400).json({ success: false, error: 'Đường dẫn file không hợp lệ hoặc không an toàn.' });
  }

  const normalizedRel = String(relativePath).replace(/\\/g, '/').toLowerCase();
  if (!normalizedRel.startsWith('4-clients/') || !normalizedRel.endsWith('.svg')) {
    return res.status(403).json({ success: false, error: 'Chỉ có thể xoá bản nháp trong thư mục 4-Clients.' });
  }

  try {
    const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy file.' });
    }
    fs.unlinkSync(absolutePath);
    res.json({ success: true, message: 'Đã xoá bản nháp.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================================================
// LIBRARY (Brochure / Name Card) — downloadable assets grouped by carrier
// ==========================================================================

// Folders (relative to workspace) that hold downloadable library assets
const LIBRARY_SECTIONS = {
  brochure: 'Brochure',
  // Bảng so sánh quyền lợi các hãng (chủ tool yêu cầu 21/07/2026) — 16 PNG nằm
  // NGAY GỐC folder (không chia hãng con) nên rơi vào nhóm 'Chung'. Folder này
  // ĐÃ commit vào repo (khác Brochure/ bị gitignore) → mục này chạy CẢ trên Vercel.
  soSanh: 'Bang so sanh quyen loi cac hang',
  // Tin nhắn mẫu cho sale (chủ tool đưa 10/08/2026). Ảnh dọc rất cao (bản đầu
  // 1080x7082) nên KHÔNG xem bằng khung brochure thường — xem showTallPreview
  // trong js/brochure.js.
  // ☠️ Folder phải ở GỐC repo, KHÔNG để trong 2-Templates/: thư mục đó bị
  // .gitignore chặn → chạy được ở máy nhưng MẤT TRẮNG trên bản live, mà không có
  // thông báo lỗi nào (đúng cái bẫy đã ghi trong .gitignore).
  sms: 'SMS',
  appform: 'Application Form'
};

const DOWNLOADABLE_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ai', '.eps', '.zip'];

// Scan a section folder → { <carrier>: [ {name, path, size, ext, mtime} ] }
function scanLibrarySection(sectionDir) {
  const absSection = path.join(WORKSPACE_DIR, sectionDir);
  const groups = {};
  if (!fs.existsSync(absSection)) return groups;

  function addFile(groupName, absFile, fileName) {
    const ext = path.extname(fileName).toLowerCase();
    if (!DOWNLOADABLE_EXT.includes(ext)) return;
    let stat;
    try { stat = fs.statSync(absFile); } catch (e) { return; }
    const rel = path.relative(WORKSPACE_DIR, absFile).replace(/\\/g, '/');
    (groups[groupName] = groups[groupName] || []).push({
      name: fileName,
      path: rel,
      size: stat.size,
      ext: ext.replace('.', ''),
      mtime: stat.mtime
    });
  }

  fs.readdirSync(absSection).forEach(entry => {
    const abs = path.join(absSection, entry);
    let stat;
    try { stat = fs.statSync(abs); } catch (e) { return; }
    if (stat.isDirectory()) {
      // Carrier subfolder → its files
      fs.readdirSync(abs).forEach(f => {
        const absF = path.join(abs, f);
        try { if (fs.statSync(absF).isFile()) addFile(entry, absF, f); } catch (e) {}
      });
    } else if (stat.isFile()) {
      // Loose file directly in section → "Chung" group
      addFile('Chung', abs, entry);
    }
  });
  return groups;
}

// API: List downloadable library assets (brochure + name card)
app.get('/api/library', (req, res) => {
  try {
    const result = {};
    Object.keys(LIBRARY_SECTIONS).forEach(key => {
      result[key] = scanLibrarySection(LIBRARY_SECTIONS[key]);
    });
    res.json({ success: true, library: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Download / inline-preview a library asset. Restricted to library folders.
app.get('/api/download', (req, res) => {
  const relativePath = req.query.path;
  const inline = req.query.inline === '1';

  if (!relativePath) {
    return res.status(400).json({ success: false, error: 'Thiếu tham số path.' });
  }

  const absolutePath = path.resolve(WORKSPACE_DIR, relativePath);

  // Must stay inside workspace AND inside a whitelisted library folder
  const allowedRoots = Object.values(LIBRARY_SECTIONS).map(d => path.resolve(WORKSPACE_DIR, d));
  const isInside = absolutePath.startsWith(WORKSPACE_DIR);
  const isAllowed = allowedRoots.some(root => absolutePath.startsWith(root + path.sep) || absolutePath === root);

  if (!isInside || !isAllowed) {
    return res.status(403).json({ success: false, error: 'Đường dẫn không hợp lệ hoặc không được phép.' });
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy file.' });
  }

  const fileName = path.basename(absolutePath);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileName)}"`);
  res.sendFile(absolutePath);
});

// ---------------------------------------------------------------------------
// PORTAL — URL sạch cho các trang (index.html là trang chủ portal, do static
// middleware phục vụ sẵn ở "/"). Tool cũ chuyển về /tool (file public/tool.html).
// KHÔNG dùng dấu "/" cuối: các đường dẫn tương đối trong tool.html (style.css,
// js/..., templates/...) phải resolve về gốc "/" mới đúng.
// ---------------------------------------------------------------------------
const PORTAL_PAGES = { '/tool': 'tool.html', '/login': 'login.html', '/videos': 'videos.html', '/members': 'members.html' };
Object.entries(PORTAL_PAGES).forEach(([route, file]) => {
  // Express non-strict: "/tool" match cả "/tool/" — tự redirect bỏ dấu "/" cuối
  app.get(route, (req, res) => {
    if (req.path !== route) return res.redirect(301, route);
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

// ---------------------------------------------------------------------------
// ADMIN API — thêm tài khoản / đổi mật khẩu. CHỈ admin & super_admin (chủ tool
// chốt 23/07: admin làm được đầy đủ). Mọi request phải kèm token đăng nhập; server
// verify token + tra profiles TRƯỚC khi dùng service_role. Không có bước này thì
// bất kỳ ai gọi API cũng đổi được mật khẩu người khác.
// ---------------------------------------------------------------------------
async function requireAdmin(req, res, next) {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' });
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Thiếu token đăng nhập.' });
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles').select('id, role, status').eq('id', user.id).single();
    if (pErr || !profile) return res.status(403).json({ error: 'Không tìm thấy hồ sơ người dùng.' });
    if (!['admin', 'super_admin'].includes(profile.role) || profile.status !== 'active') {
      return res.status(403).json({ error: 'Chỉ Admin mới được thao tác này.' });
    }
    req.caller = profile;
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Lỗi xác thực: ' + e.message });
  }
}

// Tạo tài khoản mới: quyền chọn (mặc định 'user' nhân viên), phòng ban mặc định Sale,
// status active, mật khẩu tạm Drt$2022 (hiện cho admin gửi user; user tự đổi sau).
app.post('/api/admin/create-user', requireAdmin, async (req, res) => {
  const ten = String((req.body && req.body.full_name) || '').trim();
  const mail = String((req.body && req.body.email) || '').trim().toLowerCase();
  const phong = PHONG_BAN_HOP_LE.includes(req.body && req.body.department) ? req.body.department : 'Sale';
  const role = ROLE_TAO_HOP_LE.includes(req.body && req.body.role) ? req.body.role : 'user';
  const pass = (String((req.body && req.body.password) || '').trim()) || TEMP_PASSWORD;
  if (!ten) return res.status(400).json({ error: 'Thiếu họ tên.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return res.status(400).json({ error: 'Email không hợp lệ.' });
  if (pass.length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' });
  try {
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: mail, password: pass, email_confirm: true, user_metadata: { full_name: ten }
    });
    if (cErr) return res.status(400).json({ error: cErr.message });
    const newId = created.user.id;
    // Trigger đã tạo profile (status 'pending'); nâng lên active + set phòng ban + quyền.
    // upsert phòng trường hợp trigger chưa kịp.
    const { error: uErr } = await supabaseAdmin.from('profiles')
      .upsert({ id: newId, full_name: ten, email: mail, department: phong, status: 'active', role: role }, { onConflict: 'id' });
    if (uErr) return res.status(500).json({ error: 'Đã tạo tài khoản nhưng cập nhật hồ sơ lỗi: ' + uErr.message });
    return res.json({ success: true, email: mail, password: pass, role: role });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Đổi mật khẩu 1 người. Admin gõ mật khẩu tuỳ ý (body.password); bỏ trống → dùng mật khẩu tạm.
app.post('/api/admin/reset-password', requireAdmin, async (req, res) => {
  const id = String((req.body && req.body.userId) || '').trim();
  const pass = (String((req.body && req.body.password) || '').trim()) || TEMP_PASSWORD;
  if (!id) return res.status(400).json({ error: 'Thiếu userId.' });
  if (pass.length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' });
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: pass });
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true, password: pass });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// SUA HO SO + XOA TAI KHOAN (chu tool chot 31/07/2026: "cho cac manager chu dong
// xoa nhan vien cua minh"). BAC THANG QUYEN — chi quan duoc nguoi CAP DUOI:
//   • super_admin: moi nguoi, ke ca admin.
//   • admin: CHI 'user' — khong dung admin khac, khong dung super_admin,
//     khong cap/go quyen (viec do cua super_admin).
//   • khong ai doi quyen hoac xoa CHINH MINH (chong tu khoa).
// ☠️ service_role BO QUA trigger enforce_member_update ⇒ luat tren phai kiem
// ngay TAI DAY. Khong duoc trong cho DB chan ho nhu duong client goi thang Supabase.
// ---------------------------------------------------------------------------
async function layMucTieu(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles').select('id, full_name, email, role, status').eq('id', userId).single();
  return (error || !data) ? null : data;
}

// Tra ve chuoi loi neu nguoi goi KHONG duoc dong den muc tieu; null = duoc phep.
function loiBacThang(caller, target) {
  if (caller.role === 'super_admin') return null;
  if (caller.role === 'admin') {
    return target.role === 'user'
      ? null
      : 'Admin chi quan ly duoc Nhan vien. Tai khoan nay phai do Super Admin xu ly.';
  }
  return 'Khong co quyen.';
}

// Sua ho so: ho ten, email dang nhap, phong ban, quyen, mat khau — mot lan goi.
// Truong nao khong gui thi giu nguyen (undefined = khong dong toi).
app.post('/api/admin/update-user', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const id = String(b.userId || '').trim();
  if (!id) return res.status(400).json({ error: 'Thiếu userId.' });

  const target = await layMucTieu(id);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy tài khoản này.' });

  const laChinhMinh = target.id === req.caller.id;
  if (!laChinhMinh) {
    const loi = loiBacThang(req.caller, target);
    if (loi) return res.status(403).json({ error: loi });
  }

  const hoSo = {};
  if (b.full_name !== undefined) {
    const ten = String(b.full_name).trim();
    if (!ten) return res.status(400).json({ error: 'Họ tên không được để trống.' });
    hoSo.full_name = ten;
  }
  let mailMoi = null;
  if (b.email !== undefined) {
    const mail = String(b.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return res.status(400).json({ error: 'Email không hợp lệ.' });
    if (mail !== String(target.email || '').trim().toLowerCase()) { mailMoi = mail; hoSo.email = mail; }
  }
  if (b.department !== undefined) {
    hoSo.department = PHONG_BAN_HOP_LE.includes(b.department) ? b.department : '';
  }
  if (b.role !== undefined && String(b.role) !== target.role) {
    if (req.caller.role !== 'super_admin') return res.status(403).json({ error: 'Chỉ Super Admin mới đổi được quyền.' });
    if (laChinhMinh) return res.status(400).json({ error: 'Không thể tự đổi quyền của chính mình.' });
    if (!['user', 'admin', 'super_admin'].includes(b.role)) return res.status(400).json({ error: 'Quyền không hợp lệ.' });
    hoSo.role = b.role;
  }
  let passMoi = null;
  if (b.password !== undefined && String(b.password).trim()) {
    passMoi = String(b.password).trim();
    if (passMoi.length < 6) return res.status(400).json({ error: 'Mật khẩu cần tối thiểu 6 ký tự.' });
  }

  try {
    // auth TRUOC (email/mat khau): email trung nguoi khac thi Supabase bao loi o
    // day va dung lai — tranh canh profiles da doi ma dang nhap van email cu.
    if (mailMoi || passMoi) {
      const patch = {};
      if (mailMoi) { patch.email = mailMoi; patch.email_confirm = true; }
      if (passMoi) patch.password = passMoi;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, patch);
      if (error) return res.status(400).json({ error: error.message });
    }
    if (Object.keys(hoSo).length) {
      const { error } = await supabaseAdmin.from('profiles').update(hoSo).eq('id', id);
      if (error) return res.status(500).json({ error: 'Đã đổi đăng nhập nhưng lưu hồ sơ lỗi: ' + error.message });
    }
    return res.json({ success: true, email: mailMoi || target.email, doiEmail: !!mailMoi, doiMatKhau: !!passMoi });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Xoa tai khoan — hai muc do:
//   hard=false (mem): profiles.status='deleted' → an khoi danh sach, khoi phuc duoc,
//                     NHUNG tai khoan dang nhap van con ⇒ email do CHUA dung lai duoc.
//   hard=true  (han): auth.admin.deleteUser → profiles / usage_events / presence
//                     bay theo (on delete cascade) ⇒ MAT luon lich su tab Do luong.
app.post('/api/admin/delete-user', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const id = String(b.userId || '').trim();
  const xoaHan = b.hard === true;
  if (!id) return res.status(400).json({ error: 'Thiếu userId.' });
  if (id === req.caller.id) return res.status(400).json({ error: 'Không thể tự xoá tài khoản của chính mình.' });

  const target = await layMucTieu(id);
  if (!target) return res.status(404).json({ error: 'Không tìm thấy tài khoản này.' });
  const loi = loiBacThang(req.caller, target);
  if (loi) return res.status(403).json({ error: loi });

  try {
    if (xoaHan) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (error) return res.status(400).json({ error: error.message });
      // profiles co "on delete cascade" nen thuong tu bay; don not neu con sot.
      await supabaseAdmin.from('profiles').delete().eq('id', id);
      return res.json({ success: true, hard: true, email: target.email });
    }
    const { error } = await supabaseAdmin.from('profiles').update({ status: 'deleted' }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, hard: false, email: target.email });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Thinksmart Tool is running at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`==================================================`);
});
