const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json({ limit: '50mb' }));

// Static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

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
  brochure: 'Brochure'
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

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Thinksmart Tool is running at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`==================================================`);
});
