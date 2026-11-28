# Nối thẻ

Chủ đề riêng: **Ao sen**. Mặt ao xanh, mỗi thẻ là một lá sen; nối đúng thì cặp lá nở thành hoa sen và biến mất. Luật theo ảnh mẫu 8: *chạm vào từ và nghĩa để dọn sạch bảng trước khi hết giờ*. Đường dẫn: `/games/match`.

## Cách chơi

1. Vào **Trò chơi → Nối thẻ**, chọn nguồn từ, rồi chọn:
   - **Nối chữ Hán với**: Nghĩa hoặc Pinyin.
   - **Kiểu chơi**: **Mở lá** (mọi lá lật sẵn) hoặc **Úp lá** (lá úp, mỗi lần lật hai lá, luyện trí nhớ).
   - **Số cặp mỗi ván**: 6, 8 hoặc 10.
   - **Số ván**: 1, 3 hoặc 5 (dọn xong một ao thì sang ao mới với từ mới).
   - **Thời gian mỗi cặp**: Thong thả 10 giây, Vừa 7 giây, Gấp 4,5 giây.
2. Lá chữ Hán có **pinyin nhỏ bên dưới** (khi nối với nghĩa). Chạm một lá rồi chạm lá cặp với nó. Chạm lá chữ Hán thì app đọc từ đó.
3. **Đúng**: hai lá nở hoa 🪷 rồi biến mất. **Sai**: hai lá rung, đổi màu hồng và tính một lần sai (ở kiểu Úp lá, hai lá úp lại sau 0,9 giây).
4. Ở kiểu Mở lá, chạm hai lá cùng loại (hai chữ Hán, hoặc hai nghĩa) chỉ là **đổi lựa chọn**, không tính sai.
5. Mỗi ao có **thanh thời gian đếm ngược** (chuyển đỏ khi còn dưới 1/4). **Hết giờ mà chưa dọn xong ao là thua** ("Hết giờ rồi").
6. Dọn sạch mọi ao là thắng. Màn kết thúc cho tổng thời gian, số cặp đã nối, số lần sai và danh sách từ (từ từng nối sai lên đầu).

## Logic

- **Chọn từ cho một ao** (`pickWords`): ưu tiên từ **chưa xuất hiện** ở các ao trước trong cùng ván. Trên một ao không có hai từ trùng chữ Hán, và không có hai từ trùng nghĩa (hoặc trùng pinyin khi nối pinyin), để mỗi lá chỉ có đúng một lá cặp.
- **Tạo lá** (`makeBoard`): mỗi từ sinh hai lá (`han` và `other`), trộn ngẫu nhiên.
- **Xét cặp**: hai lá là một cặp khi cùng từ và khác loại. Trong lúc chờ hiệu ứng, bàn khoá lại (`busy`) để không chạm thêm được.
- **Thời gian**: khi chia một ao, hạn chót = bây giờ + số cặp × số giây mỗi cặp. Một bộ đếm 100 ms cập nhật thanh thời gian và kết thúc ván (thua) khi qua hạn chót. Ao mới được thời gian mới.
- **Hết ao**: khi mọi lá đã nở, chờ 0,6 giây rồi sang ao tiếp theo hoặc màn kết thúc.
- Lá sen là một hình tròn có khe hình nêm (CSS `clip-path`), mỗi lá xoay một góc khác nhau cho tự nhiên. Lá chữ Hán xanh đậm hơn lá nghĩa một chút để dễ phân biệt; lá úp có chú ếch.

## Cài đặt được lưu (localStorage)

`game_match_pair`, `game_match_mode`, `game_match_pairs`, `game_match_boards`, `game_match_pace`, cùng `practice_source` dùng chung.

## Quy trình tạo

1. Ảnh mẫu 7 chỉ dùng để lấy luật (lưới thẻ chữ Hán kèm pinyin và thẻ nghĩa, chạm hai thẻ cùng từ để dọn, thanh thời gian). Giao diện làm mới theo chủ đề Ao sen, vẽ bằng CSS và emoji, không dùng hình của ứng dụng khác.
2. Thêm kiểu Úp lá để có thêm một mức khó dựa trên trí nhớ.
3. Kiểm tra trong Chrome không giao diện: nối hết 2 ao liên tiếp tới màn kết thúc; để hết giờ ở mức Gấp (thua đúng lúc); xem bố cục 10 cặp trên màn hình điện thoại.
