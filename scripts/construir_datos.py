"""Construye la banda sonora y los datos que consume la animación.

Pasos:
  1. Carga la narración original (m4a) y la normaliza.
  2. Sintetiza con Piper (sherpa-onnx) la voz de las aclaraciones.
  3. Calcula la línea de tiempo completa del vídeo.
  4. Sintetiza una música ambiental sencilla (sin material con derechos).
  5. Mezcla todo y exporta:
       build/banda-sonora.wav         (48 kHz estéreo, para el vídeo)
       assets/audio/banda-sonora.mp4  (AAC, para la página web)
       assets/js/datos.js             (window.DATOS para stage.js)
       data/subtitulos.srt / .vtt     (subtítulos del vídeo completo)

Uso:
  TTS_DIR=/ruta/vits-piper-es_MX-claude-high python3 scripts/construir_datos.py
"""
import json
import os
import re
import subprocess
from math import gcd
from pathlib import Path

import av
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfiltfilt, resample_poly

RAIZ = Path(__file__).resolve().parent.parent
BUILD = RAIZ / "build"
SR = 48000
N_OFFSET = 4.0          # la narración original empieza en T = 4 s del vídeo
FFMPEG = os.environ.get("FFMPEG") or __import__("imageio_ffmpeg").get_ffmpeg_exe()


# ---------------------------------------------------------------- utilidades
def cargar_m4a(ruta):
    c = av.open(str(ruta))
    r = av.AudioResampler(format="flt", layout="mono", rate=SR)
    trozos = []
    for f in c.decode(audio=0):
        for g in r.resample(f):
            trozos.append(g.to_ndarray().reshape(-1))
    for g in r.resample(None):
        trozos.append(g.to_ndarray().reshape(-1))
    return np.concatenate(trozos).astype(np.float32)


def pasa_altos(x, fc=80):
    sos = butter(4, fc, btype="highpass", fs=SR, output="sos")
    return sosfiltfilt(sos, x).astype(np.float32)


def rms_voz(x):
    """RMS de las tramas con voz (ignora silencios)."""
    fr = int(0.02 * SR)
    n = len(x) // fr
    e = np.sqrt((x[: n * fr].reshape(n, fr) ** 2).mean(axis=1) + 1e-12)
    umbral = 0.1 * np.percentile(e, 95)
    return float(np.sqrt((e[e > umbral] ** 2).mean()))


def normalizar(x, objetivo_db=-20.0):
    g = 10 ** (objetivo_db / 20) / rms_voz(x)
    return (x * g).astype(np.float32)


def limitador(x, techo=0.89):
    # Compresión suave de picos (tanh por encima del 70 % del techo).
    y = x.copy()
    k = 0.7 * techo
    m = np.abs(y) > k
    y[m] = np.sign(y[m]) * (k + (techo - k) * np.tanh((np.abs(y[m]) - k) / (techo - k)))
    return y


def silabas(palabra):
    p = re.sub(r"[^a-záéíóúüñ]", "", palabra.lower())
    grupos = re.findall(r"[aeiouáéíóúü]+", p)
    n = 0
    for g in grupos:
        # hiatos con vocal fuerte + fuerte o con tilde en vocal débil
        fuertes = sum(ch in "aeoáéó" for ch in g) + sum(ch in "íú" for ch in g)
        n += max(1, fuertes)
    return max(1, n)


def tiempos_palabras(x, ini, fin, texto, sr=SR):
    """Reparte las palabras de una frase según la energía de la voz.

    Mapea la fracción acumulada de sílabas sobre la fracción acumulada de
    tiempo con voz, así las pausas internas no desplazan el resaltado.
    """
    palabras = texto.split()
    seg = x[int(ini * sr): int(fin * sr)]
    fr = int(0.01 * sr)
    n = max(1, len(seg) // fr)
    e = np.sqrt((seg[: n * fr].reshape(n, fr) ** 2).mean(axis=1) + 1e-12)
    voz = e > 0.12 * e.max()
    acum = np.concatenate([[0], np.cumsum(voz)]).astype(float)
    total = acum[-1] if acum[-1] > 0 else 1.0
    syl = np.array([silabas(p) for p in palabras], dtype=float)
    frac = np.concatenate([[0], np.cumsum(syl)]) / syl.sum()

    def t_de(f):
        k = np.searchsorted(acum, f * total)
        return ini + min(k, n) * 0.01

    out = []
    for i, p in enumerate(palabras):
        out.append({"w": p, "t0": round(t_de(frac[i]), 3), "t1": round(t_de(frac[i + 1]), 3)})
    out[0]["t0"] = round(ini, 3)
    out[-1]["t1"] = round(fin, 3)
    return out


def trocear(palabras, max_chars=62):
    """Agrupa palabras en líneas de subtítulo, cortando en puntuación."""
    bloques, actual = [], []
    for w in palabras:
        actual.append(w)
        largo = len(" ".join(p["w"] for p in actual))
        fin_frase = w["w"][-1] in ".;:?!"
        coma = w["w"][-1] == ","
        if fin_frase or (coma and largo > 28) or largo > max_chars:
            bloques.append(actual)
            actual = []
    if actual:
        bloques.append(actual)
    return bloques


# ---------------------------------------------------------------------- TTS
def sintetizar(texto, destino, tts_dir):
    import sherpa_onnx
    nombre = Path(tts_dir).name.replace("vits-piper-", "")
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=f"{tts_dir}/{nombre}.onnx", tokens=f"{tts_dir}/tokens.txt",
                data_dir=f"{tts_dir}/espeak-ng-data", length_scale=1.04),
            num_threads=4))
    tts = sintetizar.cache.get(tts_dir) or sherpa_onnx.OfflineTts(cfg)
    sintetizar.cache[tts_dir] = tts
    a = tts.generate(texto, sid=0, speed=1.0)
    y = np.array(a.samples, dtype=np.float32)
    g = gcd(SR, a.sample_rate)
    y = resample_poly(y, SR // g, a.sample_rate // g).astype(np.float32)
    sf.write(destino, y, SR)


sintetizar.cache = {}


def clip_tts(clave, texto, tts_dir):
    """Devuelve el audio TTS (cacheado por texto) recortado y normalizado."""
    import hashlib
    h = hashlib.sha1(texto.encode()).hexdigest()[:10]
    ruta = BUILD / "tts" / f"{clave}-{h}.wav"
    ruta.parent.mkdir(parents=True, exist_ok=True)
    if not ruta.exists():
        if not tts_dir:
            raise SystemExit("Falta TTS_DIR (voz Piper) para sintetizar: " + clave)
        sintetizar(texto, ruta, tts_dir)
    y, sr = sf.read(ruta, dtype="float32")
    assert sr == SR
    # recorta silencios de borde
    e = np.abs(y) > 0.01
    i0, i1 = np.argmax(e), len(y) - np.argmax(e[::-1])
    y = y[max(0, i0 - int(0.03 * SR)): i1 + int(0.05 * SR)]
    return limitador(normalizar(pasa_altos(y, 70), -21.0))


# -------------------------------------------------------------------- música
def nota(f, dur, amp, ataque=0.01, caida=1.2):
    t = np.arange(int(dur * SR)) / SR
    env = np.minimum(1, t / ataque) * np.exp(-t / caida)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    return (amp * env * s).astype(np.float32)


def colchon(dur, acordes, amp):
    """Pad suave: sinusoides con vibrato lento y fundido entre acordes."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n, np.float32)
    por = dur / len(acordes)
    for k, acorde in enumerate(acordes):
        ventana = np.clip(1 - np.abs((t - (k + 0.5) * por) / (0.62 * por)), 0, 1) ** 1.5
        for f in acorde:
            fase = 2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 0.13 * t + f)
            y += (ventana * (np.sin(fase) + 0.18 * np.sin(2 * fase))).astype(np.float32)
    y *= amp / max(1e-6, np.abs(y).max())
    fade = int(1.5 * SR)
    y[:fade] *= np.linspace(0, 1, fade)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y


def pegar(pista, y, t, ganancia=1.0):
    i = int(round(t * SR))
    j = min(len(pista), i + len(y))
    pista[i:j] += ganancia * y[: j - i]


def hz(nombre):
    notas = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    base, octava = nombre[:-1], int(nombre[-1])
    semis = notas[base[0]] + (1 if "#" in base else 0) + 12 * (octava - 4)
    return 440.0 * 2 ** (semis / 12)


def normalizar_sonoridad(entrada, salida, objetivo=-14.5, pico=-1.5):
    """Normalización EBU R128 en dos pasadas (YouTube reproduce a unos −14 LUFS)."""
    filtro = f"loudnorm=I={objetivo}:TP={pico}:LRA=11"
    r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", str(entrada), "-af", filtro + ":print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, check=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"): r.stderr.rindex("}") + 1])
    filtro += (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
               f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(entrada), "-af", filtro, "-ar", str(SR),
                    "-c:a", "pcm_s16le", str(salida)], check=True)


# ---------------------------------------------------------------------- main
def main():
    tts_dir = os.environ.get("TTS_DIR", "")
    BUILD.mkdir(exist_ok=True)
    trans = json.loads((RAIZ / "data/transcripcion.json").read_text())
    acl = json.loads((RAIZ / "data/aclaraciones.json").read_text())
    mols = json.loads((RAIZ / "data/moleculas.json").read_text())

    # 1. Narración original
    voz = cargar_m4a(RAIZ / trans["fuente"])
    voz = limitador(normalizar(pasa_altos(voz), -19.5))
    frases = []
    for f in trans["frases"]:
        pal = tiempos_palabras(voz, f["ini"], f["fin"], f["texto"])
        for p in pal:
            p["t0"] = round(p["t0"] + N_OFFSET, 3)
            p["t1"] = round(p["t1"] + N_OFFSET, 3)
        frases.append({"ini": round(f["ini"] + N_OFFSET, 3), "fin": round(f["fin"] + N_OFFSET, 3),
                       "texto": f["texto"], "dudoso": f.get("dudoso", False), "palabras": pal})
    fin_narr = trans["frases"][-1]["fin"] + N_OFFSET

    # 2-3. Aclaraciones con TTS y línea de tiempo
    t = fin_narr + 1.0
    t_acl = t
    clips = []   # (t_inicio, audio, texto)
    y_ent = clip_tts("entrada", acl["entrada"]["narracion"], tts_dir)
    t_ent = t_acl + 1.4
    clips.append((t_ent, y_ent, acl["entrada"]["narracion"]))
    t = t_ent + len(y_ent) / SR + 0.9
    tarjetas = []
    for k, c in enumerate(acl["tarjetas"]):
        y = clip_tts(f"tarjeta{k+1}", c["narracion"], tts_dir)
        t_ini = t
        t_voz = t_ini + 0.8
        t_fin = t_voz + len(y) / SR + 1.3
        clips.append((t_voz, y, c["narracion"]))
        tarjetas.append({**c, "t_ini": round(t_ini, 3), "t_voz": round(t_voz, 3),
                         "t_fin_voz": round(t_voz + len(y) / SR, 3), "t_fin": round(t_fin, 3)})
        t = t_fin
    t_res = t
    y_cie = clip_tts("cierre", acl["cierre"]["narracion"], tts_dir)
    t_cie = t_res + 3.2
    clips.append((t_cie, y_cie, acl["cierre"]["narracion"]))
    fin = max(t_res + 9.5, t_cie + len(y_cie) / SR + 2.2)

    # Palabras de las locuciones TTS (relativas a la pista completa)
    locuciones = []
    for t0, y, texto in clips:
        pal = tiempos_palabras(y, 0.0, len(y) / SR, texto)
        for p in pal:
            p["t0"] = round(p["t0"] + t0, 3)
            p["t1"] = round(p["t1"] + t0, 3)
        locuciones.append({"ini": round(t0, 3), "fin": round(t0 + len(y) / SR, 3), "texto": texto, "palabras": pal})

    # 4. Música y efectos
    n = int((fin + 0.5) * SR)
    musica = np.zeros(n, np.float32)
    # Arpegio de entrada (Re mayor con novena)
    for i, nm in enumerate(["D4", "A4", "E5", "F#5", "A5"]):
        pegar(musica, nota(hz(nm), 3.0, 0.16, caida=1.1), 0.25 + 0.32 * i)
    pegar(musica, colchon(4.6, [[hz("D3"), hz("A3"), hz("F#4")]], 0.10), 0.0)
    # Pequeño acento en el cambio a aclaraciones
    for i, nm in enumerate(["A4", "D5", "E5"]):
        pegar(musica, nota(hz(nm), 2.0, 0.10, caida=0.8), t_acl + 0.1 * i)
    # Colchón bajo las aclaraciones (muy suave para no tapar la voz)
    dur_pad = fin - t_acl
    acordes = [[hz("D3"), hz("A3"), hz("E4")], [hz("B2"), hz("F#3"), hz("D4")],
               [hz("G2"), hz("D3"), hz("B3")], [hz("A2"), hz("E3"), hz("C#4")]] * 3
    pegar(musica, colchon(dur_pad, acordes, 0.045), t_acl)
    # Cierre
    for i, nm in enumerate(["D5", "A4", "F#4", "D4"]):
        pegar(musica, nota(hz(nm), 3.0, 0.10, caida=1.4), fin - 3.6 + 0.3 * i)

    pista_voz = np.zeros(n, np.float32)
    pegar(pista_voz, voz, N_OFFSET)
    for t0, y, _ in clips:
        pegar(pista_voz, y, t0)

    # Ducking: baja la música cuando hay voz
    fr = int(0.02 * SR)
    env = np.abs(pista_voz)
    k = len(env) // fr
    env_fr = env[: k * fr].reshape(k, fr).max(axis=1)
    activa = (env_fr > 0.02).astype(float)
    suav = np.convolve(activa, np.ones(25) / 25, mode="same")
    duck = 1 - 0.45 * np.clip(suav, 0, 1)
    duck = np.repeat(duck, fr)
    duck = np.concatenate([duck, np.ones(n - len(duck))])
    mezcla = pista_voz + musica * duck
    mezcla = limitador(mezcla, 0.9)
    # Estéreo: música ligeramente abierta, voz al centro
    izq = mezcla
    der = pista_voz + musica * duck * 0.92
    estereo = np.stack([izq, limitador(der, 0.9)], axis=1)
    sf.write(BUILD / "banda-sonora-cruda.wav", estereo, SR, subtype="FLOAT")
    normalizar_sonoridad(BUILD / "banda-sonora-cruda.wav", BUILD / "banda-sonora.wav")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(BUILD / "banda-sonora.wav"),
                    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
                    str(RAIZ / "assets/audio/banda-sonora.mp4")], check=True)
    # Respaldo Opus para navegadores sin AAC (Chromium libre, algunos Firefox en Linux)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", str(BUILD / "banda-sonora.wav"),
                    "-c:a", "libopus", "-b:a", "96k", str(RAIZ / "assets/audio/banda-sonora.webm")], check=True)

    # 5. Capítulos (≥ 10 s cada uno, requisito de YouTube)
    A = lambda a: round(a + N_OFFSET, 2)
    capitulos = [
        {"t": 0.0, "titulo": "Presentación: medicamentos y opioides"},
        {"t": A(9.4), "titulo": "Actúan sobre el sistema nervioso"},
        {"t": A(20.5), "titulo": "¿Qué es un opioide?"},
        {"t": A(38.4), "titulo": "Receptores κ, μ y δ"},
        {"t": A(51.8), "titulo": "Mecanismo de acción"},
        {"t": round(t_acl, 2), "titulo": "Aclaraciones rigurosas"},
        {"t": round(t_res, 2), "titulo": "Resumen"},
    ]

    datos = {
        "duracion": round(fin, 3),
        "offsetNarracion": N_OFFSET,
        "finNarracion": round(fin_narr, 3),
        "tAclaraciones": round(t_acl, 3),
        "tResumen": round(t_res, 3),
        "frases": frases,
        "locuciones": locuciones,
        "tarjetas": tarjetas,
        "capitulos": capitulos,
        "moleculas": mols,
        "notas": trans["notas"],
    }
    (RAIZ / "assets/js/datos.js").write_text(
        "// Generado por scripts/construir_datos.py — no editar a mano.\nwindow.DATOS = "
        + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n")

    # Subtítulos SRT/VTT (narración original + aclaraciones)
    def ts(x, sep):
        h, r = divmod(x, 3600)
        m, s = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int(round((s % 1) * 1000)):03d}"

    cues = []
    for f in frases + locuciones:
        for b in trocear(f["palabras"]):
            cues.append((b[0]["t0"], b[-1]["t1"] + 0.25, " ".join(p["w"] for p in b)))
    cues.sort()
    srt = "\n".join(f"{i+1}\n{ts(a, ',')} --> {ts(min(b, cues[i+1][0] if i+1 < len(cues) else b), ',')}\n{txt}\n"
                    for i, (a, b, txt) in enumerate(cues))
    vtt = "WEBVTT\n\n" + "\n".join(f"{ts(a, '.')} --> {ts(min(b, cues[i+1][0] if i+1 < len(cues) else b), '.')}\n{txt}\n"
                                   for i, (a, b, txt) in enumerate(cues))
    (RAIZ / "data/subtitulos.srt").write_text(srt)
    (RAIZ / "data/subtitulos.vtt").write_text(vtt)

    print(f"Duración total: {fin:.2f} s · aclaraciones desde {t_acl:.2f} s · resumen {t_res:.2f} s")
    for c in capitulos:
        m, s = divmod(int(c["t"]), 60)
        print(f"  {m}:{s:02d} {c['titulo']}")
    for tj in tarjetas:
        print(f"  tarjeta {tj['id']:10s} {tj['t_ini']:7.2f} → {tj['t_fin']:7.2f}")


if __name__ == "__main__":
    main()
