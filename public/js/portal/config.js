// ============================================================================
// CẤU HÌNH SUPABASE — dán 2 giá trị từ Supabase Dashboard → Settings → API.
// anon key là khoá CÔNG KHAI (publishable) — commit được, không phải bí mật.
// Khi 2 giá trị còn trống: portal chạy "chế độ mở" (không bắt đăng nhập)
// để Tool vẫn dùng bình thường trong lúc chờ setup — xem SETUP-SUPABASE.md.
// ============================================================================
window.TST_CONFIG = {
  supabaseUrl: '',      // ví dụ: 'https://abcdefgh.supabase.co'
  supabaseAnonKey: '',  // ví dụ: 'eyJhbGciOi...'
};
