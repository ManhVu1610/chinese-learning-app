"""Ghép ảnh dải phụ đề của các dòng thành "trang soát" (mỗi trang 8 dòng, có số thứ tự bên trái) để đọc nhanh, ít lần mở ảnh.

Dùng: python make-sheets.py <videoId>
Đọc .cache/shadowing/<id>.fuse.txt (cột 5 = đường dẫn ảnh crop), ghi .cache/shadowing/ocr_<id>/sheets/sheet_<n>.png
và in danh sách trang: "sheet_<n>.png: <các số dòng>".
"""
import os
import sys

import cv2
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
vid = sys.argv[1]
base = os.path.join(os.path.dirname(__file__), "..", "..", ".cache", "shadowing")
rows = []
for line in open(os.path.join(base, f"{vid}.fuse.txt"), encoding="utf-8"):
    parts = line.rstrip("\n").split("\t")
    if len(parts) >= 5 and parts[4].strip():
        rows.append((int(parts[0]), parts[4].split(" ")[0]))

out = os.path.join(base, f"ocr_{vid}", "sheets")
os.makedirs(out, exist_ok=True)
PER = 8
W = 900  # bề rộng mỗi dòng ảnh (thu nhỏ cho đủ đọc chữ, đỡ tốn token)
LABEL = 70
for s in range(0, len(rows), PER):
    chunk = rows[s : s + PER]
    strips = []
    for idx, path in chunk:
        img = cv2.imread(path)
        if img is None:
            img = np.full((60, W, 3), 255, np.uint8)
        h = int(img.shape[0] * W / img.shape[1])
        img = cv2.resize(img, (W, h))
        label = np.full((h, LABEL, 3), 255, np.uint8)
        cv2.putText(label, f"#{idx}", (4, h // 2 + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 200), 2)
        strips.append(np.hstack([label, img]))
        strips.append(np.full((4, W + LABEL, 3), 0, np.uint8))  # vạch ngăn
    sheet = np.vstack(strips)
    name = f"sheet_{s // PER:03d}.png"
    cv2.imwrite(os.path.join(out, name), sheet)
    print(f"{os.path.join(out, name).replace(os.sep, '/')}: {' '.join(str(i) for i, _ in chunk)}")
