# Bắn từ

Chủ đề riêng: **Hội đèn lồng**. Trời đêm hội tím sẫm, đèn lồng đỏ bay lên, người chơi cầm cung ở dưới. Luật theo ảnh mẫu 6: *nhìn nghĩa, nhớ ra từ và gõ pinyin*, luyện nhớ chủ động. Đường dẫn: `/games/shooter`.

## Cách chơi

1. Vào **Trò chơi → Bắn từ**, chọn nguồn từ, **tốc độ** (Chậm / Vừa / Nhanh) và **số từ** (16, 24 hoặc 40).
2. Đèn lồng lần lượt bay lên từ dưới đáy. Mỗi đèn mang **nghĩa tiếng Việt** của một từ, kèm **chữ cái đầu của pinyin** và các **dấu gạch** cho số chữ cái còn lại (vd `s__` là suì, `w_____` là wǎnfàn).
3. Nhớ ra từ rồi **gõ đủ pinyin** vào ô bên dưới. Không cần thanh điệu và dấu cách: `wanfan`, `wan3fan4`, `wǎn fàn` đều được. Trong lúc gõ, các đèn có pinyin bắt đầu bằng phần đã gõ sẽ lộ dần chữ cái.
4. Gõ khớp là **bắn ngay** (không cần Enter): mũi tên bay lên, đèn nổ và hiện chữ Hán, app đọc từ, +10 điểm, bắn đúng liên tiếp được thưởng thêm 2 điểm mỗi bậc chuỗi (tối đa +10). Enter khi chưa khớp: ô nhập rung, xoá ô và mất chuỗi.
5. Đèn bay khỏi mép trên: **mất 1 mạng**. Có **4 mạng**.
6. Cứ **8 từ là một mốc**; qua mỗi mốc đèn bay nhanh hơn và ra dày hơn 8%. Thanh trên cùng có mốc hiện tại, điểm, chuỗi, mạng, nút **1× / 1.5×** và **tạm dừng**.
7. Hết từ hoặc hết mạng thì kết thúc: điểm, số đèn bắn trúng, chuỗi dài nhất, danh sách từ (từ để lọt lên đầu, tô đỏ).

## Logic

- **Nguồn từ**: các từ có nghĩa tiếng Việt trong nguồn đã chọn, trộn ngẫu nhiên, lấy đủ số từ.
- **Pinyin dạng so sánh** (`pinyinKey`): đổi số thanh thành dấu bằng bộ gõ `convertPinyinInput`, bỏ dấu thanh (`stripTones`, ü → u), bỏ mọi ký tự không phải chữ cái. Pinyin của từ và chữ người chơi gõ đều đưa về dạng này rồi so bằng nhau. Gợi ý trên đèn cũng dùng dạng này (nên số dấu gạch = số chữ cái không dấu).
- **Thả đèn**: đèn đầu sau 0,5 giây; sau đó cách nhau 4,2 / 3,4 / 2,6 giây (Chậm / Vừa / Nhanh); trên trời tối đa 5 đèn. Vị trí ngang ngẫu nhiên, tránh trùng cột với đèn vừa thả.
- **Bay**: thời gian bay hết màn 19 / 15 / 11 giây ở mốc đầu, mỗi mốc nhân 0,92. Thời gian của từng đèn được **cộng dồn theo khung hình** (`requestAnimationFrame`), nên tạm dừng là đèn đứng yên thật, và nút 1.5× chỉ làm thời gian trôi nhanh hơn.
- **Nhiều đèn cùng khớp** (vd hai từ cùng pinyin khi bỏ thanh): bắn đèn bay cao nhất (sắp mất nhất).
- Trạng thái trận (đèn, mạng, điểm) để trong `useRef`, vòng khung hình vẽ lại mỗi lần, để thả đèn, đèn bay mất và hiệu ứng luôn đồng bộ.

## Cài đặt được lưu (localStorage)

`game_shoot_speed`, `game_shoot_words`, cùng `practice_source` dùng chung.

## Quy trình tạo

1. Ảnh mẫu 4–5 chỉ dùng để lấy luật (nghĩa rơi kèm chữ cái đầu pinyin + ô trống, gõ pinyin để bắn, tim, mốc, tốc độ, tạm dừng). Giao diện làm lại theo chủ đề riêng: thay vì chữ rơi trong mưa, đèn lồng **bay lên** trời đêm hội và người chơi bắn tên.
2. Đèn lồng, trời sao và mái nhà vẽ hoàn toàn bằng CSS; cây cung là emoji. Không dùng hình của ứng dụng khác.
3. Kiểm tra trong Chrome không giao diện: gõ pinyin đúng cho nhiều đèn liên tiếp (điểm và chuỗi tăng), để một số đèn bay mất cho tới khi hết mạng, xem màn kết thúc.
