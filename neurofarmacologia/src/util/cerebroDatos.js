// Decodifica src/datos/cerebro.bin (ver herramientas/preparar_cerebro.py).
// El binario va incrustado en el paquete como Uint8Array comprimido con gzip.
import { gunzipSync } from 'fflate';

function leerPlanos(bytes, inicio, n, nPlanos, conSigno) {
  const salida = new Int32Array(n);
  for (let p = 0; p < nPlanos; p++) {
    const base = inicio + p * n;
    const desp = 8 * p;
    for (let i = 0; i < n; i++) salida[i] |= bytes[base + i] << desp;
  }
  if (conSigno && nPlanos < 4) {
    const bits = 32 - 8 * nPlanos;
    for (let i = 0; i < n; i++) salida[i] = (salida[i] << bits) >> bits;
  }
  return salida;
}

export function decodificarCerebro(comprimido) {
  const bytes = gunzipSync(comprimido);
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magia = String.fromCharCode(...bytes.subarray(0, 4));
  if (magia !== 'NFC1') throw new Error('cerebro.bin: formato desconocido');
  const largo = vista.getUint32(4, true);
  const cab = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + largo)));
  const cuerpo = 8 + largo;
  const escala = cab.escala;
  const mallas = [];
  for (const m of cab.mallas) {
    const { nv, nt } = m;
    let o = 0;
    const off = (k) => cuerpo + m.offsets[k];
    // Posiciones: SoA en 2 planos de bytes → intercaladas xyz en mm
    const soa = leerPlanos(bytes, off(o++), nv * 3, 2, true);
    const pos = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      pos[3 * i] = soa[i] / escala;
      pos[3 * i + 1] = soa[nv + i] / escala;
      pos[3 * i + 2] = soa[2 * nv + i] / escala;
    }
    let indices = null;
    if (m.idxDe === undefined) {
      const dif = leerPlanos(bytes, off(o++), nt * 3, 4, true);
      indices = nv < 65536 ? new Uint16Array(nt * 3) : new Uint32Array(nt * 3);
      let acc = 0;
      for (let i = 0; i < dif.length; i++) { acc += dif[i]; indices[i] = acc; }
    }
    const extras = {};
    for (const nombre of m.extras) {
      const inicio = off(o++);
      if (nombre === 'sulc') extras.sulc = new Int8Array(bytes.buffer, bytes.byteOffset + inicio, nv);
      else extras[nombre] = bytes.subarray(inicio, inicio + nv);
    }
    mallas.push({ id: m.id, grupo: m.grupo, lado: m.lado, nv, nt, pos, indices, idxDe: m.idxDe, extras });
  }
  for (const m of mallas) if (!m.indices) m.indices = mallas[m.idxDe].indices;
  return mallas;
}
