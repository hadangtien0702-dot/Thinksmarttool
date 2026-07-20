// ============================================================================
// CẤU HÌNH SUPABASE — dán 2 giá trị từ Supabase Dashboard → Settings → API.
// anon key là khoá CÔNG KHAI (publishable) — commit được, không phải bí mật.
// Khi 2 giá trị còn trống: portal chạy "chế độ mở" (không bắt đăng nhập)
// để Tool vẫn dùng bình thường trong lúc chờ setup — xem SETUP-SUPABASE.md.
// ============================================================================
window.TST_CONFIG = {
  supabaseUrl: 'https://tdgunknoldhtchflopvf.supabase.co',      // ví dụ: 'https://abcdefgh.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZ3Vua25vbGRodGNoZmxvcHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzgxNzAsImV4cCI6MjEwMDA1NDE3MH0.9Bbxk5D4E3SpridNbANDs5UGDiZ0Ps1ZDXy8INNC-8o',  // ví dụ: 'eyJhbGciOi...'
};
