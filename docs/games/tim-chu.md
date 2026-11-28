# Tìm chữ (字中找字)

Tìm những chữ nhỏ ẩn bên trong một chữ lớn bằng cách chọn đúng các nét của nó. Ví dụ trong 减 có 冫, 口, 戈, 咸. Đường dẫn: `/games/word-search`.

## Cách chơi

1. Vào **Trò chơi → Tìm chữ**, chọn nguồn từ (cấp HSK và/hoặc bộ trong Sổ tay), mức độ **Tìm 3 chữ / Tìm 5 chữ / Tìm 7 chữ** và **số chữ lớn mỗi ván** (3, 5 hoặc 10).
2. Mỗi lượt hiện một chữ lớn, nét mờ trong ô 田. Phía trên ghi chữ đó lấy từ từ nào (chữ Hán · pinyin · nghĩa).
3. **Chạm các nét** để chọn (nét chọn chuyển đỏ, chạm lại để bỏ), rồi bấm **Kiểm tra**.
   - Các nét ghép đúng thành một chữ ẩn: chữ đó vào ô trống, kèm pinyin và âm Hán Việt, app đọc chữ. Nếu chữ đó không nằm trong danh sách gợi ý của lượt thì báo **"Chữ ngoài gợi ý!"** nhưng vẫn được tính.
   - Sai: báo chưa ghép thành chữ nào, tính một lần sai. Chữ đã tìm rồi thì báo đã có.
4. **Xoá chọn** bỏ hết nét đang chọn. **Gợi ý**: lần 1 cho biết pinyin và nghĩa của một chữ ẩn chưa tìm; bấm lần nữa thì các nét của chữ đó được tô vàng.
5. Tìm đủ 3 / 5 / 7 chữ (theo mức) là xong chữ lớn đó. Hoặc bấm **Bỏ chữ này** để dừng sớm. Cả hai trường hợp đều hiện **tất cả chữ ẩn** trong chữ lớn (rê/chạm vào từng chữ để xem nét của nó), rồi bấm **Chữ tiếp theo**.
6. Hết số chữ lớn thì hiện màn kết thúc: thời gian, tổng số chữ ẩn tìm được, số lần sai, số gợi ý.

## Logic

### Dữ liệu dựng sẵn (`scripts/build-find-char.mjs` → `public/games/find-char.json`)

Chạy `npm run find-char` (đọc dữ liệu của Learn ở chế độ chỉ đọc). Với mỗi chữ Hán xuất hiện trong từ vựng HSK 1–6:

1. **Nét chữ** lấy từ `hanzi_strokes.db` của Learn (dữ liệu Make Me a Hanzi): mỗi nét có đường viền và **đường giữa nét** (median).
2. **Theo cây phân tách** (`cjk_decomposition.json`, vd 减 = 冫 + 咸, 咸 = 戊 + 𠮛…): một chữ ghép A + B thường viết A trước rồi B, nên A chiếm các nét đầu, B các nét sau. Script chia nét theo số nét của A và B rồi **kiểm tra hình**; nếu không khớp (chữ có khung bao như 国 = 囗 + 玉, nét đóng khung viết sau cùng) thì tìm A theo hình trong phạm vi nét đó. Làm đệ quy xuống các tầng dưới.
3. **Tìm theo hình** cho các thành phần còn lại và cho một danh sách chữ đơn giản hay gặp (口 日 目 田 十 土 王 木 人 大 小 山 工 力 又 寸 干…), để nhận cả những chữ "nhìn thấy được" dù không nằm trong cây phân tách: thử các nhóm nét theo thứ tự tăng dần, nét của chữ nhỏ chỉ ghép với nét cùng hướng, chấm điểm hình và giữ nhóm khớp nhất nếu đủ tốt.
4. Chỉ giữ chữ ẩn **có từ 2 nét** và **đứng riêng được** (có trong từ vựng hoặc là bộ thủ chính trong bảng 214 bộ), để luôn có pinyin, Hán Việt và nghĩa. Chữ lớn cần **ít nhất 3 chữ ẩn** mới được đưa vào trò chơi.
5. Kết quả hiện tại: 1.704 chữ có ≥ 3 chữ ẩn (840 chữ ≥ 5, 344 chữ ≥ 7), dùng 296 chữ ẩn khác nhau. HSK 1 có 80 / 27 / 11 chữ đủ cho mức 3 / 5 / 7.

**Cách chấm hình**: mỗi đường giữa nét được lấy lại 8 điểm cách đều; cả nhóm nét được đưa về khung vuông đơn vị, **co giãn riêng từng trục** (vì thành phần trong chữ ghép thường bị ép dẹt, vd 女 trong 好); điểm = khoảng cách trung bình giữa các điểm tương ứng. Nhỏ hơn khoảng 0,13–0,16 là cùng hình.

### Trong trò chơi (`src/games/FindChar.tsx`, `src/games/findCharData.ts`)

- **Chọn chữ lớn**: mọi chữ trong các từ của nguồn đã chọn có đủ số chữ ẩn của mức (không trùng chữ), trộn ngẫu nhiên, lấy đủ số chữ lớn mỗi ván. Nguồn không có chữ nào đủ thì báo để chọn thêm từ hoặc giảm mức.
- **Gợi ý của lượt**: chọn ngẫu nhiên đúng bằng số ô trong các chữ ẩn của chữ lớn. Chữ ẩn ngoài danh sách này vẫn được tính, nên một lượt thường có nhiều cách hoàn thành.
- **Kiểm tra một lựa chọn**: đúng khi các nét chọn **trùng khớp** nhóm nét đã lưu của một chữ ẩn, **hoặc** cùng số nét và **cùng hình** với một chữ ẩn (chấm hình ngay trên trình duyệt với nét của chữ ẩn, ngưỡng 0,16). Nhờ vậy cách chọn khác mà vẫn đúng hình cũng được nhận, vd 口 ở phần trên hay phần dưới của 目 trong 想.
- Vùng bấm của mỗi nét là đường giữa nét được vẽ dày (70/1024), nên chạm dễ cả trên điện thoại.

## Cài đặt được lưu (localStorage)

`game_fc_level` (3 / 5 / 7), `game_fc_rounds`, cùng `practice_source` dùng chung với các trang luyện tập.

## Quy trình tạo

1. Ảnh mẫu (ảnh 1–3) cho luật: một chữ lớn mờ trong ô 田, chọn nét thành chữ ẩn, các ô "?", Kiểm tra, Xoá chọn, Trợ giúp, Kết thúc màn, đồng hồ, "x/3 đã tìm được", và việc chữ ngoài gợi ý vẫn được tính.
2. Vì dữ liệu nét không có sẵn thông tin "nét nào thuộc thành phần nào", viết script dựng dữ liệu kết hợp cây phân tách và so hình, chỉnh ngưỡng bằng cách kiểm tra tay trên các chữ 减, 想, 好, 明, 国, 谢, 踢.
3. Giao diện vẽ chữ bằng SVG từ chính dữ liệu nét của app (`public/strokes`), dùng lại khung chung của mục Trò chơi (chọn nguồn từ, thanh chỉ số, màn kết thúc).
4. Kiểm tra trong Chrome không giao diện: chơi trọn 3 chữ lớn (对, 起, 是) với 1 lần chọn sai, tới màn kết thúc.
