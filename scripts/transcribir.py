"""Transcribe la narración original con Whisper (sherpa-onnx) y VAD Silero.

Es el paso automático previo a data/transcripcion.json, que se revisó a mano
frase a frase comparando dos modelos (large-v3-turbo y large-v3).

Modelos (releases de k2-fsa/sherpa-onnx en GitHub):
  asr-models/sherpa-onnx-whisper-turbo.tar.bz2
  asr-models/sherpa-onnx-whisper-large-v3.tar.bz2
  asr-models/silero_vad.onnx

Uso:
  python3 scripts/transcribir.py RUTA_MODELOS [turbo|large-v3]
"""
import json
import sys
from pathlib import Path

import av
import numpy as np
import sherpa_onnx

RAIZ = Path(__file__).resolve().parent.parent
AUDIO = RAIZ / "assets/audio/narracion-original.m4a"


def cargar_16k(ruta):
    c = av.open(str(ruta))
    r = av.AudioResampler(format="flt", layout="mono", rate=16000)
    trozos = [g.to_ndarray().reshape(-1) for f in c.decode(audio=0) for g in r.resample(f)]
    trozos += [g.to_ndarray().reshape(-1) for g in r.resample(None)]
    return np.concatenate(trozos).astype(np.float32)


def main():
    modelos = Path(sys.argv[1])
    nombre = sys.argv[2] if len(sys.argv) > 2 else "turbo"
    d = modelos / f"sherpa-onnx-whisper-{nombre}"
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=str(d / f"{nombre}-encoder.int8.onnx"), decoder=str(d / f"{nombre}-decoder.int8.onnx"),
        tokens=str(d / f"{nombre}-tokens.txt"), language="es", task="transcribe", num_threads=4)
    a = cargar_16k(AUDIO)

    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(modelos / "silero_vad.onnx")
    cfg.silero_vad.min_silence_duration = 0.12
    cfg.silero_vad.min_speech_duration = 0.25
    cfg.silero_vad.max_speech_duration = 20
    cfg.sample_rate = 16000
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=120)
    segs = []
    ws = cfg.silero_vad.window_size
    for i in range(0, len(a), ws):
        vad.accept_waveform(a[i:i + ws])
        while not vad.empty():
            segs.append((vad.front.start, np.array(vad.front.samples)))
            vad.pop()
    vad.flush()
    while not vad.empty():
        segs.append((vad.front.start, np.array(vad.front.samples)))
        vad.pop()

    salida = []
    for inicio, muestras in segs:
        s = rec.create_stream()
        s.accept_waveform(16000, muestras)
        rec.decode_stream(s)
        t0, t1 = inicio / 16000, inicio / 16000 + len(muestras) / 16000
        salida.append({"ini": round(t0, 2), "fin": round(t1, 2), "texto": s.result.text.strip()})
        print(f"[{t0:6.2f}–{t1:6.2f}] {s.result.text.strip()}")
    destino = RAIZ / "build" / f"transcripcion-{nombre}.json"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
