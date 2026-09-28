import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CARD_H_MM, CARD_W_MM } from './drawCard';

export type Face = 'recto' | 'verso';

type Props = {
  recto: HTMLCanvasElement;
  verso: HTMLCanvasElement;
  /** Incrémenté à chaque redessin des canvas pour rafraîchir les textures */
  version: number;
  edgeColor: string;
  /** Rotation automatique souhaitée par l'utilisateur */
  autoRotate: boolean;
  /** Face à montrer (rotation suspendue tant qu'elle est définie) */
  focusFace: Face | null;
  className?: string;
};

const THICKNESS = 0.84;
const RADIUS = 3.18;
const FOV = 30;
const IDLE_RESUME_MS = 2500;
const CONTROLS_BAR_PX = 60;

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function faceGeometry(shape: THREE.Shape) {
  const g = new THREE.ShapeGeometry(shape, 16);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / CARD_W_MM + 0.5, pos.getY(i) / CARD_H_MM + 0.5);
  }
  uv.needsUpdate = true;
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function CardScene({ recto, verso, version, edgeColor, autoRotate, focusFace, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [supported] = useState(hasWebGL);
  const api = useRef<{
    rectoTex: THREE.CanvasTexture;
    versoTex: THREE.CanvasTexture;
    edgeMat: THREE.MeshStandardMaterial;
  } | null>(null);
  const autoRef = useRef(autoRotate);
  const faceRef = useRef<Face | null>(focusFace);

  autoRef.current = autoRotate;
  faceRef.current = focusFace;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supported) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    const canvas = renderer.domElement;
    // Positionné en absolu : la taille du canvas ne doit jamais influencer la mise en page
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.cursor = 'grab';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.3;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6ebe3, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 0.5);
    key.position.set(60, 90, 120);
    scene.add(key);

    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 2000);

    // ── Carte ──
    const shape = roundedRect(CARD_W_MM, CARD_H_MM, RADIUS);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const makeTex = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      return t;
    };
    const rectoTex = makeTex(recto);
    const versoTex = makeTex(verso);
    const faceMat = (map: THREE.Texture) =>
      new THREE.MeshPhysicalMaterial({
        map,
        roughness: 0.6,
        metalness: 0,
        clearcoat: 0.15,
        clearcoatRoughness: 0.35,
      });

    const card = new THREE.Group();
    const faceGeo = faceGeometry(shape);
    const front = new THREE.Mesh(faceGeo, faceMat(rectoTex));
    front.position.z = THICKNESS / 2;
    const back = new THREE.Mesh(faceGeo, faceMat(versoTex));
    back.rotation.y = Math.PI;
    back.position.z = -THICKNESS / 2;

    const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: THICKNESS, bevelEnabled: false, curveSegments: 16 });
    edgeGeo.translate(0, 0, -THICKNESS / 2);
    const edgeMat = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.6 });
    // Groupe 0 = faces (masquées, remplacées par front/back), groupe 1 = tranche
    const edge = new THREE.Mesh(edgeGeo, [new THREE.MeshBasicMaterial({ visible: false }), edgeMat]);
    card.add(front, back, edge);
    scene.add(card);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W_MM * 1.15, 22),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.45 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -CARD_H_MM / 2 - 7;
    scene.add(shadow);

    api.current = { rectoTex, versoTex, edgeMat };

    // ── Contrôles ──
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.minPolarAngle = Math.PI * 0.2;
    controls.maxPolarAngle = Math.PI * 0.8;
    controls.autoRotateSpeed = 2.6;
    // Laisse le défilement vertical de la page fonctionner sur mobile ;
    // un glissement horizontal fait tourner la carte.
    canvas.style.touchAction = 'pan-y';

    let dragging = false;
    let lastInteraction = -Infinity;
    const onStart = () => { dragging = true; canvas.style.cursor = 'grabbing'; };
    const onEnd = () => { dragging = false; lastInteraction = performance.now(); canvas.style.cursor = 'grab'; };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);

    // Vue initiale légèrement de biais, côté recto
    const sph = new THREE.Spherical(1, THREE.MathUtils.degToRad(78), THREE.MathUtils.degToRad(-24));

    const fit = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      // Bande réservée en bas pour la barre Recto / Verso : la carte est centrée au-dessus
      const reserved = Math.min(CONTROLS_BAR_PX, h * 0.25);
      const usable = (h - reserved) / h;
      // Distance qui fait tenir la carte (avec marge) en largeur et en hauteur
      const dist = Math.max((CARD_H_MM * 0.5 * 1.45) / (t * usable), (CARD_W_MM * 0.5 * 1.28) / (t * camera.aspect));
      camera.setViewOffset(w, h, 0, reserved / 2, w, h);
      camera.updateProjectionMatrix();
      const cur = new THREE.Spherical().setFromVector3(camera.position);
      if (cur.radius > 0) { sph.theta = cur.theta; sph.phi = cur.phi; }
      sph.radius = dist;
      camera.position.setFromSpherical(sph);
      camera.lookAt(0, 0, 0);
      controls.minDistance = controls.maxDistance = dist;
    };
    camera.position.setFromSpherical(sph);
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(host);

    // ── Boucle de rendu (suspendue hors écran) ──
    const tmp = new THREE.Spherical();
    const tick = () => {
      const face = faceRef.current;
      const idle = !dragging && performance.now() - lastInteraction > IDLE_RESUME_MS;
      controls.autoRotate = autoRef.current && !face && idle;

      if (face && !dragging) {
        tmp.setFromVector3(camera.position);
        const target = face === 'recto' ? 0 : Math.PI;
        let d = target - tmp.theta;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        tmp.theta += d * 0.12;
        tmp.phi += (Math.PI / 2 - 0.12 - tmp.phi) * 0.12;
        camera.position.setFromSpherical(tmp);
        camera.lookAt(0, 0, 0);
      }
      controls.update();
      renderer.render(scene, camera);
    };

    let running = false;
    const setRunning = (on: boolean) => {
      if (on === running) return;
      running = on;
      renderer.setAnimationLoop(on ? tick : null);
    };
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.01 });
    io.observe(host);
    setRunning(true);

    return () => {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => {
          const mm = mat as THREE.MeshBasicMaterial;
          mm.map?.dispose();
          mm.dispose();
        });
      });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
      api.current = null;
    };
    // La scène est créée une seule fois ; les props dynamiques passent par des refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, recto, verso]);

  useEffect(() => {
    if (!api.current) return;
    api.current.rectoTex.needsUpdate = true;
    api.current.versoTex.needsUpdate = true;
  }, [version]);

  useEffect(() => {
    api.current?.edgeMat.color.set(edgeColor);
  }, [edgeColor]);

  if (!supported) {
    // Repli sans WebGL : les deux faces en 2D
    return (
      <div className={className}>
        <div className="h-full w-full flex flex-col items-center justify-center gap-4 p-4">
          {[focusFace === 'recto' ? recto : verso, focusFace === 'recto' ? verso : recto].map((c, i) => (
            <img
              key={i}
              src={c.toDataURL('image/jpeg', 0.85)}
              alt={i === 0 ? 'Aperçu de la carte' : ''}
              className="w-full max-w-[380px] rounded-[14px] shadow-xl"
              style={{ aspectRatio: `${CARD_W_MM} / ${CARD_H_MM}` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return <div ref={hostRef} className={`relative overflow-hidden ${className ?? ''}`} role="img" aria-label="Carte NFC Portefolia en 3D, glissez pour la faire tourner" />;
}
