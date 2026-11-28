"""Chuyển kết quả VideoSubFinder (ảnh phụ đề) + RapidVideOCR (srt) thành ocr.json + ảnh crop cho ocr-to-lesson.mjs.

Dùng: python vsf-to-ocr.py <thư-mục-vsf> <file.srt> <thư-mục-ra ocr_<id>>
- VideoSubFinder lưu mỗi lần phụ đề xuất hiện/đổi thành một ảnh RGBImages/<giờ bắt đầu>__<giờ kết thúc>_....jpeg,
  và TXTImages/ (ảnh chữ đã tách nền) khi khung đó THẬT SỰ có chữ.
- Giữ dòng khi OCR đọc được chữ Hán HOẶC VideoSubFinder xác nhận có chữ (TXTImages) – để người đọc ảnh không bỏ sót câu
  nào kể cả khi OCR đọc trượt.
"""
import json
import os
import re
import shutil
import sys

sys.stdout.reconfigure(encoding="utf-8")
vsf, srt, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)


def secs(t):  # "0_01_41_000" hoặc "00:01:41,000"
    h, m, s, ms = map(int, re.split(r"[_:,.]", t))
    return h * 3600 + m * 60 + s + ms / 1000


rgb = sorted(os.listdir(os.path.join(vsf, "RGBImages")))
txt_keys = {f.split("__")[0] for f in os.listdir(os.path.join(vsf, "TXTImages"))}
blocks = open(srt, encoding="utf-8").read().strip().split("\n\n")
ocr_by_start = {}
for b in blocks:
    lines = b.split("\n")
    if len(lines) < 2 or "-->" not in lines[1]:
        continue
    a = lines[1].split("-->")[0].strip()
    ocr_by_start[round(secs(a), 2)] = " ".join(lines[2:]).strip()

cues = []
for f in rgb:
    m = re.match(r"(\d+_\d+_\d+_\d+)__(\d+_\d+_\d+_\d+)_", f)
    if not m:
        continue
    start, end = secs(m.group(1)), secs(m.group(2))
    text = ocr_by_start.get(round(start, 2), "")
    has_han = bool(re.search(r"[一-鿿]", text))
    has_txt = m.group(1) in txt_keys
    if not (has_han or has_txt):
        continue
    shutil.copy(os.path.join(vsf, "RGBImages", f), os.path.join(out, f"crop_{start:.1f}.png"))
    cues.append({"start": round(start, 2), "end": round(end + 0.04, 2), "text": text, "conf": 0.9 if has_han else 0.0, "keep": True})

json.dump(cues, open(os.path.join(out, "ocr.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"{len(cues)} dòng (từ {len(rgb)} ảnh VideoSubFinder)")
