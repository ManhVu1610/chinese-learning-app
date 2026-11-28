"""Đọc phụ đề in sẵn trên video (hardsub) bằng RapidOCR (mô hình PaddleOCR, chạy offline).

Dùng: python ocr-subs.py <video> <thư-mục-ra> [--y0 0.82 --y1 0.98 --fps 5]
Ghi <thư-mục-ra>/ocr.json: [{"start","end","text","conf","est","flag"}] và ảnh crop của câu bị đánh dấu
(<thư-mục-ra>/crop_<i>.png) để soát bằng mắt.

Cách làm:
  1. Chỉ lấy dải phụ đề ở đáy khung hình.
  2. Tách chữ trắng (điểm sáng, ít màu) thành ảnh đen-trên-trắng → OCR đọc chính xác hơn nhiều so với ảnh gốc.
  3. Chỉ chạy OCR khi phụ đề đổi (so mặt nạ chữ với lần đọc trước) → mỗi câu đọc ~1 lần.
  4. Đọc 2 kiểu tách chữ, giữ kết quả tin cậy hơn.
  5. Ước số chữ theo bề rộng dòng chữ / chiều cao chữ; lệch với số chữ OCR đọc được hoặc độ tin cậy thấp → đánh dấu để soát.
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR

sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("out")
ap.add_argument("--y0", type=float, default=0.82)
ap.add_argument("--y1", type=float, default=0.98)
ap.add_argument("--fps", type=float, default=5)
ap.add_argument("--limit", type=float, default=0, help="chỉ xử lý N giây đầu (để thử)")
args = ap.parse_args()
os.makedirs(args.out, exist_ok=True)

ocr = RapidOCR()
cap = cv2.VideoCapture(args.video)
vfps = cap.get(cv2.CAP_PROP_FPS) or 25
step = max(1, round(vfps / args.fps))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
y0, y1 = int(h * args.y0), int(h * args.y1)
x0, x1 = int(w * 0.08), int(w * 0.92)
HAN = lambda s: sum(1 for ch in s if "一" <= ch <= "鿿")


def mask_of(crop, v=200, s=60, dilate=False):
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    m = ((hsv[:, :, 2] > v) & (hsv[:, :, 1] < s)).astype(np.uint8) * 255
    if dilate:
        m = cv2.dilate(m, np.ones((2, 2), np.uint8))
    return m


def ocr_mask(m):
    """Cắt sát dòng chữ rồi chỉ chạy bước NHẬN DẠNG (bỏ dò vùng chữ) → nhanh hơn nhiều lần."""
    ys, xs = np.where(m > 0)
    if len(xs) < 20:
        return "", 0.0
    pad = 6
    a, b = max(0, ys.min() - pad), min(m.shape[0], ys.max() + pad + 1)
    l, r = max(0, xs.min() - pad), min(m.shape[1], xs.max() + pad + 1)
    line = cv2.cvtColor(255 - m[a:b, l:r], cv2.COLOR_GRAY2BGR)
    res, _ = ocr(line, use_det=False, use_cls=False, use_rec=True)
    if not res:
        return "", 0.0
    item = res[0]
    # Định dạng kết quả khác nhau giữa các phiên bản: lấy phần chữ và phần điểm tin cậy.
    text = next((x for x in reversed(item) if isinstance(x, str) and not x.replace(".", "").isdigit()), "")
    conf = next((float(x) for x in reversed(item) if isinstance(x, (int, float)) or (isinstance(x, str) and x.replace(".", "").isdigit())), 0.0)
    return text.strip(), conf


def estimate_chars(m):
    """Ước số chữ: bề rộng phần có chữ (bỏ khoảng trống lớn) chia chiều cao chữ."""
    rows = np.where(m.sum(axis=1) > 0)[0]
    cols = np.where(m.sum(axis=0) > 0)[0]
    if len(rows) < 3 or len(cols) < 3:
        return 0
    ch = rows[-1] - rows[0] + 1
    gaps = np.diff(cols)
    width = (cols[-1] - cols[0] + 1) - gaps[gaps > ch * 0.6].sum()  # bỏ dấu cách giữa các cụm
    return int(round(width / (ch * 1.0)))


def ocr_full(m):
    """Dò vùng chữ + nhận dạng (chậm hơn nhưng chắc hơn với dòng có khoảng trắng / nhiễu)."""
    img = cv2.cvtColor(255 - m, cv2.COLOR_GRAY2BGR)
    img = cv2.copyMakeBorder(img, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    res, _ = ocr(img)
    if not res:
        return "", 0.0
    res.sort(key=lambda r: r[0][0][0])
    return " ".join(r[1].strip() for r in res).strip(), float(np.mean([float(r[2]) for r in res]))


def read(crop):
    global n_ocr
    n_ocr += 1
    m = mask_of(crop)
    best = ocr_mask(m)  # nhanh
    if best[1] < 0.9:  # chưa chắc: dò vùng chữ, rồi thử kiểu tách chữ thứ hai
        for cand in (ocr_full(m), ocr_full(mask_of(crop, 160, 90, True))):
            n_ocr += 1
            if cand[1] > best[1]:
                best = cand
    return best


n_ocr = 0


def changed(a, b):
    """Mặt nạ chữ khác nhau rõ (> 25% số điểm chữ)."""
    return np.logical_xor(a > 0, b > 0).sum() > 0.25 * max((a > 0).sum(), (b > 0).sum(), 1)


cues = []
last_mask = None  # mặt nạ của lần OCR gần nhất
prev_mask = None  # mặt nạ khung trước (để chờ phụ đề "đứng yên" rồi mới đọc)
cur = None  # (text, conf, est, crop)
idx = 0
while True:
    if not cap.grab():
        break
    if idx % step:
        idx += 1
        continue
    ok, frame = cap.retrieve()
    t = idx / vfps
    idx += 1
    if args.limit and t > args.limit:
        break
    if idx % (step * 600) == 1:
        print(f"... {t/60:.1f} phút", file=sys.stderr, flush=True)
    if not ok:
        continue
    crop = frame[y0:y1, x0:x1]
    m = mask_of(crop)
    if (m > 0).sum() < 60:
        cur, last_mask, prev_mask = None, None, None
        continue
    stable = prev_mask is not None and not changed(m, prev_mask)
    prev_mask = m
    # Chỉ OCR khi phụ đề đã đứng yên 2 khung liền và khác lần đọc trước → ít lần đọc, không đọc khung đang chuyển.
    if stable and (last_mask is None or changed(m, last_mask)):
        text, conf = read(crop)
        small = cv2.resize(crop, None, fx=0.5, fy=0.5) if crop.shape[0] > 120 else crop
        cur = (text, conf, estimate_chars(m), small) if text else None
        last_mask = m
    if not cur:
        continue
    text, conf, est, c = cur
    if cues and cues[-1]["text"] == text and t - cues[-1]["end"] <= 2.5 / args.fps:
        cues[-1]["end"] = round(t + 1.0 / args.fps, 2)
    else:
        cues.append({"start": round(max(0, t - 1.0 / args.fps), 2), "end": round(t + 1.0 / args.fps, 2), "text": text, "conf": round(conf, 3), "est": est, "_crop": c})

cues = [c for c in cues if c["end"] - c["start"] >= 0.3]
for i, c in enumerate(cues):
    crop = c.pop("_crop")
    c["flag"] = c["conf"] < 0.9
    # Lưu ảnh MỌI dòng phụ đề: chữ cuối cùng được đọc trực tiếp từ ảnh, OCR chỉ để đối chiếu.
    cv2.imwrite(os.path.join(args.out, f"crop_{c['start']:.1f}.png"), crop)
with open(os.path.join(args.out, "ocr.json"), "w", encoding="utf-8") as f:
    json.dump(cues, f, ensure_ascii=False)
print(f"{len(cues)} câu, {sum(c['flag'] for c in cues)} câu cần soát, {n_ocr} lần OCR")
