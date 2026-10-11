// Visor 3D de moléculas (bolas y varillas) con la conformación de mínima
// energía calculada con RDKit (ETKDGv3 + MMFF94s).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const COLOR = { C: '#c3ccd9', H: '#f4f6fa', N: '#5b8cff', O: '#ff5d5d', S: '#ffd24d', Cl: '#3fd69b', F: '#a6f0c6', Br: '#c8743f', P: '#ff9d3d' };
const RADIO = { H: 0.25, C: 0.38, N: 0.37, O: 0.36, S: 0.48, Cl: 0.47, F: 0.33, Br: 0.52, P: 0.48 };
const GRUPO = { azul: '#4ca3ff', naranja: '#ff8f3d', rosa: '#ff5ca8', verde: '#3fd69b', violeta: '#a47bff', amarillo: '#ffd24d', turquesa: '#3dd6d0', rojo: '#ff6b5e' };

const geoEsfera = new THREE.SphereGeometry(1, 28, 20);
const geoCil = new THREE.CylinderGeometry(1, 1, 1, 14, 1);

export class Molecula3D {
  constructor(contenedor) {
    this.contenedor = contenedor;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    contenedor.appendChild(r.domElement);
    r.domElement.classList.add('lienzo-molecula');
    this.renderer = r;
    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    this.camara.position.set(0, 0, 24);
    this.escena.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a2030, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 2.2);
    d.position.set(5, 8, 10);
    this.escena.add(d);
    const d2 = new THREE.DirectionalLight(0x8fb8ff, 0.8);
    d2.position.set(-8, -3, -6);
    this.escena.add(d2);
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    this.controles = new OrbitControls(this.camara, r.domElement);
    Object.assign(this.controles, { enableDamping: true, enablePan: false, autoRotate: true, autoRotateSpeed: 1.6, minDistance: 8, maxDistance: 60 });
    new ResizeObserver(() => this._ajustar()).observe(contenedor);
    this._ajustar();
    this.visible = true;
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(contenedor);
    const bucle = () => {
      if (this.muerto) return;
      requestAnimationFrame(bucle);
      if (!this.visible || document.hidden) return;
      this.controles.update();
      this.renderer.render(this.escena, this.camara);
    };
    bucle();
  }

  _ajustar() {
    const w = this.contenedor.clientWidth || 1, h = this.contenedor.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
  }

  mostrar(mol, { hidrogenos = true, grupo = null } = {}) {
    this.mol = mol;
    this.opciones = { hidrogenos, grupo };
    for (const o of [...this.grupo.children]) { this.grupo.remove(o); o.material?.dispose?.(); }
    if (!mol) return;
    const resaltados = new Map();
    if (grupo !== null && mol.grupos[grupo]) for (const i of mol.grupos[grupo].atomos) resaltados.set(i, GRUPO[mol.grupos[grupo].color]);
    const pos = mol.atomos.map(([, x, y, z]) => new THREE.Vector3(x, y, z));
    const visible = mol.atomos.map(([el]) => hidrogenos || el !== 'H');
    // hidrógenos unidos a átomos resaltados también se resaltan
    for (const [a, b] of mol.enlaces) {
      if (mol.atomos[a][0] === 'H' && resaltados.has(b)) resaltados.set(a, resaltados.get(b));
      if (mol.atomos[b][0] === 'H' && resaltados.has(a)) resaltados.set(b, resaltados.get(a));
    }
    const mats = {};
    const mat = (el, res) => {
      const k = el + (res || '');
      if (!mats[k]) {
        mats[k] = new THREE.MeshStandardMaterial({
          color: COLOR[el] || '#ff66cc', roughness: 0.35, metalness: 0.05,
          emissive: res ? new THREE.Color(res) : new THREE.Color(0x000000), emissiveIntensity: res ? 0.75 : 0,
        });
      }
      return mats[k];
    };
    mol.atomos.forEach(([el], i) => {
      if (!visible[i]) return;
      const m = new THREE.Mesh(geoEsfera, mat(el, resaltados.get(i)));
      m.position.copy(pos[i]);
      m.scale.setScalar(RADIO[el] || 0.4);
      this.grupo.add(m);
    });
    const matEnlace = new THREE.MeshStandardMaterial({ color: '#8d98ab', roughness: 0.5 });
    const eje = new THREE.Vector3(0, 1, 0);
    for (const [a, b, orden] of mol.enlaces) {
      if (!visible[a] || !visible[b]) continue;
      const pa = pos[a], pb = pos[b];
      const dir = new THREE.Vector3().subVectors(pb, pa);
      const L = dir.length();
      const q = new THREE.Quaternion().setFromUnitVectors(eje, dir.clone().normalize());
      const perp = new THREE.Vector3(1, 0, 0).applyQuaternion(q).multiplyScalar(0.12);
      const n = orden === 2 ? 2 : orden === 3 ? 3 : 1;
      const offs = n === 1 ? [0] : n === 2 ? [-1, 1] : [-1.4, 0, 1.4];
      const rad = n === 1 ? (orden === 1.5 ? 0.1 : 0.085) : 0.055;
      const res = resaltados.has(a) && resaltados.has(b) ? resaltados.get(a) : null;
      for (const o of offs) {
        const c = new THREE.Mesh(geoCil, res ? mat('C', res) : matEnlace);
        c.position.copy(pa).add(pb).multiplyScalar(0.5).addScaledVector(perp, o);
        c.quaternion.copy(q);
        c.scale.set(rad, L, rad);
        this.grupo.add(c);
      }
    }
    // encuadre según el tamaño
    let rmax = 1;
    pos.forEach((p, i) => { if (visible[i]) rmax = Math.max(rmax, p.length()); });
    const dist = rmax / Math.tan((15 * Math.PI) / 180) * 1.12 + 2;
    this.camara.position.setLength(dist);
    this.controles.minDistance = dist * 0.4;
    this.controles.maxDistance = dist * 2.5;
  }

  giro(on) { this.controles.autoRotate = on; }

  destruir() {
    this.muerto = true;
    this.controles.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}
