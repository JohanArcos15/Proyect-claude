// Cerebro 3D en tiempo real (Three.js).
// - Corteza real fsaverage6 con sombreado por profundidad de surcos, modo
//   «cristal» (fresnel) o «tejido», y un mapa de actividad por zonas.
// - Estructuras profundas reales (Harvard-Oxford), tronco, cerebelo, médula.
// - Núcleos del tronco/hipotálamo, vías de neurotransmisores con partículas
//   que fluyen, sitios de unión del fármaco y crisis epilépticas que se
//   propagan desde un foco.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import cerebroBin from '../datos/cerebro.bin';
import { decodificarCerebro } from '../util/cerebroDatos.js';
import { DESIKAN, ZONAS, NOMBRE_ZONA, ESTRUCTURAS, NUCLEOS, VIAS, MEDULA, NERVIO } from '../datos/anatomia.js';
import { NT } from '../datos/neurotransmisores.js';

const CENTRO = [0, -22, 4];
// MNI (x der, y ant, z sup) → Three (x, y arriba, z hacia el observador)
export function mni(x, y, z) {
  return new THREE.Vector3(x - CENTRO[0], z - CENTRO[2], -(y - CENTRO[1]));
}

const RUIDO_GLSL = /* glsl */`
  float hash3(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float ruido(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash3(i+vec3(0,0,0)),hash3(i+vec3(1,0,0)),f.x),
                   mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
                   mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }`;

const VERT_CORTEZA = /* glsl */`
  attribute float sulc;
  attribute float zona;
  varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vSulc; varying float vZona;
  void main(){
    vSulc = sulc; vZona = zona; vP = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz; vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG_CORTEZA = /* glsl */`
  uniform float uT, uCristal, uOpac, uAct, uRitmo, uCrisis, uFrente, uFrecCrisis, uSinc, uAtenuar;
  uniform vec3 uFoco, uGiro, uSurco, uBorde, uColorCrisis;
  uniform sampler2D uZonas;
  varying vec3 vN; varying vec3 vV; varying vec3 vP; varying float vSulc; varying float vZona;
  ${RUIDO_GLSL}
  void main(){
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    if (!gl_FrontFacing) n = -n;
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.4);
    float prof = smoothstep(-0.25, 0.55, vSulc);
    vec3 base = mix(uGiro, uSurco, prof);
    vec3 L = normalize(vec3(0.35, 0.75, 0.55));
    float dif = 0.38 + 0.62 * max(dot(n, L), 0.0);
    float cielo = 0.5 + 0.5 * n.y;
    vec3 col = base * (dif * 0.85 + cielo * 0.25);
    float esp = pow(max(dot(reflect(-L, n), v), 0.0), 28.0) * (1.0 - prof) * 0.22;
    col += esp;
    // actividad por zonas
    vec4 z = texture2D(uZonas, vec2((vZona + 0.5) / 32.0, 0.5));
    float t = uT * uRitmo;
    float chispa = ruido(vP * 0.42 + vec3(0.0, t * 1.7, t * 0.9));
    chispa = smoothstep(0.58, 0.92, chispa) * 1.4 + 0.25 * ruido(vP * 0.12 + t * 0.35);
    float act = z.a * uAct;
    vec3 emis = z.rgb * act * (0.25 + chispa) * (1.0 - 0.55 * prof);
    // crisis epiléptica que avanza desde un foco
    float d = distance(vP, uFoco);
    float dentro = 1.0 - smoothstep(uFrente - 10.0, uFrente, d);
    float pulso = pow(0.5 + 0.5 * sin(uT * 6.2831853 * uFrecCrisis - d * 0.06 * (1.0 - uSinc)), 3.0);
    float caos = ruido(vP * 0.3 + uT * 4.0);
    float crisis = uCrisis * dentro * (0.35 + 0.9 * mix(caos, pulso, 0.55 + 0.45 * uSinc));
    emis += uColorCrisis * crisis;
    float a;
    if (uCristal > 0.5) {
      col = mix(col * 0.30, uBorde, fres * 0.85);
      a = (0.07 + 0.82 * fres) * uOpac;
      a = max(a, min(length(emis), 1.0) * 0.85 * uOpac);
    } else {
      a = uOpac;
      col = mix(col, uBorde, fres * 0.22);
    }
    col *= (1.0 - 0.6 * uAtenuar);
    gl_FragColor = vec4(col + emis, a);
  }`;

const VERT_SOLIDO = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vP = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz; vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG_SOLIDO = /* glsl */`
  uniform vec3 uColor; uniform float uBrillo, uOpac, uT, uPulso, uFolia, uCrisis, uAlerta;
  uniform vec3 uColorCrisis;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  ${RUIDO_GLSL}
  void main(){
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    float ndv = clamp(dot(n, v), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.0);
    vec3 L = normalize(vec3(0.35, 0.75, 0.55));
    float dif = 0.35 + 0.65 * max(dot(n, L), 0.0);
    float folia = 1.0;
    if (uFolia > 0.5) folia = 0.78 + 0.22 * smoothstep(-0.6, 0.6, sin(length(vP.yz - vec2(-10.0, 32.0)) * 1.15 + ruido(vP * 0.25) * 2.0));
    vec3 col = uColor * dif * folia * 0.5 + uColor * fres * 0.42;
    float latido = 0.75 + 0.25 * sin(uT * 3.0 * uPulso);
    col += uColor * uBrillo * (0.55 * latido + fres * 0.9);
    col += uColorCrisis * uCrisis * (0.5 + 0.5 * ruido(vP * 0.4 + uT * 5.0));
    col = mix(col, vec3(1.0, 0.25, 0.3) * (0.7 + 0.6 * (0.5 + 0.5 * sin(uT * 7.0))), uAlerta * 0.85);
    gl_FragColor = vec4(col, uOpac);
  }`;

const VERT_PUNTOS = /* glsl */`
  attribute float alfa; attribute vec3 color; attribute float tam;
  varying float vA; varying vec3 vC;
  uniform float uEscala;
  void main(){
    vA = alfa; vC = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = tam * uEscala / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG_PUNTOS = /* glsl */`
  varying float vA; varying vec3 vC;
  void main(){
    vec2 c = gl_PointCoord - 0.5; float r = length(c);
    if (r > 0.5) discard;
    float nucleo = smoothstep(0.22, 0.0, r);
    float halo = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(vC * (nucleo * 1.6 + halo * 0.6), (halo * 0.7 + nucleo) * vA);
  }`;

// Vistas de cámara: dirección desde el objetivo (MNI), distancia en mm
const VISTAS = {
  general: { dir: [-1, 0.85, 0.55], dist: 400, obj: [0, -22, -6] },
  lateralIzq: { dir: [-1, 0.02, 0.08], dist: 370, obj: [0, -22, 0] },
  lateralDer: { dir: [1, 0.02, 0.08], dist: 370, obj: [0, -22, 0] },
  medial: { dir: [-1, 0.05, 0.05], dist: 320, obj: [4, -22, -12], ocultarIzq: true },
  superior: { dir: [0, -0.02, 1], dist: 380, obj: [0, -18, 10], arriba: [0, 1, 0] },
  frontal: { dir: [0, 1, 0.12], dist: 380, obj: [0, -20, 0] },
  inferior: { dir: [-0.15, 0.25, -1], dist: 360, obj: [0, -20, -10] },
  tronco: { dir: [-0.62, -0.75, 0.05], dist: 300, obj: [0, -38, -46] },
  medula: { dir: [-0.85, -0.42, 0.16], dist: 540, obj: [12, -40, -52] },
  profundo: { dir: [-0.9, 0.62, 0.45], dist: 250, obj: [0, -14, -4] },
  hipotalamo: { dir: [-1, 0.42, -0.1], dist: 200, obj: [2, -8, -14], ocultarIzq: true },
  talamo: { dir: [-0.9, 0.5, 0.55], dist: 260, obj: [0, -18, 2] },
  temporal: { dir: [-1, 0.25, -0.15], dist: 320, obj: [-18, -20, -8] },
};

function suaviza(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
const tmpColor = new THREE.Color();

export class Cerebro3D {
  constructor(contenedor, { alInteractuar } = {}) {
    this.contenedor = contenedor;
    this.alInteractuar = alInteractuar;
    this.reloj = new THREE.Clock();
    this.t = 0;
    this.objetivo = { actividad: 1, ritmo: 1, crisis: 0, frente: 0, sinc: 0, frecCrisis: 3 };
    this.actual = { ...this.objetivo };
    this._crearRender();
    this._crearEscena();
    this._crearCorteza();
    this._crearProfundas();
    this._crearNucleos();
    this._crearVias();
    this._crearDianas();
    this._crearInteraccion();
    this._ajustar();
    this.vista('general', true);
    this._bucle = this._bucle.bind(this);
    this._visible = true;
    new IntersectionObserver(([e]) => { this._visible = e.isIntersecting; }).observe(contenedor);
    requestAnimationFrame(this._bucle);
  }

  _crearRender() {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.setClearColor(new THREE.Color(0x070b13).convertSRGBToLinear(), 1);
    this.renderer = r;
    this.contenedor.appendChild(r.domElement);
    r.domElement.classList.add('lienzo3d');
    r.domElement.setAttribute('aria-label', 'Cerebro en 3D: arrastra para girar, rueda o pellizca para acercar');
    r.domElement.setAttribute('role', 'img');
    this.etiquetas = new CSS2DRenderer();
    this.etiquetas.domElement.className = 'capa-etiquetas';
    this.contenedor.appendChild(this.etiquetas.domElement);
  }

  _crearEscena() {
    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(32, 1, 5, 3000);
    this.controles = new OrbitControls(this.camara, this.renderer.domElement);
    Object.assign(this.controles, { enableDamping: true, dampingFactor: 0.08, minDistance: 70, maxDistance: 620, enablePan: true, panSpeed: 0.6, rotateSpeed: 0.7 });
    this.controles.addEventListener('start', () => { this.tween = null; this._usuarioMovio = true; });
    this.grupo = new THREE.Group();
    this.escena.add(this.grupo);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.escena, this.camara));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.75, 0.5, 0.62);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this._ajustar();
    new ResizeObserver(() => this._ajustar()).observe(this.contenedor);
  }

  _ajustar() {
    const w = Math.max(1, this.contenedor.clientWidth), h = Math.max(1, this.contenedor.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.etiquetas.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camara.aspect = w / h;
    // en pantallas estrechas se aleja la cámara para que quepa todo
    this.camara.zoom = Math.min(1, (w / h) / 1.15) * 0.92 + 0.08;
    this.camara.updateProjectionMatrix();
    if (this.puntosMat) this.puntosMat.uniforms.uEscala.value = h * 1.4;
    if (this.dianasMat) this.dianasMat.uniforms.uEscala.value = h * 1.4;
  }

  _crearCorteza() {
    const mallas = decodificarCerebro(cerebroBin);
    this.mallas = mallas;
    const texZonas = new Uint8Array(32 * 4);
    this.texZonasDatos = texZonas;
    this.texZonas = new THREE.DataTexture(texZonas, 32, 1, THREE.RGBAFormat);
    this.texZonas.needsUpdate = true;
    this.zonaObjetivo = new Float32Array(32 * 4);
    this.zonaActual = new Float32Array(32 * 4);
    this.matCorteza = new THREE.ShaderMaterial({
      vertexShader: VERT_CORTEZA, fragmentShader: FRAG_CORTEZA, transparent: true, depthWrite: false,
      uniforms: {
        uT: { value: 0 }, uCristal: { value: 1 }, uOpac: { value: 1 }, uAct: { value: 1 }, uRitmo: { value: 1 },
        uCrisis: { value: 0 }, uFrente: { value: 0 }, uFrecCrisis: { value: 3 }, uSinc: { value: 0 }, uAtenuar: { value: 0 },
        uFoco: { value: mni(...NUCLEOS.foco.pos) },
        uGiro: { value: new THREE.Color('#d9c3c0') }, uSurco: { value: new THREE.Color('#7d5f68') },
        uBorde: { value: new THREE.Color('#8fb8ff') }, uColorCrisis: { value: new THREE.Color('#ffd28a') },
        uZonas: { value: this.texZonas },
      },
    });
    this.hemis = {};
    this.verticesPorZona = {};
    for (const m of mallas.filter((x) => x.grupo === 'corteza')) {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(m.nv * 3);
      const sulc = new Float32Array(m.nv);
      const zona = new Float32Array(m.nv);
      const lado = m.lado === 'L' ? 0 : 1;
      for (let i = 0; i < m.nv; i++) {
        const v = mni(m.pos[3 * i], m.pos[3 * i + 1], m.pos[3 * i + 2]);
        pos[3 * i] = v.x; pos[3 * i + 1] = v.y; pos[3 * i + 2] = v.z;
        sulc[i] = m.extras.sulc[i] / 127 * 2.0;
        const dk = m.extras.region[i];
        const zi = ZONAS.indexOf(DESIKAN[dk]?.[2] ?? 'medial');
        zona[i] = zi + lado * 16;
        if (i % 7 === 0 && zi > 0) {
          const clave = ZONAS[zi] + (lado ? 'R' : 'L');
          (this.verticesPorZona[clave] ||= []).push(v);
        }
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('sulc', new THREE.BufferAttribute(sulc, 1));
      g.setAttribute('zona', new THREE.BufferAttribute(zona, 1));
      g.setIndex(new THREE.BufferAttribute(m.indices, 1));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const malla = new THREE.Mesh(g, this.matCorteza);
      malla.renderOrder = 10;
      malla.userData = { tipo: 'corteza', lado: m.lado, region: m.extras.region };
      this.grupo.add(malla);
      this.hemis[m.lado] = malla;
    }
  }

  _matSolido(color, extra = {}) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT_SOLIDO, fragmentShader: FRAG_SOLIDO, transparent: true,
      uniforms: {
        uColor: { value: new THREE.Color(color) }, uBrillo: { value: 0 }, uOpac: { value: 1 }, uT: { value: 0 },
        uPulso: { value: 1 }, uFolia: { value: extra.folia ? 1 : 0 }, uCrisis: { value: 0 }, uAlerta: { value: 0 },
        uColorCrisis: { value: new THREE.Color('#ffd28a') },
      },
    });
  }

  _crearProfundas() {
    this.estructuras = {};
    const agregar = (id, geo, lado) => {
      const info = ESTRUCTURAS[id];
      const mat = this._matSolido(info.color, { folia: id === 'cerebelo' });
      const malla = new THREE.Mesh(geo, mat);
      malla.userData = { tipo: 'estructura', id, lado };
      malla.renderOrder = id === 'ventriculo' ? 1 : 2;
      this.grupo.add(malla);
      const e = (this.estructuras[id] ||= { mallas: [], brillo: 0, objetivoBrillo: 0, opac: 1, objetivoOpac: 1, crisis: 0, objetivoCrisis: 0, alerta: 0, objetivoAlerta: 0 });
      e.mallas.push(malla);
      return malla;
    };
    for (const m of this.mallas.filter((x) => x.grupo !== 'corteza')) {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(m.nv * 3);
      for (let i = 0; i < m.nv; i++) {
        const v = mni(m.pos[3 * i], m.pos[3 * i + 1], m.pos[3 * i + 2]);
        pos[3 * i] = v.x; pos[3 * i + 1] = v.y; pos[3 * i + 2] = v.z;
      }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(m.indices, 1));
      g.computeVertexNormals();
      agregar(m.id, g, m.lado);
    }
    // Médula espinal: tubo que se afina
    const curvaMedula = new THREE.CatmullRomCurve3(MEDULA.map((p) => mni(...p)));
    const geoMed = new THREE.TubeGeometry(curvaMedula, 48, 5.2, 20, false);
    const pm = geoMed.attributes.position;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pm.count; i++) {
      tmp.fromBufferAttribute(pm, i);
      const u = Math.floor(i / 21) / 48;
      const c = curvaMedula.getPointAt(Math.min(u, 1));
      tmp.sub(c).multiplyScalar(1 - 0.28 * u).add(c);
      pm.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    geoMed.computeVertexNormals();
    agregar('medula', geoMed, 'C');
    // Nervio periférico
    const curvaNervio = new THREE.CatmullRomCurve3(NERVIO.map((p) => mni(...p)));
    agregar('nervio', new THREE.TubeGeometry(curvaNervio, 40, 1.6, 10, false), 'C');
    this.curvaNervio = curvaNervio;
    // Hipotálamo e hipófisis (elipsoides)
    for (const lado of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16));
      h.geometry.scale(4.2, 4.0, 6.5);
      h.geometry.translate(...mni(4.5 * lado, -4, -10).toArray());
      agregar('hipotalamo', h.geometry, lado < 0 ? 'L' : 'R');
    }
    const hip = new THREE.SphereGeometry(1, 24, 16);
    hip.scale(5.5, 4.2, 5);
    hip.translate(...mni(0, 2, -32).toArray());
    agregar('hipofisis', hip, 'C');
    const tallo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([mni(0, -4, -15), mni(0, 0, -23), mni(0, 2, -29)]), 12, 1.1, 8);
    agregar('hipofisis', tallo, 'C');
    this.estructuras.ventriculo.mallas.forEach((m) => { m.material.uniforms.uOpac.value = 0.5; });
    this.estructuras.ventriculo.objetivoOpac = 0.5;
    this.estructuras.ventriculo.opac = 0.5;
    this.estructuras.ventriculo.base = 0.5;
  }

  _crearNucleos() {
    this.nucleos = {};
    const geo = new THREE.SphereGeometry(2.1, 20, 14);
    for (const [id, n] of Object.entries(NUCLEOS)) {
      const color = NT[n.nt]?.color ?? '#ffffff';
      const lados = n.bilateral ? [-1, 1] : [1];
      const grupo = new THREE.Group();
      grupo.userData = { id };
      for (const s of lados) {
        const mat = this._matSolido(color);
        const esfera = new THREE.Mesh(geo, mat);
        esfera.position.copy(mni(n.pos[0] * s, n.pos[1], n.pos[2]));
        esfera.userData = { tipo: 'nucleo', id };
        esfera.renderOrder = 20;
        mat.depthTest = false;
        grupo.add(esfera);
      }
      grupo.visible = false;
      this.grupo.add(grupo);
      this.nucleos[id] = { grupo, brillo: 0, objetivoBrillo: 0, visible: 0, objetivoVisible: 0, alerta: 0, objetivoAlerta: 0, color: new THREE.Color(color) };
    }
  }

  _crearVias() {
    this.vias = {};
    const posiciones = [];
    const colores = [];
    const alfas = [];
    const tams = [];
    this.particulas = [];
    for (const [id, via] of Object.entries(VIAS)) {
      const color = new THREE.Color(NT[via.nt].color);
      const lados = via.bilateral ? [-1, 1] : [1];
      const grupo = new THREE.Group();
      grupo.visible = false;
      const curvas = [];
      for (const s of lados) {
        for (const rama of via.ramas) {
          const curva = new THREE.CatmullRomCurve3(rama.map((p) => mni(p[0] * s, p[1], p[2])), false, 'centripetal');
          curvas.push(curva);
          const tubo = new THREE.Mesh(
            new THREE.TubeGeometry(curva, Math.max(16, rama.length * 12), 0.55, 8, false),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }),
          );
          tubo.renderOrder = 4;
          grupo.add(tubo);
        }
      }
      this.grupo.add(grupo);
      const muestras = curvas.map((c) => c.getSpacedPoints(120));
      const largos = curvas.map((c) => c.getLength());
      const v = { id, grupo, curvas, muestras, largos, nivel: 0, objetivo: 0, bloqueo: 0, objetivoBloqueo: 0, primera: posiciones.length / 3 };
      for (let ci = 0; ci < curvas.length; ci++) {
        const n = Math.max(3, Math.round(largos[ci] / 5));
        for (let k = 0; k < n; k++) {
          this.particulas.push({ via: v, curva: ci, u: Math.random(), vel: 0.8 + Math.random() * 0.5 });
          posiciones.push(0, 0, 0); colores.push(color.r, color.g, color.b); alfas.push(0); tams.push(3.2 + Math.random() * 1.6);
        }
      }
      v.ultima = posiciones.length / 3;
      this.vias[id] = v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
    g.setAttribute('alfa', new THREE.Float32BufferAttribute(alfas, 1));
    g.setAttribute('tam', new THREE.Float32BufferAttribute(tams, 1));
    this.puntosMat = new THREE.ShaderMaterial({
      vertexShader: VERT_PUNTOS, fragmentShader: FRAG_PUNTOS, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, uniforms: { uEscala: { value: 800 } },
    });
    this.puntos = new THREE.Points(g, this.puntosMat);
    this.puntos.renderOrder = 5;
    this.puntos.frustumCulled = false;
    this.grupo.add(this.puntos);
  }

  _crearDianas() {
    // Sitios de unión del fármaco: destellos que se acumulan en las regiones
    const N = 700;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(1), 3));
    g.setAttribute('alfa', new THREE.Float32BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('tam', new THREE.Float32BufferAttribute(new Float32Array(N).map(() => 2.4 + Math.random() * 2.2), 1));
    this.dianasMat = this.puntosMat.clone();
    this.dianasMat.uniforms = { uEscala: { value: 800 } };
    this.dianas = new THREE.Points(g, this.dianasMat);
    this.dianas.renderOrder = 6;
    this.dianas.frustumCulled = false;
    this.grupo.add(this.dianas);
    this.dianasDatos = Array.from({ length: N }, () => ({ base: new THREE.Vector3(), fase: Math.random() * 6.28, activa: false, a: 0 }));
    this.dianasNivel = 0;
    this.dianasObjetivo = 0;
  }

  _puntoEnEstructura(id) {
    // punto aleatorio de la superficie (vértice) de una estructura, núcleo o zona cortical
    if (this.nucleos[id]) {
      const hijos = this.nucleos[id].grupo.children;
      const e = hijos[Math.floor(Math.random() * hijos.length)];
      return e.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 4.5));
    }
    if (this.estructuras[id]) {
      const mallas = this.estructuras[id].mallas;
      const m = mallas[Math.floor(Math.random() * mallas.length)];
      const p = m.geometry.attributes.position;
      const i = Math.floor(Math.random() * p.count);
      return new THREE.Vector3().fromBufferAttribute(p, i);
    }
    const lista = this.verticesPorZona[id] || [...(this.verticesPorZona[id + 'L'] || []), ...(this.verticesPorZona[id + 'R'] || [])];
    if (lista.length) return lista[Math.floor(Math.random() * lista.length)].clone();
    return null;
  }

  _crearInteraccion() {
    this.ray = new THREE.Raycaster();
    this.puntero = new THREE.Vector2();
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip3d';
    this.tooltip.hidden = true;
    this.contenedor.appendChild(this.tooltip);
    let pendiente = null;
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this._posTooltip = [e.clientX - r.left, e.clientY - r.top];
      if (!pendiente) pendiente = setTimeout(() => { pendiente = null; this._sondear(); }, 70);
    });
    el.addEventListener('pointerleave', () => { this.tooltip.hidden = true; });
    el.addEventListener('click', () => {
      const hit = this._sondear();
      if (hit && this.alInteractuar) this.alInteractuar(hit);
    });
  }

  _sondear() {
    this.ray.setFromCamera(this.puntero, this.camara);
    const objetos = [];
    for (const e of Object.values(this.estructuras)) for (const m of e.mallas) if (m.visible && e.opac > 0.2) objetos.push(m);
    for (const n of Object.values(this.nucleos)) if (n.grupo.visible) objetos.push(...n.grupo.children);
    let hits = this.ray.intersectObjects(objetos, false);
    let info = null;
    const corteza = [this.hemis.L, this.hemis.R].filter((h) => h.visible);
    const hc = this.ray.intersectObjects(corteza, false)[0];
    // en modo cristal se prefieren las estructuras profundas
    const prof = hits[0];
    if (prof && (this.modoCorteza !== 'tejido' || !hc || prof.distance < hc.distance)) {
      const d = prof.object.userData;
      if (d.tipo === 'nucleo') info = { id: d.id, ...NUCLEOS[d.id], tipo: 'nucleo' };
      else info = { id: d.id, ...ESTRUCTURAS[d.id], tipo: 'estructura' };
    } else if (hc) {
      const reg = hc.object.userData.region;
      const vi = hc.face.a;
      const dk = DESIKAN[reg[vi]] || DESIKAN[0];
      info = { id: dk[2], nombre: dk[1], tipo: 'corteza', funcion: NOMBRE_ZONA[dk[2]], lado: hc.object.userData.lado };
    }
    if (info && info.nombre && info.id !== 'medial') {
      this.tooltip.hidden = false;
      const lado = info.lado ? (info.lado === 'L' ? ' · hemisferio izquierdo' : ' · hemisferio derecho') : '';
      this.tooltip.innerHTML = `<strong>${info.nombre}</strong><span>${info.tipo === 'corteza' ? info.funcion + lado : (info.funcion || '')}</span>`;
      const [x, y] = this._posTooltip || [0, 0];
      const w = this.contenedor.clientWidth;
      this.tooltip.style.left = Math.min(x + 14, w - 260) + 'px';
      this.tooltip.style.top = (y + 16) + 'px';
    } else this.tooltip.hidden = true;
    return info;
  }

  // ---- API pública ---------------------------------------------------------
  vista(nombre, inmediata = false) {
    const v = VISTAS[nombre] || VISTAS.general;
    this.vistaActual = nombre;
    const obj = mni(...v.obj);
    const d = new THREE.Vector3(v.dir[0], v.dir[2], -v.dir[1]).normalize();
    const pos = obj.clone().addScaledVector(d, v.dist);
    this.ocultarIzq = !!v.ocultarIzq;
    if (inmediata) {
      this.camara.position.copy(pos);
      this.controles.target.copy(obj);
      this.camara.up.set(...(v.arriba || [0, 1, 0]));
      this.controles.update();
      this.tween = null;
    } else {
      this.tween = { t: 0, dur: 1.6, p0: this.camara.position.clone(), o0: this.controles.target.clone(), p1: pos, o1: obj };
    }
  }

  // Configura la escena completa con transiciones suaves
  aplicar(cfg = {}) {
    if (cfg.vista && (cfg.vista !== this.vistaActual || cfg.forzarVista)) this.vista(cfg.vista);
    this.modoCorteza = cfg.corteza || 'cristal';
    this.matCorteza.uniforms.uCristal.value = this.modoCorteza === 'tejido' ? 0 : 1;
    this.matCorteza.depthWrite = this.modoCorteza === 'tejido';
    this.ocultarIzq = cfg.ocultarIzq ?? (VISTAS[cfg.vista]?.ocultarIzq || false);

    const resaltar = new Set(cfg.resaltar || []);
    this.resaltados = resaltar;
    const intensidad = cfg.intensidad || {};
    const alertas = cfg.alertas || {};
    for (const [id, e] of Object.entries(this.estructuras)) {
      e.objetivoBrillo = resaltar.has(id) ? (intensidad[id] ?? 1) : 0;
      e.objetivoAlerta = alertas[id] || 0;
      const base = e.base ?? 1;
      const hayInternos = Object.keys(cfg.vias || {}).length || (cfg.nucleos || []).length || [...resaltar].some((r) => NUCLEOS[r]);
      if (resaltar.has(id)) e.objetivoOpac = hayInternos ? 0.8 : base;
      else if (hayInternos) e.objetivoOpac = Math.min(base, ['cerebelo', 'medula'].includes(id) ? 0.4 : 0.22);
      else if (resaltar.size) e.objetivoOpac = base * 0.5;
      else e.objetivoOpac = base;
      if (cfg.ocultar?.includes(id)) e.objetivoOpac = 0;
      e.objetivoCrisis = 0;
    }
    for (const [id, n] of Object.entries(this.nucleos)) {
      const mostrar = resaltar.has(id) || (cfg.nucleos || []).includes(id);
      n.objetivoVisible = mostrar || alertas[id] ? 1 : 0;
      n.objetivoBrillo = resaltar.has(id) ? (intensidad[id] ?? 1) : 0.25;
      n.objetivoAlerta = alertas[id] || 0;
    }
    for (const [id, v] of Object.entries(this.vias)) {
      const nivel = cfg.vias?.[id];
      v.objetivo = nivel === undefined ? 0 : nivel;
      const b = Array.isArray(cfg.viasBloqueadas) ? (cfg.viasBloqueadas.includes(id) ? { u: 0.8, nivel: 1 } : null) : cfg.viasBloqueadas?.[id];
      v.objetivoBloqueo = b ? b.nivel ?? 1 : 0;
      v.uBloqueo = b ? b.u ?? 0.8 : v.uBloqueo ?? 0.8;
    }
    // Actividad cortical por zonas: { zona: [color, intensidad] }
    this.zonaObjetivo.fill(0);
    const zonas = cfg.zonas || {};
    for (const [clave, [color, inten]] of Object.entries(zonas)) {
      const lados = clave.endsWith('L') ? [0] : clave.endsWith('R') ? [1] : [0, 1];
      const zona = clave.replace(/[LR]$/, '');
      const zi = clave === 'todas' ? -1 : ZONAS.indexOf(zona);
      tmpColor.set(color);
      for (const lado of lados) {
        const indices = zi < 0 ? ZONAS.map((_, i) => i).slice(1) : [zi];
        for (const i of indices) {
          const k = (i + lado * 16) * 4;
          this.zonaObjetivo[k] = tmpColor.r; this.zonaObjetivo[k + 1] = tmpColor.g; this.zonaObjetivo[k + 2] = tmpColor.b;
          this.zonaObjetivo[k + 3] = inten;
        }
      }
    }
    this.objetivo.actividad = cfg.actividad ?? 1;
    this.objetivo.ritmo = cfg.ritmo ?? 1;
    const cr = cfg.crisis;
    this.objetivo.crisis = cr ? (cr.intensidad ?? 1) : 0;
    this.objetivo.frente = cr ? (cr.extension ?? 1) * 260 : 0;
    this.objetivo.sinc = cr ? (cr.tipo === 'focal' ? 0 : 1) : 0;
    this.objetivo.frecCrisis = cr?.frecuencia ?? 3;
    if (cr) {
      this.matCorteza.uniforms.uFoco.value.copy(cr.tipo === 'focal' ? mni(...NUCLEOS.foco.pos) : mni(0, -20, 6));
      if (cr.tipo === 'focal' && (cr.extension ?? 1) < 0.2) this.actual.frente = Math.min(this.actual.frente, 30);
      for (const id of cr.estructuras || []) if (this.estructuras[id]) this.estructuras[id].objetivoCrisis = cr.intensidad ?? 1;
    }
    // Sitios de unión
    this._configurarDianas(cfg.dianas);
  }

  _configurarDianas(d) {
    const firma = d ? d.ids.join(',') + '|' + d.color : '';
    if (firma !== this._firmaDianas) {
      this._firmaDianas = firma;
      const col = this.dianas.geometry.attributes.color;
      tmpColor.set(d?.color || '#ffffff');
      const ids = d?.ids || [];
      this.dianasDatos.forEach((p, i) => {
        if (!ids.length) { p.activa = false; return; }
        const id = ids[i % ids.length];
        const punto = this._puntoEnEstructura(id);
        p.activa = !!punto;
        if (punto) p.base.copy(punto);
        p.a = 0;
        col.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      });
      col.needsUpdate = true;
    }
    this.dianasObjetivo = d ? (d.nivel ?? 1) : 0;
  }

  _bucle() {
    requestAnimationFrame(this._bucle);
    const dt = Math.min(this.reloj.getDelta(), 0.05);
    if (!this._visible || document.hidden || this.pausado) return;
    this.t += dt;
    const k = 1 - Math.exp(-dt * 2.2);
    const lento = 1 - Math.exp(-dt * 0.9);
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.dur;
      const s = suaviza(Math.min(tw.t, 1));
      this.camara.position.lerpVectors(tw.p0, tw.p1, s);
      // arco: se aleja un poco a mitad de camino para no atravesar el cerebro
      const mitad = Math.sin(Math.PI * s);
      if (mitad > 0) this.camara.position.multiplyScalar(1 + 0.12 * mitad);
      this.controles.target.lerpVectors(tw.o0, tw.o1, s);
      if (tw.t >= 1) this.tween = null;
    }
    this.controles.update();
    // interpolaciones
    for (const c of ['actividad', 'ritmo', 'crisis', 'sinc', 'frecCrisis']) this.actual[c] += (this.objetivo[c] - this.actual[c]) * k;
    this.actual.frente += (this.objetivo.frente - this.actual.frente) * lento * 0.6;
    const u = this.matCorteza.uniforms;
    u.uT.value = this.t;
    u.uAct.value = this.actual.actividad;
    u.uRitmo.value = this.actual.ritmo;
    u.uCrisis.value = this.actual.crisis;
    u.uFrente.value = this.actual.frente;
    u.uSinc.value = this.actual.sinc;
    u.uFrecCrisis.value = this.actual.frecCrisis;
    let cambio = false;
    for (let i = 0; i < this.zonaActual.length; i++) {
      const d = this.zonaObjetivo[i] - this.zonaActual[i];
      if (Math.abs(d) > 0.002) { this.zonaActual[i] += d * k; cambio = true; }
    }
    if (cambio) {
      for (let i = 0; i < this.zonaActual.length; i++) this.texZonasDatos[i] = Math.max(0, Math.min(255, this.zonaActual[i] * (i % 4 === 3 ? 120 : 255)));
      this.texZonas.needsUpdate = true;
    }
    const izqVisible = !this.ocultarIzq;
    this.hemis.L.visible = izqVisible;
    for (const [id, e] of Object.entries(this.estructuras)) {
      e.brillo += (e.objetivoBrillo - e.brillo) * k;
      e.opac += (e.objetivoOpac - e.opac) * k;
      e.crisis += (e.objetivoCrisis - e.crisis) * k;
      e.alerta += ((e.objetivoAlerta || 0) - e.alerta) * k;
      for (const m of e.mallas) {
        m.material.uniforms.uAlerta.value = e.alerta;
        m.material.uniforms.uBrillo.value = e.brillo * 0.55;
        m.material.uniforms.uOpac.value = e.opac;
        m.material.uniforms.uT.value = this.t;
        m.material.uniforms.uCrisis.value = e.crisis * this.actual.crisis;
        m.visible = e.opac > 0.02 && !(this.ocultarIzq && m.userData.lado === 'L');
        m.material.depthWrite = e.opac > 0.95;
      }
    }
    for (const n of Object.values(this.nucleos)) {
      n.visible += (n.objetivoVisible - n.visible) * k;
      n.brillo += (n.objetivoBrillo - n.brillo) * k;
      n.alerta += ((n.objetivoAlerta || 0) - n.alerta) * k;
      n.grupo.visible = n.visible > 0.02;
      for (const e of n.grupo.children) {
        e.material.uniforms.uAlerta.value = n.alerta;
        e.material.uniforms.uOpac.value = n.visible;
        e.material.uniforms.uBrillo.value = 0.6 + n.brillo * 1.4;
        e.material.uniforms.uT.value = this.t;
        e.material.uniforms.uPulso.value = 1.5;
        const s = 1 + n.brillo * 0.25 * (0.5 + 0.5 * Math.sin(this.t * 4));
        e.scale.setScalar(s);
        e.visible = !(this.ocultarIzq && e.position.x < -1);
      }
    }
    // vías y partículas
    const pos = this.puntos.geometry.attributes.position;
    const alfa = this.puntos.geometry.attributes.alfa;
    for (const v of Object.values(this.vias)) {
      v.nivel += (v.objetivo - v.nivel) * k;
      v.bloqueo += (v.objetivoBloqueo - v.bloqueo) * k;
      v.grupo.visible = v.nivel > 0.02;
      for (const tubo of v.grupo.children) tubo.material.opacity = Math.min(0.55, 0.32 * v.nivel);
    }
    for (let i = 0; i < this.particulas.length; i++) {
      const p = this.particulas[i];
      const v = p.via;
      let a = 0;
      if (v.nivel > 0.02) {
        p.u += dt * p.vel * (12 + 16 * v.nivel) / v.largos[p.curva];
        if (p.u > 1) p.u -= 1;
        const m = v.muestras[p.curva];
        const f = p.u * (m.length - 1);
        const i0 = Math.floor(f), i1 = Math.min(i0 + 1, m.length - 1);
        const q = m[i0], r = m[i1], w = f - i0;
        let x = q.x + (r.x - q.x) * w, y = q.y + (r.y - q.y) * w, z = q.z + (r.z - q.z) * w;
        // bloqueo en el destino: las partículas se detienen y se apagan al final
        a = Math.min(1, v.nivel) * Math.min(1, p.u * 8) * Math.min(1, (1 - p.u) * 6);
        const ub = v.uBloqueo ?? 0.8;
        if (v.bloqueo > 0.01 && p.u > ub) a *= 1 - v.bloqueo * Math.min(1, (p.u - ub) * 12);
        const oculto = this.ocultarIzq && x < -1;
        pos.setXYZ(i, x, y, z);
        if (oculto) a = 0;
      }
      alfa.setX(i, a);
    }
    pos.needsUpdate = true;
    alfa.needsUpdate = true;
    // sitios de unión
    this.dianasNivel += (this.dianasObjetivo - this.dianasNivel) * k;
    const dp = this.dianas.geometry.attributes.position;
    const da = this.dianas.geometry.attributes.alfa;
    for (let i = 0; i < this.dianasDatos.length; i++) {
      const p = this.dianasDatos[i];
      const objetivo = p.activa ? this.dianasNivel : 0;
      p.a += (objetivo - p.a) * (1 - Math.exp(-dt * (1.2 + (i % 13) * 0.25)));
      const osc = 0.6 + 0.4 * Math.sin(this.t * 2.2 + p.fase);
      let a = p.a * osc;
      if (this.ocultarIzq && p.base.x < -1) a = 0;
      dp.setXYZ(i, p.base.x + Math.sin(this.t * 0.9 + p.fase) * 0.6, p.base.y + Math.cos(this.t * 0.7 + p.fase) * 0.6, p.base.z);
      da.setX(i, a);
    }
    dp.needsUpdate = true;
    da.needsUpdate = true;
    this.composer.render();
    this.etiquetas.render(this.escena, this.camara);
    this._separarEtiquetas();
  }

  _separarEtiquetas() {
    const lista = this._etiquetas;
    if (!lista || lista.length < 2) return;
    const ancho = this.contenedor.clientWidth, alto = this.contenedor.clientHeight;
    const v = new THREE.Vector3();
    const cajas = lista.map((o) => {
      o.getWorldPosition(v).project(this.camara);
      const span = o.element.firstChild;
      return { o, span, x: (v.x * 0.5 + 0.5) * ancho, y: (-v.y * 0.5 + 0.5) * alto, w: span.offsetWidth || 80, h: span.offsetHeight || 22, dy: 0 };
    }).sort((a, b) => b.y - a.y);
    for (let i = 0; i < cajas.length; i++) {
      const a = cajas[i];
      for (let j = 0; j < i; j++) {
        const b = cajas[j];
        const solapX = Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 4;
        const ya = a.y - a.dy, yb = b.y - b.dy;
        if (solapX && Math.abs(ya - yb) < a.h + 3) a.dy += a.h + 3 - Math.abs(ya - yb) + (ya > yb ? 2 * Math.abs(ya - yb) : 0);
      }
      const objetivo = -a.dy;
      a.o._dy = (a.o._dy ?? objetivo) + (objetivo - (a.o._dy ?? objetivo)) * 0.25;
      a.span.style.transform = `translateY(${a.o._dy.toFixed(1)}px)`;
    }
  }

  // Etiquetas HTML ancladas a estructuras
  etiquetar(lista = []) {
    for (const e of this._etiquetas || []) e.parent?.remove(e);
    this._etiquetas = [];
    for (const item of lista) {
      const { id, texto, color } = typeof item === 'string' ? { id: item } : item;
      let pos = null, nombre = texto;
      if (this.nucleos[id]) {
        const n = NUCLEOS[id];
        const x = n.bilateral && this.ocultarIzq === false ? -n.pos[0] : n.pos[0];
        pos = mni(n.bilateral ? (this.ocultarIzq ? Math.abs(n.pos[0]) : -Math.abs(n.pos[0])) : x, n.pos[1], n.pos[2]);
        nombre ||= n.nombre;
      } else if (this.estructuras[id]) {
        const mallas = this.estructuras[id].mallas.filter((m) => !(this.ocultarIzq ? m.userData.lado === 'L' : m.userData.lado === 'R'));
        const m = mallas[0] || this.estructuras[id].mallas[0];
        m.geometry.computeBoundingBox();
        pos = m.geometry.boundingBox.getCenter(new THREE.Vector3());
        nombre ||= ESTRUCTURAS[id].nombre;
      } else if (VIAS[id]) {
        const v = this.vias[id];
        const ci = this.ocultarIzq || v.curvas.length === 1 ? v.curvas.length - 1 : 0;
        pos = v.curvas[ci].getPointAt(0.55);
        nombre ||= VIAS[id].nombre;
      } else {
        const lista2 = this.verticesPorZona[(id) + (this.ocultarIzq ? 'R' : 'L')] || this.verticesPorZona[id + 'R'];
        if (lista2) {
          pos = lista2.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / lista2.length);
          nombre ||= NOMBRE_ZONA[id];
        }
      }
      if (!pos) continue;
      const div = document.createElement('div');
      div.className = 'etiqueta3d';
      if (color) div.style.setProperty('--c', color);
      div.innerHTML = `<span>${nombre}</span>`;
      const obj = new CSS2DObject(div);
      obj.position.copy(pos);
      obj.center.set(0.5, 1);
      this.grupo.add(obj);
      this._etiquetas.push(obj);
    }
  }

  autoGiro(activo) {
    this.controles.autoRotate = activo;
    this.controles.autoRotateSpeed = 0.6;
  }
}
