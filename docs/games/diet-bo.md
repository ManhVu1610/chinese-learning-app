# Diệt bọ

Chủ đề riêng: **Vườn rau**. Luống đất nâu, mỗi lượt một con bọ (sâu, bọ rùa, cánh cứng, kiến) mang nghĩa tiếng Việt bò xuống ba cây cải ở đáy vườn. Luật theo ảnh mẫu 10: *chọn nhanh đáp án đúng trước khi nó lao xuống*. Đường dẫn: `/games/bugs`.

## Cách chơi

1. Vào **Trò chơi → Diệt bọ**, chọn nguồn từ, **tốc độ** (Chậm / Vừa / Nhanh) và **số con bọ** (10, 20 hoặc 30).
2. Mỗi lượt một con bọ mang **nghĩa tiếng Việt** bò từ mép trên xuống luống cải.
3. Bên dưới có **4 nút**, mỗi nút một chữ Hán kèm pinyin. Chọn chữ đúng nghĩa bằng cách bấm nút hoặc **phím 1–4**.
   - Đúng: bọ nổ 💥, app đọc từ. Điểm = 10 + thưởng chuỗi (2 điểm mỗi bậc, tối đa +10) + thưởng diệt sớm (tới +5 nếu bọ vừa xuất hiện).
   - Sai: nút đó chuyển hồng và khoá lại, **mất 1 cây cải**, chuỗi về 0; bọ vẫn tiếp tục bò, vẫn chọn lại được.
4. Bọ bò tới luống rau: gặm **1 cây cải** (1 mạng) và hiện đáp án. Có **3 cây cải**.
5. Mỗi lượt sau bọ bò nhanh hơn. Thanh trên cùng có tiến độ, điểm, chuỗi, mạng, nút **1× / 1.5×** và **tạm dừng** (hoặc phím **P**).
6. Hết bọ hoặc hết cải thì kết thúc: điểm, số bọ diệt được, chuỗi dài nhất, danh sách từ (từ sai lên đầu, tô đỏ).

## Logic

- **Nguồn từ**: các từ có nghĩa tiếng Việt trong nguồn đã chọn, trộn ngẫu nhiên, lấy đủ số con bọ.
- **Đáp án gây nhiễu** (`makeOptions`): 3 từ khác trong nguồn, khác chữ và khác nghĩa với đáp án; **ưu tiên từ cùng số chữ** để không đoán được bằng độ dài; vị trí đáp án đúng trộn ngẫu nhiên.
- **Tốc độ bò**: thời gian bò hết vườn 12 / 9 / 6,5 giây ở lượt đầu, mỗi lượt nhân 0,97 nhưng không nhanh quá gấp đôi. Thời gian được cộng dồn theo khung hình (`requestAnimationFrame`), nên tạm dừng là bọ đứng yên thật; nút 1.5× làm thời gian trôi nhanh hơn.
- **Mạng** được giữ thêm trong `useRef` để vòng khung hình và nút bấm luôn đọc đúng số mạng mới nhất (tránh trừ mạng hai lần khi chọn sai đúng lúc bọ chạm rau).
- Sau mỗi lượt chờ 1,2 giây (hiện chữ Hán + pinyin của đáp án) rồi sang lượt mới.

## Cài đặt được lưu (localStorage)

`game_bugs_speed`, `game_bugs_count`, cùng `practice_source` dùng chung.

## Quy trình tạo

1. Ảnh mẫu 9 chỉ dùng để lấy luật (một vật mang nghĩa rơi xuống, 4 đáp án chữ Hán + pinyin có số 1–4, tim, tốc độ, tạm dừng). Giao diện làm lại theo chủ đề Vườn rau bằng CSS và emoji; mạng sống là ba cây cải thay vì trái tim trên thành phố.
2. Kiểm tra trong Chrome không giao diện: chọn đúng bằng phím 1–4, một lần chọn sai, chơi hết 10 con bọ tới màn kết thúc.
