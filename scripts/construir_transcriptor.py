"""Prepara los modelos y el runtime que usa transcriptor/ (Audio a TXT).

Parte de los Whisper multilingües de sherpa-onnx (tiny y base) y los rehace para
que corran rápido en onnxruntime-web con un solo hilo:

- Codificador: el int8 de sherpa-onnx con el espectrograma log-mel incorporado
  (entra "frames" [3000, 400]: ventanas de 400 muestras cada 160, con relleno
  reflejado) y la caché cruzada ya repartida por capa (k: [H, dh, T], v: [H, T, dh]).
- Decodificador: grafo nuevo con caché propia que crece por concatenación,
  logits sólo de la última posición y el embedding de tokens en int8 (una copia
  que sirve para la búsqueda y para los logits). Unas 6 veces más rápido por
  token que el de sherpa-onnx, que copia la caché entera en cada paso.

Los binarios se cortan en partes de 12 MiB (el límite de un Artifact es 15 MB
por archivo) y se describen en transcriptor/modelos/manifest.json. Las partes
llevan extensión .wasm porque es el único tipo binario genérico que sirve un
Artifact; la página sólo lee sus bytes y las vuelve a unir.

Uso:
  python3 scripts/construir_transcriptor.py
Requiere: numpy, onnx, onnxruntime; npm (para descargar onnxruntime-web).
"""
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto as TP
from onnx import helper as h
from onnx import numpy_helper as nh
from onnxruntime.quantization import QuantType, quantize_dynamic

RAIZ = Path(__file__).resolve().parent.parent
BUILD = RAIZ / "build" / "transcriptor"
DESTINO = RAIZ / "transcriptor"
MODELOS = ["base", "tiny"]
ORT_VERSION = "1.30.0"
PARTE = 12 * 1024 * 1024
URL_SHERPA = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-{}.tar.bz2"


def descargar_sherpa(nombre):
    d = BUILD / f"sherpa-onnx-whisper-{nombre}"
    if d.exists():
        return d
    BUILD.mkdir(parents=True, exist_ok=True)
    tar = BUILD / f"{nombre}.tar.bz2"
    if not tar.exists():
        print("descargando", URL_SHERPA.format(nombre))
        urllib.request.urlretrieve(URL_SHERPA.format(nombre), tar)
    with tarfile.open(tar) as t:
        t.extractall(BUILD)
    return d


def hz_a_mel(f):
    f = np.asarray(f, dtype=np.float64)
    paso = np.log(6.4) / 27.0
    return np.where(f >= 1000, 15 + np.log(np.maximum(f, 1e-10) / 1000) / paso, f * 3 / 200)


def mel_a_hz(m):
    m = np.asarray(m, dtype=np.float64)
    paso = np.log(6.4) / 27.0
    return np.where(m >= 15, 1000 * np.exp(paso * (m - 15)), m * 200 / 3)


def banco_mel(n_mels):
    """Igual que librosa.filters.mel(sr=16000, n_fft=400, norm='slaney')."""
    f_fft = np.linspace(0, 8000, 201)
    f_mel = mel_a_hz(np.linspace(hz_a_mel(0), hz_a_mel(8000), n_mels + 2))
    dif = np.diff(f_mel)
    rampas = f_mel[:, None] - f_fft[None, :]
    fb = np.zeros((n_mels, 201))
    for i in range(n_mels):
        fb[i] = np.maximum(0, np.minimum(-rampas[i] / dif[i], rampas[i + 2] / dif[i + 1]))
    return fb * (2.0 / (f_mel[2:n_mels + 2] - f_mel[:n_mels]))[:, None]


def construir_codificador(src, nombre, salida):
    enc = onnx.load(src / f"{nombre}-encoder.int8.onnx")
    meta = {p.key: p.value for p in enc.metadata_props}
    D, H = int(meta["n_text_state"]), int(meta["n_text_head"])
    g = enc.graph

    # caché cruzada por capa, en la disposición que usa el decodificador
    concat = {n.output[0]: n for n in g.node if n.output and n.output[0] in ("n_layer_cross_k", "n_layer_cross_v")}
    unsq = {n.output[0]: n for n in g.node if n.op_type == "Unsqueeze"}
    g.initializer.append(nh.from_array(np.array([-1, H, D // H], np.int64), "x_heads_shape"))
    salidas = []
    for tipo, perm in (("k", [1, 2, 0]), ("v", [1, 0, 2])):
        cat = concat[f"n_layer_cross_{tipo}"]
        for i, u in enumerate(cat.input):
            r, o = f"x{tipo}{i}_r", f"c{tipo}{i}"
            g.node.extend([h.make_node("Reshape", [unsq[u].input[0], "x_heads_shape"], [r]),
                           h.make_node("Transpose", [r], [o], perm=perm)])
            forma = [H, D // H, "T"] if tipo == "k" else [H, "T", D // H]
            salidas.append(h.make_tensor_value_info(o, TP.FLOAT, forma))
        g.node.remove(cat)
    for u in list(unsq.values()):
        if all(u.output[0] not in n.input for n in g.node):
            g.node.remove(u)
    del g.output[:]
    g.output.extend(salidas)

    # espectrograma log-mel de Whisper como dos MatMul (DFT con la ventana Hann incluida)
    ventana = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(400) / 400)
    ang = 2 * np.pi * np.outer(np.arange(400), np.arange(201)) / 400
    g.initializer.extend([
        nh.from_array((ventana[:, None] * np.cos(ang)).astype(np.float32), "dft_re"),
        nh.from_array((-ventana[:, None] * np.sin(ang)).astype(np.float32), "dft_im"),
        nh.from_array(banco_mel(int(meta["n_mels"])).T.astype(np.float32), "mel_fb"),
        nh.from_array(np.array(1e-10, np.float32), "mel_eps"),
        nh.from_array(np.array(1 / np.log(10), np.float32), "mel_ilog10"),
        nh.from_array(np.array(8, np.float32), "mel_8"),
        nh.from_array(np.array(4, np.float32), "mel_4"),
        nh.from_array(np.array([0], np.int64), "mel_ax0"),
    ])
    nodos = [
        h.make_node("MatMul", ["frames", "dft_re"], ["m_re"]),
        h.make_node("MatMul", ["frames", "dft_im"], ["m_im"]),
        h.make_node("Mul", ["m_re", "m_re"], ["m_re2"]),
        h.make_node("Mul", ["m_im", "m_im"], ["m_im2"]),
        h.make_node("Add", ["m_re2", "m_im2"], ["m_pow"]),
        h.make_node("MatMul", ["m_pow", "mel_fb"], ["m_mel"]),
        h.make_node("Max", ["m_mel", "mel_eps"], ["m_cl"]),
        h.make_node("Log", ["m_cl"], ["m_ln"]),
        h.make_node("Mul", ["m_ln", "mel_ilog10"], ["m_lg"]),
        h.make_node("ReduceMax", ["m_lg"], ["m_max"], keepdims=0),
        h.make_node("Sub", ["m_max", "mel_8"], ["m_suelo"]),
        h.make_node("Max", ["m_lg", "m_suelo"], ["m_lg2"]),
        h.make_node("Add", ["m_lg2", "mel_4"], ["m_a"]),
        h.make_node("Div", ["m_a", "mel_4"], ["m_n"]),
        h.make_node("Transpose", ["m_n"], ["m_t"], perm=[1, 0]),
        h.make_node("Unsqueeze", ["m_t", "mel_ax0"], ["mel"]),
    ]
    for i, n in enumerate(nodos):
        g.node.insert(i, n)
    del g.input[:]
    g.input.extend([h.make_tensor_value_info("frames", TP.FLOAT, [3000, 400])])
    usados = {i for n in g.node for i in n.input}
    for t in [t for t in g.initializer if t.name not in usados]:
        g.initializer.remove(t)
    onnx.checker.check_model(enc)
    onnx.save(enc, salida)
    return meta


def pesos_decodificador(src, nombre):
    dec = onnx.load(src / f"{nombre}-decoder.onnx")
    W = {t.name: nh.to_array(t) for t in dec.graph.initializer}
    consumidores = {}
    for n in dec.graph.node:
        for i in n.input:
            consumidores.setdefault(i, []).append(n)

    # los MatMul con pesos aparecen en orden: por capa q, k, v, out, q cruzada,
    # out cruzada, mlp.0, mlp.2 (k y v cruzadas viven en el codificador)
    mats = []
    for n in dec.graph.node:
        if n.op_type == "MatMul" and n.input[1] in W:
            sumas = [c for c in consumidores.get(n.output[0], []) if c.op_type == "Add" and any(i in W for i in c.input)]
            b = W[[i for i in sumas[0].input if i in W][0]].astype(np.float32) if sumas else None
            mats.append((n.name, W[n.input[1]].astype(np.float32), b))
    L = len(mats) // 8
    roles = ["q", "k", "v", "o", "cq", "co", "fc1", "fc2"]
    esperado = ["/query", "/key", "/value", "/out", "/query", "/out", "/mlp/mlp.0", "/mlp/mlp.2"]
    capas = []
    for l in range(L):
        d = {}
        for j, r in enumerate(roles):
            nombre_nodo, w, b = mats[8 * l + j]
            assert nombre_nodo.startswith(esperado[j]), (nombre_nodo, esperado[j])
            d[r] = (w, b)
        capas.append(d)
    emb = W["textDecoder.token_embedding.weight"].astype(np.float32)
    pos = W["textDecoder.positional_embedding"].astype(np.float32)
    V, D = emb.shape
    return capas, emb, pos, V, D, L, W


def grafo_decodificador(capas, emb, pos, V, D, L, H, W, nombre):
    dh = D // H
    nodos, inits = [], []
    cuenta = [0]

    def C(arr, nm):
        inits.append(nh.from_array(np.asarray(arr), nm))
        return nm

    def N(op, ins, **kw):
        cuenta[0] += 1
        o = f"t{cuenta[0]}"
        nodos.append(h.make_node(op, ins, [o], **kw))
        return o

    escala = np.abs(emb).max(axis=1) / 127.0
    escala[escala == 0] = 1
    embT_q = np.clip(np.round(emb / escala[:, None]), -127, 127).astype(np.int8).T.copy()  # [D, V]
    C(embT_q, "embT_q"); C(escala.astype(np.float32), "emb_scale"); C(pos, "pos_emb")
    C(np.array(0, np.int64), "i0"); C(np.array(1, np.int64), "i1"); C(np.array(2, np.int64), "i2")
    C(np.array([0], np.int64), "a0"); C(np.array([1], np.int64), "a1")
    C(np.array([-1, H, dh], np.int64), "heads_shape"); C(np.array([-1, D], np.int64), "flat_shape")
    C(np.array(dh ** -0.5, np.float32), "qscale"); C(np.array(-1e9, np.float32), "neg"); C(np.array(0, np.float32), "zero")
    C(np.array(0.5, np.float32), "half"); C(np.array(1, np.float32), "one"); C(np.array(1 / np.sqrt(2), np.float32), "isqrt2")
    C(np.array([V], np.int64), "v_shape")

    entradas = [h.make_tensor_value_info("tokens", TP.INT64, ["n"])]
    salidas = [h.make_tensor_value_info("logits", TP.FLOAT, [V])]
    for i in range(L):
        entradas += [h.make_tensor_value_info(f"past_k{i}", TP.FLOAT, [H, dh, "P"]),
                     h.make_tensor_value_info(f"past_v{i}", TP.FLOAT, [H, "P", dh])]
    for i in range(L):
        entradas += [h.make_tensor_value_info(f"ck{i}", TP.FLOAT, [H, dh, "T"]),
                     h.make_tensor_value_info(f"cv{i}", TP.FLOAT, [H, "T", dh])]
    for i in range(L):
        salidas += [h.make_tensor_value_info(f"present_k{i}", TP.FLOAT, [H, dh, "P1"]),
                    h.make_tensor_value_info(f"present_v{i}", TP.FLOAT, [H, "P1", dh])]

    P = N("Gather", [N("Shape", ["past_k0"]), "i2"], axis=0)
    n = N("Gather", [N("Shape", ["tokens"]), "i0"], axis=0)
    Pn = N("Add", [P, n])
    x = N("Slice", ["pos_emb", N("Unsqueeze", [P, "a0"]), N("Unsqueeze", [Pn, "a0"]), "a0"])
    e = N("Mul", [N("Cast", [N("Gather", ["embT_q", "tokens"], axis=1)], to=TP.FLOAT),
                  N("Gather", ["emb_scale", "tokens"], axis=0)])
    x = N("Add", [N("Transpose", [e], perm=[1, 0]), x])
    fila = N("Unsqueeze", [N("Add", [N("Range", ["i0", n, "i1"]), P]), "a1"])
    col = N("Unsqueeze", [N("Range", ["i0", Pn, "i1"]), "a0"])
    mascara = N("Where", [N("Greater", [col, fila]), "neg", "zero"])

    def lin(x, wb, nm):
        w, b = wb
        y = N("MatMul", [x, C(w, nm + "_w")])
        return N("Add", [y, C(b, nm + "_b")]) if b is not None else y

    def ln(x, pre):
        return N("LayerNormalization", [x, C(W[pre + ".weight"].astype(np.float32), pre + "_w"),
                                        C(W[pre + ".bias"].astype(np.float32), pre + "_b")], axis=-1, epsilon=1e-5)

    def cabezas(x, perm):
        return N("Transpose", [N("Reshape", [x, "heads_shape"])], perm=perm)

    def unir(a):
        return N("Reshape", [N("Transpose", [a], perm=[1, 0, 2]), "flat_shape"])

    for i, d in enumerate(capas):
        pre = f"textDecoder.blocks.{i}"
        hh = ln(x, pre + ".attn_ln")
        q = N("Mul", [cabezas(lin(hh, d["q"], f"l{i}q"), [1, 0, 2]), "qscale"])
        k = cabezas(lin(hh, d["k"], f"l{i}k"), [1, 2, 0])
        v = cabezas(lin(hh, d["v"], f"l{i}v"), [1, 0, 2])
        nodos.append(h.make_node("Concat", [f"past_k{i}", k], [f"present_k{i}"], axis=2))
        nodos.append(h.make_node("Concat", [f"past_v{i}", v], [f"present_v{i}"], axis=1))
        a = N("Softmax", [N("Add", [N("MatMul", [q, f"present_k{i}"]), mascara])], axis=-1)
        x = N("Add", [x, lin(unir(N("MatMul", [a, f"present_v{i}"])), d["o"], f"l{i}o")])
        hh = ln(x, pre + ".cross_attn_ln")
        q = N("Mul", [cabezas(lin(hh, d["cq"], f"l{i}cq"), [1, 0, 2]), "qscale"])
        a = N("Softmax", [N("MatMul", [q, f"ck{i}"])], axis=-1)
        x = N("Add", [x, lin(unir(N("MatMul", [a, f"cv{i}"])), d["co"], f"l{i}co")])
        hh = ln(x, pre + ".mlp_ln")
        f1 = lin(hh, d["fc1"], f"l{i}f1")
        gelu = N("Mul", [N("Mul", [f1, "half"]), N("Add", [N("Erf", [N("Mul", [f1, "isqrt2"])]), "one"])])
        x = N("Add", [x, lin(gelu, d["fc2"], f"l{i}f2")])

    ultimo = ln(N("Gather", [x, N("Unsqueeze", [N("Sub", [n, "i1"]), "a0"])], axis=0), "textDecoder.ln")
    # el operador fusionado empaqueta los pesos al crear la sesión; con MatMulInteger
    # suelto, onnxruntime-web tarda el doble en todo el paso
    lg = N("DynamicQuantizeMatMul", [ultimo, "embT_q", "emb_scale"], domain="com.microsoft")
    nodos.append(h.make_node("Reshape", [lg, "v_shape"], ["logits"]))

    modelo = h.make_model(h.make_graph(nodos, f"whisper-{nombre}-decoder", entradas, salidas, inits),
                          opset_imports=[h.make_opsetid("", 17), h.make_opsetid("com.microsoft", 1)],
                          producer_name="construir_transcriptor")
    modelo.ir_version = 8
    return modelo


def partir(ruta, prefijo):
    datos = ruta.read_bytes()
    partes = []
    for i in range(0, len(datos), PARTE):
        p = f"{prefijo}.{i // PARTE}.wasm"
        (DESTINO / p).write_bytes(datos[i:i + PARTE])
        partes.append(p)
    return {"size": len(datos), "parts": partes}


def main():
    (DESTINO / "modelos").mkdir(parents=True, exist_ok=True)
    (DESTINO / "ort").mkdir(parents=True, exist_ok=True)
    for viejo in list((DESTINO / "modelos").glob("*.wasm")) + list((DESTINO / "ort").glob("*.wasm")):
        viejo.unlink()
    manifiesto = {"models": {}}
    tmp = Path(tempfile.mkdtemp())
    for nombre in MODELOS:
        src = descargar_sherpa(nombre)
        meta = construir_codificador(src, nombre, tmp / "enc.onnx")
        capas, emb, pos, V, D, L, W = pesos_decodificador(src, nombre)
        H = int(meta["n_text_head"])
        onnx.save(grafo_decodificador(capas, emb, pos, V, D, L, H, W, nombre), tmp / "dec32.onnx")
        quantize_dynamic(tmp / "dec32.onnx", tmp / "dec.onnx", weight_type=QuantType.QInt8,
                         per_channel=True, op_types_to_quantize=["MatMul"])
        claves = ["sot", "eot", "transcribe", "no_timestamps", "no_speech", "sot_prev",
                  "all_language_codes", "all_language_tokens", "non_speech_tokens"]
        manifiesto["models"][nombre] = {
            "config": {**{k: meta[k] for k in claves}, "n_text_layer": L, "n_text_head": H, "dh": D // H},
            "encoder": partir(tmp / "enc.onnx", f"modelos/{nombre}-encoder"),
            "decoder": partir(tmp / "dec.onnx", f"modelos/{nombre}-decoder"),
        }
        print(nombre, "codificador", manifiesto["models"][nombre]["encoder"]["size"],
              "decodificador", manifiesto["models"][nombre]["decoder"]["size"])
    shutil.copy(src / f"{MODELOS[-1]}-tokens.txt", DESTINO / "modelos" / "tokens.txt")

    # runtime: onnxruntime-web con el pegamento de emscripten incluido + su wasm
    subprocess.run(["npm", "pack", f"onnxruntime-web@{ORT_VERSION}", "--silent"], cwd=tmp, check=True)
    with tarfile.open(tmp / f"onnxruntime-web-{ORT_VERSION}.tgz") as t:
        t.extractall(tmp)
    dist = tmp / "package" / "dist"
    shutil.copy(dist / "ort.wasm.bundle.min.mjs", DESTINO / "ort" / "ort.wasm.bundle.min.mjs")
    manifiesto["wasm"] = partir(dist / "ort-wasm-simd-threaded.wasm", "ort/ort-wasm-simd-threaded")
    manifiesto["ort"] = ORT_VERSION
    (DESTINO / "modelos" / "manifest.json").write_text(json.dumps(manifiesto, indent=1))
    shutil.rmtree(tmp)


if __name__ == "__main__":
    main()
