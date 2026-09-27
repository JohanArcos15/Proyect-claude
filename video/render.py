"""Renderiza el vídeo de YouTube (1920×1080, 30 fps, H.264 + AAC).

Recorre stage.js fotograma a fotograma en Chromium headless (Playwright),
guarda JPEG de alta calidad y los une con la banda sonora usando ffmpeg.

Uso:
  python3 video/render.py                    # vídeo completo + miniatura
  python3 video/render.py --muestras 3,30,90 # solo fotogramas sueltos (PNG)
"""
import argparse
import functools
import glob
import http.server
import os
import shutil
import subprocess
import threading
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
BUILD = RAIZ / "build"
SALIDA = RAIZ / "salida"
FPS = 30


def ffmpeg():
    return os.environ.get("FFMPEG") or __import__("imageio_ffmpeg").get_ffmpeg_exe()


def chromium():
    if os.environ.get("CHROMIUM"):
        return os.environ["CHROMIUM"]
    c = sorted(glob.glob("/opt/pw-browsers/chromium-*/chrome-linux/chrome"))
    return c[-1] if c else None


def servidor():
    class Silencioso(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    manejador = functools.partial(Silencioso, directory=str(RAIZ))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def abrir(p, puerto):
    nav = p.chromium.launch(executable_path=chromium(), args=["--disable-gpu", "--font-render-hinting=none"])
    pag = nav.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    pag.goto(f"http://127.0.0.1:{puerto}/video/render.html")
    pag.wait_for_function("window.listo === true", timeout=60000)
    return nav, pag


def trabajador(args):
    puerto, indices, carpeta = args
    with sync_playwright() as p:
        nav, pag = abrir(p, puerto)
        for i in indices:
            pag.evaluate(f"renderAt({i / FPS})")
            pag.screenshot(path=f"{carpeta}/{i:06d}.jpg", type="jpeg", quality=95,
                           clip={"x": 0, "y": 0, "width": 1920, "height": 1080})
        nav.close()
    return len(indices)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--muestras", help="tiempos en segundos separados por comas")
    ap.add_argument("--procesos", type=int, default=4)
    ap.add_argument("--solo-codificar", action="store_true",
                    help="reutiliza build/fotogramas y solo vuelve a unir vídeo y audio")
    args = ap.parse_args()
    srv = servidor()
    puerto = srv.server_address[1]

    if args.muestras:
        destino = BUILD / "muestras"
        destino.mkdir(parents=True, exist_ok=True)
        with sync_playwright() as p:
            nav, pag = abrir(p, puerto)
            for t in args.muestras.split(","):
                pag.evaluate(f"renderAt({float(t)})")
                pag.screenshot(path=str(destino / f"t{float(t):07.2f}.png"))
            nav.close()
        print("Muestras en", destino)
        return

    carpeta = BUILD / "fotogramas"
    if args.solo_codificar:
        codificar(carpeta)
        return

    with sync_playwright() as p:
        nav, pag = abrir(p, puerto)
        duracion = pag.evaluate("window.duracion")
        # Miniatura 1280×720 para YouTube
        pag.evaluate("miniatura()")
        pag.screenshot(path=str(BUILD / "miniatura.png"))
        nav.close()
    from PIL import Image
    SALIDA.mkdir(exist_ok=True)
    Image.open(BUILD / "miniatura.png").convert("RGB").resize((1280, 720), Image.LANCZOS).save(
        SALIDA / "miniatura-youtube.jpg", quality=92)

    n = int(round(duracion * FPS))
    shutil.rmtree(carpeta, ignore_errors=True)
    carpeta.mkdir(parents=True)
    trozos = [list(range(k, n, args.procesos)) for k in range(args.procesos)]
    with ProcessPoolExecutor(args.procesos) as ex:
        hechos = sum(ex.map(trabajador, [(puerto, tr, str(carpeta)) for tr in trozos]))
    print(f"{hechos} fotogramas renderizados")
    codificar(carpeta)


def codificar(carpeta):
    salida = SALIDA / "opioides-youtube-1080p.mp4"
    subprocess.run([
        ffmpeg(), "-y", "-loglevel", "error",
        "-framerate", str(FPS), "-i", str(carpeta / "%06d.jpg"),
        "-i", str(BUILD / "banda-sonora.wav"),
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-tune", "animation", "-profile:v", "high",
        "-pix_fmt", "yuv420p", "-g", str(FPS * 2), "-bf", "2", "-r", str(FPS),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-shortest", "-movflags", "+faststart", str(salida),
    ], check=True)
    print("Vídeo:", salida)


if __name__ == "__main__":
    main()
