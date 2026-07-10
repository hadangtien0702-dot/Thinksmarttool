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

// Helper to recursively list SVG files
function getSvgFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    // Skip node_modules, .git, and .gemini
    if (['node_modules', '.git', '.gemini', 'public'].includes(file)) return;
    
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
    res.json({ success: true, svgs });
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

  // Protect master templates: never allow overwriting files inside "File Final"
  const normalizedRel = relativePath.replace(/\\/g, '/').toLowerCase();
  if (normalizedRel.startsWith('file final/')) {
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

// API: Clone a template into a client proposal (saved in "Clients" folder)
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

    const clientsDir = path.join(WORKSPACE_DIR, 'Clients');
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

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`SVG Design Dashboard is running at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`==================================================`);
});
