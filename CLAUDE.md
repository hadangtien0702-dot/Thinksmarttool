# Thinksmart Tool — đọc gì trước khi làm

> File này nạp TỰ ĐỘNG mỗi phiên trong thư mục dự án. Nó **cố ý ngắn**: kiến thức
> thật nằm ở project skill bên dưới, đây chỉ là biển chỉ đường.
> Lập 2026-07-27.

## 1. Nạp project skill TRƯỚC KHI làm bất cứ việc gì

```
.claude/skills/thinksmarttool/SKILL.md
```

Đó là **nguồn sự thật** của dự án, kèm 6 file tham chiếu:

| File | Khi nào đọc |
|---|---|
| `references/changelog.md` | **ĐỌC MỖI PHIÊN, đọc SAU CÙNG** — trạng thái mới nhất + danh sách việc CÒN TREO. Mâu thuẫn với bất cứ chỗ nào khác thì **file này thắng** (245 KB, luôn được cập nhật) |
| `references/architecture.md` | Cấu trúc thư mục, API `server.js`, luồng dữ liệu |
| `references/tools.md` | Từng công cụ: Proposal · Brochure · Name Card · So sánh quyền lợi |
| `references/conventions.md` | Bump cache-version, quy tắc git, workflow local-first, cách kiểm chứng |
| `references/deployment.md` | GitHub + Vercel, hai URL, các bước publish |
| `references/design-lessons.md` | **Đọc TRƯỚC mọi việc UI**, ghi bài học mới vào SAU |

**Và cập nhật lại chúng cuối phiên** — skill có hẳn mục "Keep this skill current".

## 2. Luật TUYỆT ĐỐI về nội dung — không có trong skill, nhớ kỹ

**Số liệu bảo hiểm KHÔNG được tự sửa, tự làm tròn, tự suy ra.** Chép nguyên văn từ
nguồn anh Tiến đưa. Thiếu thì **hỏi**, không đoán.

Sai một con số trong bảng minh hoạ quyền lợi là **sai với khách hàng thật** của một
công ty bảo hiểm nhân thọ. Đây là loại lỗi không có "sửa sau cũng được".

## 2b. LUẬT VỀ 4 MẪU PROPOSAL — đọc TRƯỚC khi thay file mẫu

Đưa lên đây (thay vì để trong changelog 245 KB) vì **31/07/2026 tôi đã vấp đúng chỗ này**:
luật dưới có sẵn trong changelog từ 15/07 mà tôi không tra, thay mẫu mới xong làm vỡ.
Anh Tiến: *"anh nhớ cái này đã note lại rồi mà em, em không kiểm tra hả em?"*

**① Mục "3. Thông tin đại lý" CHỈ ĐƯỢC CÓ ĐÚNG 4 Ô:**
Tên Agent Assistant · SĐT Agent Assistant · Tên Licensed Agent · SĐT Licensed Agent.
CEO **không** được sửa. Thừa ô nào cũng là lỗi — sale gõ nhầm vào tiêu đề là phá bản vẽ.

**② Bộ dò trường neo theo NHÃN, không theo toạ độ.** Vùng đại lý = mọi dòng nằm DƯỚI chữ
`PRESENTED BY` (`yPresentedBy` trong `js/proposal.js`). Ngưỡng cứng `Y >= 1100` cũ **đã vỡ**
khi chủ tool xuất lại mẫu với bố cục dịch xuống. Đừng quay về ngưỡng cứng.

**③ Thay file mẫu — 5 bước, thiếu bước nào cũng có lỗi thật đã xảy ra:**
1. **Sao lưu** bản đang chạy trước khi ghi đè.
2. Thay vào **CẢ HAI** nơi: `2-Templates/<hãng>/` **và** `public/templates/`. Đối chiếu mã băm.
   `2-Templates/` bị gitignore → thứ chạy trên live là `public/templates/`.
3. ☠️ **Sao lưu KHÔNG được để trong `2-Templates/`** — thư mục đó bị `PROPOSAL_SCAN_DIRS`
   quét, cây thư mục lập tức thành 9 mẫu (4 bản cũ hiện trùng tên). Để ở `_Archive/`.
4. **Nén ảnh nền nếu > 2800px.** File xuất ra chỉ 1190px bề ngang. Đo 31/07: NLG
   5802px → 2800px = **8,18 → 2,60 MB (−68%)**. **GIỮ PNG** — ảnh có vùng trong suốt
   (alpha 0..255), chuyển JPEG nhẹ hơn 6 lần nhưng **hỏng nền**.
5. **Kiểm bằng chính hàm thật của tool** (`loadSvgContent` + `populateProposalTextsEditor`
   chạy trong một trang đo tạm), và **IN RA ĐỌC TỪNG Ô** — đếm số ô rồi báo xong là cách
   tôi để lọt 7 ô rác ngày 31/07.

**④ Số La Mã trong huy hiệu mục có thể là `<text>` HOẶC `<path>`** (chủ tool create outlines).
Đừng grep `<text>` rồi kết luận "mất chữ" — phải render và **đếm phần tử nằm trong ô huy hiệu**.

## 2b-bis. ☠️ LUẬT PHÁT HÀNH TÍNH NĂNG MỚI — chủ tool chốt 10/08/2026

> Nguyên văn: *"các tính năng mới sẽ được build dưới quyền super admin — sau khi hoàn
> chỉnh và test xong mới được cho admin và user thấy"*.

**Áp cho MỌI tính năng mới, không có ngoại lệ.** Ba nấc, đi đúng thứ tự:

| Nấc | Ai thấy | Khi nào được lên nấc sau |
|---|---|---|
| **1. Đang xây** | **CHỈ `super_admin`** | Chủ tool bấm thử trên bản live và **duyệt** |
| **2. Đang thử** | + `admin` (11 người) | Admin dùng thật vài ngày, không báo lỗi |
| **3. Phát hành** | + `user` (77 sale) | — |

**Vì sao:** 77 sale đang dùng tool để làm việc với khách hàng thật. Một tính năng
nửa vời lọt xuống họ là bản vẽ sai gửi tới khách, chứ không phải "lỗi nhỏ sửa sau".
Nấc 1 cho phép **đẩy code lên live để thử trên máy thật** mà không ai khác nhìn thấy.

**CƠ CHẾ (đã xây 10/08/2026):** cột `khoa_muc.hien_cho` = `super` | `admin` | `all`.
Đổi nấc bằng dải 3 nút trong tab **"Khoá mục"** — một cú bấm, không cần push.
Đọc ở `duocThayMuc(ma)` trong `core.js`; `renderFileTree` không vẽ mục chưa tới nấc.

**⚠️ Bốn chỗ dễ làm sai:**
1. **`hien_cho` KHÁC `khoa`, đừng gộp.** `khoa` = mục vẫn hiện nhưng thay bằng khối
   "Đang cập nhật", và **chỉ áp cho role `user`**. `hien_cho` = mục **không hiện chút
   nào**, áp cho **mọi role** — đó là thứ duy nhất giấu được với admin.
2. **Tính năng mới phải khai mặc định `'super'` NGAY TRONG `appState.hienCho`** ở
   `core.js`, đừng chỉ dựa vào dòng trên Supabase. Bảng chưa có dòng / chưa chạy
   migration / mạng lỗi — mọi đường hỏng đều phải hỏng về phía GIẤU, không phải phía lộ.
3. **Ẩn ở giao diện KHÔNG PHẢI là chặn.** Nếu tính năng đọc/ghi dữ liệu thì phải
   chặn cả ở **RLS trên Supabase** — ẩn nút mà API vẫn mở thì ai gọi thẳng cũng vào được.
4. **Chế độ mở** (chạy `node server.js` chưa cấu hình Supabase) coi như Super Admin —
   để máy dev thử được. Bản live luôn có đăng nhập nên nhánh này không chạy ở đó.

**Ghi lại nấc hiện tại của từng tính năng đang xây ở mục "CÒN TREO" trong changelog** —
để phiên sau không tự ý mở cho cả đội thấy.

## 2b-ter. ☠️ TUỔI BẢO HIỂM — hai luật chủ tool chốt 10/08/2026, ĐỪNG SỬA

Sai một tuổi = sale báo **sai bậc phí** cho khách thật. Hai điều dưới đây là **chủ tool
trả lời trực tiếp**, không suy ra từ code hay từ bản forum:

1. **Cả 3 hãng (AIG · NLG · Allianz) đều dùng `age nearest birthday`.** Nên chỉ có MỘT
   quy tắc, KHÔNG cần chọn hãng trước khi tính. Nếu sau này có hãng dùng
   `age last birthday` thì phải thêm bước chọn hãng — hai kiểu lệch nhau 1 tuổi ở
   **quá nửa số ngày trong năm**.
2. **Sinh 29/02, năm không nhuận thì sinh nhật tính là 28/02** (không phải 01/03).

**Cách tính đang chạy** (`public/js/tinhtuoi.js`): qua sinh nhật **HƠN 6 tháng lịch**
thì +1; đúng 6 tháng chẵn thì giữ nguyên. **Đo bằng THÁNG, không phải bằng NGÀY** —
đã vấp một lần: nửa năm theo ngày là 182,5 nhưng 6 tháng lịch có thể chỉ 181 ngày.

**Trước khi sửa bất cứ dòng nào trong `tinhtuoi.js`, chạy:**

```
node scripts/kiem-tinh-tuoi.js
```

Nó cho **hai bản cài đặt độc lập cãi nhau** trên 102.347 phép tính. ☠️ **Đừng lấy bản
forum làm chuẩn** — đo 10/08/2026 thấy nó có 3 lỗi (tuổi thực −1 vào đúng ngày sinh
nhật; "ngày tăng tuổi" sớm 1 ngày; sinh 29/02 bị cộng 7 tháng thay vì 6).

## 2b-quater. ☠️ BẢNG PHÍ BẢO HIỂM — luật bất di bất dịch (10/08/2026)

Hai bảng phí nằm ở `public/data/*.json`, **SINH RA** từ `scripts/*.txt` bằng
`node scripts/doi-bang-phi.js` và `node scripts/doi-bang-phi-iul.js`.
**ĐỪNG SỬA FILE .json BẰNG TAY** — chạy lại script là mất.

**Nguồn gốc:** Google Sheet trong Drive do **sếp của chủ tool** làm và kiểm tra.
Chủ tool chốt: *"số Drive là chuẩn, em có thể làm theo số Drive"*.

☠️ **BỐN Ô TRONG BẢNG IUL 20 NĂM ĐÃ ĐƯỢC SỬA 11/08/2026 — chủ tool duyệt.**
10/08 soi ra "6 ô nghi gõ nhầm" bằng quy luật tỉ lệ, chủ tool chốt giữ nguyên.
11/08 chủ tool nói rõ: **PDF minh hoạ của hãng là số đúng, Sheet/Excel mới là chỗ
đánh lộn**. Có thước ngoài phân xử — **tên file PDF chứa luôn số phí** — nên đối
chiếu được 5.193 dòng: 4 ô có PDF khớp đúng "số theo quy luật" → đã sửa; **2 ô kia
PDF khớp Sheet** → thước của tôi báo nhầm, giữ nguyên.
Chi tiết + số cũ/mới ghi ở đầu `scripts/bang-phi-iul-nlg-20nam-ntbc.txt`.
→ **Bài học: quy luật tỉ lệ chỉ để KHOANH VÙNG, không đủ để kết tội.** 6 ô nghi thì
  chỉ 4 là thật. Muốn sửa số phí phải có thước NGOÀI (PDF hãng / bản đang chạy).
→ Sửa số trong file `.txt` thì **phải sửa cả TỔNG KIỂM TRA cuối dòng** (không thì
  script chặn) và sửa **theo vị trí cột** đọc từ header `#MG` của chính sheet đó —
  thay bằng chuỗi sẽ bắt nhầm (dòng `20FN|33` có cả `577.20` lẫn `577.10`).
→ Còn **11 ô lệch nhỏ** (0,01–1,55) chưa rõ nguyên nhân, và **1 tổ hợp có HAI file
  trên Drive** với hai mức phí (Nam NTBC 2t/100k: $29.90 vs $97.17) — chờ sếp xác nhận.

☠️ **HAI CHƯƠNG TRÌNH DÙNG HAI BỘ MÃ SỨC KHOẺ:** Term Life `SNTBC/STBC/ENTBC1` ·
IUL `NTBC/TBC/EX1`. Dùng nhầm bộ là tra không ra dòng nào.

☠️ **CƠ CẤU KHÁC NHAU:** Term Life không chọn kỳ hạn, trả về **4 số**. IUL **chọn**
15 hoặc 20 năm, trả về **1 số**. Mỗi tổ hợp có bộ mệnh giá + khoảng tuổi RIÊNG —
15 năm chỉ có NTBC (nam & nữ), tuổi 45–60, 5 mệnh giá. Tổ hợp không có số thì
**làm mờ nút**, tuyệt đối không nội suy.

**Trước khi tin bảng phí mới, chạy hai bộ soi:**
```
node scripts/soi-bang-phi.js      # thu tu ky han / tuoi / menh gia
node scripts/kiem-tinh-tuoi.js    # cong thuc tuoi — 102.347 phep tinh
```
⚠️ Đọc kỹ phần lọc trong `soi-bang-phi.js`: phí term life có **hai hiện tượng THẬT**
làm thước báo sai — tuổi 20–26 phí giảm dần, và "banding" khiến 250k rẻ hơn 200k.

## 2c. KHOÁ MỤC — chủ tool tự khoá từng phần khi đang cập nhật (10/08/2026)

Trước đây muốn khoá phải sửa code + push. Nay bật/tắt ngay trên web.

- **Ở đâu:** `/members` → tab thứ 3 **"Khoá mục"**. Super Admin **và Admin** đều dùng được.
- **Khoá được 8 mục** (cập nhật 11/08/2026 — trước đây tài liệu này ghi 4, đã sai):
  `proposal` · `brochure` · `appform` · `namecard` · `compare` · `sms` · `tinhtuoi` · `tinhphi`.
  Danh sách nằm ở `MUC_KHOA` trong `js/portal/members.js` — thêm mục thì sửa ở đó.
- **Khoá chỉ áp cho role `user`** (77 nhân viên). Admin/Super Admin luôn vào được — họ là
  người đang cập nhật nội dung, khoá họ là tự khoá đường sửa.
- **Trạng thái nằm ở bảng `khoa_muc` trên Supabase**, KHÔNG phải localStorage — khoá phải
  áp cho cả đội, để ở máy chủ tool thì chỉ mình chủ tool thấy.
- ☠️ **THÊM MỤC MỚI = 7 CHỖ, thiếu một là hỏng lặng lẽ** (đúc 11/08/2026 khi nối
  Application Form): `appState.khoaMuc` · `appState.hienCho` (='super') ·
  `appState.library` (nếu là thư viện file) · `NAV_ICONS` · `renderFileTree`
  (main.js) · **`MUC_KHOA` (members.js)** · **`insert into khoa_muc` (schema.sql)**.
  Thiếu dòng SQL thì bấm đổi nấc **không ăn mà cũng không báo lỗi** — UPDATE khớp
  0 dòng vẫn trả 204.
- ☠️ **Dùng `UPDATE`, KHÔNG `upsert`.** Các dòng đã tạo sẵn bằng SQL. `upsert` bị PostgREST
  dịch thành `INSERT ... ON CONFLICT DO UPDATE` — lệnh này phải ĐỌC hàng để dò trùng khoá,
  chính là lỗi đã làm tính năng "ai đang online" chết câm suốt 8 ngày mà không ai biết.
- **Lỗi mạng khi đọc bảng → coi như không khoá gì.** Thà mở nhầm một lúc còn hơn cả đội
  đứng hình vì một cú timeout.

## 2c-bis. MỤC "SMS / Tin nhắn mẫu" (10/08/2026) — ảnh để ở đâu, xem bằng khung nào

- **Ảnh nằm ở `SMS/` NGAY GỐC dự án.** ☠️ ĐỪNG để trong `2-Templates/SMS/` — thư mục đó
  bị `.gitignore` chặn: chạy ngon ở máy nhưng **mất trắng trên live, không báo lỗi gì**
  (đúng cái bẫy `Brochure/` đã ghi trong chính file `.gitignore`).
  Thêm ảnh mới xong: `git check-ignore -v "SMS/<tên file>"` — không ra dòng nào là an toàn.
- **Cơ chế:** `LIBRARY_SECTIONS.sms` trong `server.js` → `/api/library` →
  `renderSmsNavSection()` trong `js/brochure.js`.
- ☠️ **MỘT DÒNG PHẲNG, KHÔNG menu phụ** (giống Compare — chủ tool yêu cầu 10/08). Bấm
  một lần là mở HẾT ảnh, xếp dọc trong cùng khung cuộn. Đừng dựng lại thành nhóm xổ
  được: dropdown chứa một dòng là bắt bấm hai lần cho một việc (luật này đã ghi ở
  `renderCompareNavSection` từ 22/07).
- ☠️ **Xem bằng `showTallPreview()`, KHÔNG dùng khung ảnh brochure.** Ảnh tin nhắn rất cao
  (bản đầu 1080 × 7082). Khung brochure ghim `max-height: 60vh` → đo thật: bề ngang còn
  **66px**, thành sợi chỉ. Khung mới ghim **bề ngang ~480px** rồi cho cuộn dọc (đo được
  458px), nút Tải về nằm trong **thanh dính đỉnh**.
- Mục nào dùng khung dọc là do `renderFileTree` truyền cờ `{ dai: true }` **lúc render** —
  đừng đoán theo đường dẫn lúc mở.
- Khoá mục được như 4 mục kia, nhưng bảng `khoa_muc` phải có dòng `sms`:
  `insert into public.khoa_muc (muc) values ('sms') on conflict (muc) do nothing;`
  Thiếu dòng đó thì bấm khoá **không ăn mà cũng không báo lỗi** (UPDATE 0 dòng → 204).

## 2c-ter. PDF + CSV MINH HOẠ CỦA HÃNG trong màn Tính phí (11/08/2026)

Bấm là tải **đúng file của đúng tổ hợp**, không phải mở thư mục dò tay.

- **Bảng tra:** `public/data/pdf-file-iul.json` — **5.181 tổ hợp IUL**, khoá
  `KYHAN|GIOI|SUCKHOE|TUOI|MENHGIA` → `"pdfId,csvId"`. 505 KB nên **nạp riêng**, chỉ
  khi mở màn Tính phí. File nhỏ `pdf-minh-hoa.json` giữ việc khác: thư mục Drive dự
  phòng + 8 file lẻ + toàn bộ ghi chú cấm.
- **Chỉ IUL có.** Hãng **không phát hành** bản minh hoạ cho Term Life → màn Term Life
  không hiện nút nào. Đó là sự thật về dữ liệu, đừng "sửa" cho có nút.
- **Đúng 2 nút** (chủ tool chốt): *Tải PDF* · *Tải CSV*. Đừng thêm nút thứ ba mà chưa
  hỏi — đã bị cắt một lần.

☠️ **NẠP BỘ DỮ LIỆU MỚI (ví dụ 15 năm) PHẢI QUA ĐỦ 4 CỬA**, trượt một cửa là loại dòng:
1. đọc được kỳ hạn (15/20) · 2. tổ hợp có thật trong bảng phí ·
3. **phí ghi trong TÊN FILE khớp bảng phí đến 0,005** · 4. hai link hợp lệ và khác nhau.

Cửa số 3 là cửa quan trọng nhất — chính nó bắt được bản đầu (Gemini liệt kê) có
**~160 dòng file 15 năm bị trộn vào danh sách 20 năm** (tuổi đúng, mệnh giá đúng, chỉ
sai kỳ hạn nên không phép kiểm cấu trúc nào thấy) và **10 dòng gán tuổi = mệnh giá÷10.000**.

☠️ **Bắt bên liệt kê xuất kèm cột `Term` + `Fee`.** Thiếu hai cột đó thì không tách
được 15/20 năm và không tự kiểm được gì — bản v1 thiếu, phải bỏ cả bộ 1.927 dòng.

☠️ **KHÔNG dùng link tìm kiếm Drive** (`/drive/search?q=…`) để nhắm file. Đã đo: tổ hợp
20 năm ra đúng, **15 năm ra rỗng** với cùng cách viết; bỏ ngoặc kép thì trả về hàng chục
file sai tổ hợp. Lúc đúng lúc sai còn tệ hơn không có.

## 2d. ⚠️ AI ĐƯỢC XEM DỮ LIỆU KHÁCH HÀNG (nới 10/08/2026 — ĐẢO NGƯỢC quyết định 27/07)

Chủ tool chốt cho **11 Admin** xem tab Đo lường. Hệ quả đã được báo và chấp nhận:

| Nguồn | Ai đọc được | Chứa gì |
|---|---|---|
| `usage_events` | **Admin** + Super Admin | ai tải gì · cột `detail` = tên/tuổi/tiểu bang/số tiền khách sale đã điền |
| `proposal-snapshots` | **Admin** + Super Admin | **ảnh bản báo giá đã gửi khách** |
| `presence` | **Admin** + Super Admin | ai đang online |
| `khoa_muc` | ai cũng ĐỌC · Admin+ **SỬA** | trạng thái khoá (không có dữ liệu khách) |

27/07 chủ tool từng chốt ngược lại: *"ảnh chứa dữ liệu khách hàng thật — CHỈ Super Admin
đọc"*. **Đừng tự siết lại** khi thấy mâu thuẫn — đây là thay đổi có chủ ý.
→ Siết lại (nếu chủ tool đổi ý): đổi `is_admin()` về `is_super_admin()` trong
  `supabase/quyen.sql`, rồi chạy lại file đó.

## 2e. HAI FILE SQL — dùng cái nào

| File | Khi nào |
|---|---|
| `supabase/schema.sql` (436 dòng) | Dựng lại **từ đầu**: bảng, trigger, bucket |
| `supabase/quyen.sql` (145 dòng) | **Chỉ chỉnh quyền** — thứ hay phải đụng nhất |

Tách ra vì Supabase SQL Editor chạy **cả file trong MỘT giao dịch**: lỗi một chỗ là huỷ
sạch phần sau (đã dính 27/07 — mất luôn cột `anh` và bucket ảnh dù không liên quan).
Cả hai đều **chạy lại an toàn**.

## 2f. ☠️ CACHE + REGION — đúc 11/08/2026, ba thứ dễ làm hỏng lặng lẽ

**① FILE TĨNH CÓ `?v=` ĐƯỢC CACHE **1 NĂM** (`immutable`).**
Sửa file mà **quên bump `?v=` = 77 sale ôm code cũ cả năm**, và **không có dấu hiệu gì**
(máy mình luôn đúng vì tải mới lần đầu). Bắt buộc chạy **trước mỗi lần push**:

```
node scripts/kiem-cache-version.js          # soi
node scripts/kiem-cache-version.js --ghi    # chot lai sau khi da bump dung
```

Nó băm nội dung từng file có `?v=` rồi đối chiếu `scripts/cache-version.json`. Vừa lắp
đã bắt được **2 lỗi có sẵn** (`auth.js` ghi `?v=10` ở 2 trang / `?v=11` ở 3 trang;
`portal.css` ghi `?v=76` ở 3 trang / `?v=80` ở `members.html`).

☠️ **ĐỪNG GẮN `?v=` CHO `public/data/*.json` HAY `public/templates/*`.** Luật cache bám
theo `?v=`, nên **chính việc chúng KHÔNG có `?v=`** là thứ giữ cho bảng phí luôn được
tải mới. Gắn vào là chủ tool thay bảng phí mà sale vẫn báo **giá cũ cho khách** suốt
một năm. Mọi `.html` cũng vậy — nó là chỗ chứa các con số `?v=`.

**② LUẬT CACHE CHO BẢN LIVE NẰM Ở `vercel.json`, KHÔNG PHẢI `server.js`.**
Vercel phục vụ `public/` **thẳng từ CDN biên**, request không bao giờ tới hàm Node →
`express.static` **chỉ chạy khi `node server.js` ở máy**. Tôi đã sửa `server.js`, push,
đo lại: header **không đổi một chút nào**. Dấu hiệu nhận ra nằm ở `X-Vercel-Id`:

```
/js/core.js?v=47  ->  sin1::s4htd-…          MOT chang  = CDN tra thang
/api/library      ->  sin1::sin1::bm7zq-…    HAI chang  = bien -> ham
```

→ **Sửa cache là phải sửa CẢ HAI chỗ**, không thì máy mình và bản live cư xử khác nhau.

**③ HÀM MÁY CHỦ CHẠY Ở `sin1` (Singapore) — vì SALE Ở VIỆT NAM.**
Chủ tool xác nhận 11/08/2026. Trước đó hàm chạy ở `iad1` (Washington DC) trong khi cạnh
nhận request ở `sin1` → mỗi lời gọi API tốn trọn một vòng xuyên Thái Bình Dương.
Đo được: `/api/svgs` **281 → 63 ms**, `/api/library` **273 → 63 ms**.
**Đừng đổi lại `iad1`** trừ khi đội ngũ chuyển sang Mỹ.
→ Supabase nằm ở **Singapore** (`CF-RAY: …-SIN`, truy vấn thật 136 ms) — **không phải
vấn đề**, đừng đi migrate project Supabase.

## 2g. ☠️ PUSH LÀ PHẢI BUMP SỐ PHIÊN BẢN — chủ tool chốt 18/08/2026

Nguyên văn: *"mỗi lần anh bảo e update lên git là mỗi lần update verson mà"*.

**Số phiên bản nằm ở 3 trang, phải sửa HẾT:**

| File | Dòng | Nội dung |
|---|---|---|
| `public/index.html` | ~140 | `<span class="version-badge">v1.45</span>` + `<span>18/08/2026 · Thinksmart…` |
| `public/members.html` | ~528 | như trên |
| `public/tool.html` | ~167 | `version-badge` + `<span class="version-date">18/08/2026</span>` |

☠️ **Ngày phải GIỐNG NHAU ở cả 3.** Vấp 18/08/2026: index và members ghi `11/08`,
tool ghi `12/08` — lệch từ lâu mà không ai để ý, vì mỗi trang sửa một lần khác nhau.

- Sửa nhỏ / sửa lỗi → tăng số cuối (v1.44 → v1.45). Đổi lớn → **hỏi chủ tool**.
- Lấy ngày bằng lệnh `date`, không suy từ mục changelog trước đó (luật 5q).
- Ghi số phiên bản mới vào changelog để phiên sau dò được.

**Vì sao quan trọng:** chủ tool và 77 sale dùng số này để đối chiếu đang chạy bản nào.
Đẩy code mới mà để số cũ thì họ báo lỗi của bản cũ, còn mình đi tìm trong bản mới.

☠️ **BẢN LIVE THẬT LÀ `tool.thinksmartinsurance.com`** (tên miền riêng), không phải
`thinksmarttool-gy6f.vercel.app` — chủ tool dùng tên miền đó. Hai đường cùng trỏ về
một deploy, nhưng khi đo/kiểm nên dùng đúng tên miền chủ tool đang mở.

## 2h. ☠️☠️ CHỖ HAY LỖI MỖI LẦN PUSH — chủ tool yêu cầu ghi lại 18/08/2026

> Nguyên văn: *"đây là các phần hay lỗi khi push code lên, em phải ghi nhớ lại các
> điểm này để tự chỉnh sửa cho các lần sau"*.

### A. Chạy cửa chặn TỰ ĐỘNG trước mỗi lần push

```
node scripts/kiem-truoc-push.js      # 7 nhóm kiểm, thoát khác 0 là DỪNG
node scripts/kiem-cache-version.js   # bump ?v= — cửa riêng, vẫn phải chạy
```

`kiem-truoc-push.js` bắt 7 thứ **đã tái diễn thật**:

| # | Kiểm | Đã vấp khi nào |
|---|---|---|
| 1 | Dữ liệu khách hàng THẬT còn sót trong mẫu | 18/08 — 4 mẫu nhúng sẵn 3 tên khách + tên/SĐT đại lý |
| 2 | Logo Thinksmart có đủ 5 mẫu | 18/08 — 4 mẫu thiếu vì ảnh **liên kết bị đứt** trong `.ai` |
| 3 | Chữ cấm (`iNDEXED`, `INDEXD`) | 18/08 — sửa lỗi này lại đẻ ra lỗi khác |
| 4 | `public/templates` khớp `2-Templates` | luật cũ, hay quên một bên |
| 5 | File tạm (`__*`, `.bak`) còn sót | 18/08 — suýt commit file đo tạm |
| 6 | Số phiên bản + NGÀY khớp ở 3 trang | 18/08 — ngày lệch 11/08 vs 12/08 từ lâu |
| 7 | `templates/` `data/` bị gắn `?v=` | luật 2f-① — gắn vào là sale ôm bảng phí cũ cả năm |

☠️ **Đã đối chứng 18/08**: cố tình bỏ file tạm / làm lệch phiên bản / nhét lại tên
khách thật → cả 3 đều báo đỏ và thoát `1`; khôi phục → thoát `0`. **Phép kiểm chưa
bao giờ thấy đỏ thì chưa chứng minh được nó biết đỏ là gì.**

### B. Ba thứ script KHÔNG kiểm được — phải ĐO TAY trên DOM

Chúng là **hình học**, chỉ hiện ra khi render. Nạp mẫu vào DOM rồi đo:

1. **Ô nhập có còn nhận diện được không.** `tagClientInfoElements` (proposal.js) dò
   5 ô khách hàng **theo nội dung**: tuổi ghim cứng `=== '43'` · bang phải nằm trong
   `US_STATES` · tên phải khớp regex **không dấu** và không chứa `Khách|Client|State…`
   → **Đổi giá trị trong mẫu là ô biến mất, không báo lỗi gì.**
   *Kiểm:* chạy `tagClientInfoElements` rồi đếm 5 id `client-*`. Phải đủ **5/5**.
2. **Neo trái hay canh giữa.** `laCanGiuaTheoBanVe` **đo hình học** (lề trái/phải
   trong thẻ nền). Thay chữ mà giữ nguyên toạ độ góc trái là nó chấm sai → sale gõ
   số dài thì chữ **tràn khỏi thẻ**.
   *Kiểm:* chạy `laCanGiuaTheoBanVe` cho mọi ô giá trị, so với ý đồ bản vẽ.
   Muốn ép một ô neo trái: **đánh dấu `data-neo="trai"` trên thẻ `<text>`** trong SVG
   — ĐỪNG nới hàm dò (thử 18/08: nới ra làm **65/404 ô** đổi phân loại).
3. **Tiêu đề có chồng chữ / lệch không.** Illustrator cắt mỗi dòng thành nhiều cụm
   với `x` ghim cứng; máy thiếu nét SF Pro Bold là chữ nở ~7% và đè nhau.
   *Kiểm:* mỗi cụm phải KHÔNG rộng hơn khe `x` kế tiếp.

### C. Ba chỗ trong file thiết kế hay sai — báo chủ tool, ĐỪNG tự sửa

- **Ảnh liên kết đứt** trong `.ai` → xuất SVG ra là mất ảnh, không cảnh báo trên SVG.
  Hiện Allianz còn **1** cái. Sửa: Window → Links → relink/embed.
- **Huy hiệu mục lệch nhau.** Đo 18/08 trên Allianz: ô I/II rộng 29,75–29,83 còn ô
  III chỉ **28,62**; tiêu đề mục III thụt trái **2,3** so với I và II. Số La Mã thì
  nằm đúng tâm (lệch ≤0,47) — **lỗi ở Ô, không phải ở CHỮ**.
- **Số La Mã có thể là `<text>` HOẶC `<path>`** (luật 2b-④). Allianz để chữ sống,
  AIG/NLG đã create outlines. Đừng grep `<text>` rồi kết luận "mất chữ".

## 3. Chạy thử ở máy

```bash
PORT=8000 node server.js
```

Trong ngày **chỉ làm ở máy**, KHÔNG push từng thay đổi. Cuối ngày mới một lần
commit + push (Vercel deploy lúc đó). Chi tiết ở `references/conventions.md`.

## 4. Ngăn nhớ riêng của dự án

☠️ **SỬA 11/08/2026 — mục này trước đây ghi SAI đường dẫn.** Dự án đã dời từ
`E:\2026\Thinksmart\Sale\Proposal2026` sang `E:\2026\Production\Thinksmart Tool`,
nên ngăn nhớ tự động **theo đường dẫn hiện tại** là:

```
~/.claude/projects/E--2026-Production-Thinksmart-Tool/memory/
```

Ba ghi chú cũ vẫn nằm ở slug cũ `E--2026-Thinksmart-Sale-Proposal2026` — **mở ở đường
dẫn mới thì KHÔNG đọc được chúng**. Đó chính là lý do thứ gì quan trọng phải viết vào
**file này** (đi theo mã nguồn) chứ không để trong ngăn nhớ tự động.

Có gì mâu thuẫn thì **skill thắng**, và sửa lại ghi chú cho khớp.

> Bối cảnh con người (anh Tiến là ai, cách làm việc, góc nhìn sản phẩm) nằm ở
> `~/.claude/CLAUDE.md` — tự nạp ở mọi dự án, không lặp lại ở đây.
