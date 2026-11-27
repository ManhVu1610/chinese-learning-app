"""Nghe-chép tiếng Trung bằng faster-whisper (mã nguồn mở, chạy trên máy). In JSON [{start, end, text}] ra stdout.

Dùng: python transcribe.py <file-audio> [model]   (model: tiny | base | small | medium | large-v3; mặc định small)
"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

import av
import numpy as np
from faster_whisper import WhisperModel


def load_audio(path: str) -> np.ndarray:
    """Giải mã audio thành 16 kHz mono (tự làm bằng PyAV, tránh lỗi lệch phiên bản giữa PyAV và faster-whisper)."""
    chunks = []
    with av.open(path) as container:
        resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(audio=0):
            chunks.extend(f.to_ndarray() for f in resampler.resample(frame))
        chunks.extend(f.to_ndarray() for f in resampler.resample(None))
    return np.concatenate(chunks, axis=1).flatten().astype(np.float32) / 32768.0


audio = sys.argv[1]
model_name = sys.argv[2] if len(sys.argv) > 2 else "small"
# Chạy bằng CPU: máy có GPU NVIDIA nhưng thiếu thư viện CUDA (cuBLAS) sẽ lỗi nếu để "auto".
model = WhisperModel(model_name, device="cpu", compute_type="int8")
segments, _ = model.transcribe(
    load_audio(audio),
    language="zh",
    vad_filter=True,
    # Gợi ý chép bằng giản thể, có dấu câu.
    initial_prompt="以下是普通话的句子，使用简体中文和标点符号。",
)
out = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segments if s.text.strip()]
sys.stdout.write(json.dumps(out, ensure_ascii=False))
