import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════
   3D FARMER AVATAR — Three.js Low-Poly Character
   A stylized Indian farmer with turban, mustache,
   kurta, and gentle idle animation.
   ═══════════════════════════════════════════════════ */
export default function FarmerAvatar3D({ size = 140 }) {
  const mountRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    /* ── Scene & Camera ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.6, 5.2);
    camera.lookAt(0, 0.3, 0);

    /* ── Lighting ── */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
    fillLight.position.set(-3, 2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x34d399, 0.5);
    rimLight.position.set(0, 1, -4);
    scene.add(rimLight);

    /* ── Colors ── */
    const skinColor = new THREE.Color(0xd4956b);
    const turbanColor = new THREE.Color(0xff8c42);
    const turbanAccent = new THREE.Color(0xfbbf24);
    const kurtaColor = new THREE.Color(0xf5f5dc);
    const mustacheColor = new THREE.Color(0x3d2b1f);
    const eyeColor = new THREE.Color(0x1a1a1a);
    const eyeWhite = new THREE.Color(0xfafafa);
    const mouthColor = new THREE.Color(0xc9715e);

    /* ── Farmer Group ── */
    const farmer = new THREE.Group();

    /* ── Body / Kurta ── */
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.7, 1.3, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: kurtaColor,
      roughness: 0.7,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, -0.95, 0);
    farmer.add(body);

    /* Kurta collar / neckline */
    const collarGeo = new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.8 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, -0.27, 0.2);
    collar.rotation.x = -0.3;
    farmer.add(collar);

    /* ── Shoulders ── */
    const shoulderGeo = new THREE.SphereGeometry(0.25, 10, 10);
    const shoulderMat = new THREE.MeshStandardMaterial({ color: kurtaColor, roughness: 0.7 });
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.55, -0.42, 0);
    leftShoulder.scale.set(1, 0.8, 0.9);
    farmer.add(leftShoulder);

    const rightShoulder = leftShoulder.clone();
    rightShoulder.position.set(0.55, -0.42, 0);
    farmer.add(rightShoulder);

    /* ── Neck ── */
    const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.2, 10);
    const neckMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.set(0, -0.2, 0);
    farmer.add(neck);

    /* ── Head ── */
    const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.55,
      metalness: 0.05,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.2, 0);
    head.scale.set(1, 1.05, 0.95);
    farmer.add(head);

    /* ── Ears ── */
    const earGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const earMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.4, 0.18, 0);
    leftEar.scale.set(0.6, 1, 0.8);
    farmer.add(leftEar);
    const rightEar = leftEar.clone();
    rightEar.position.set(0.4, 0.18, 0);
    farmer.add(rightEar);

    /* ── Eyes — Whites ── */
    const eyeWhiteGeo = new THREE.SphereGeometry(0.075, 10, 10);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: eyeWhite, roughness: 0.3 });
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    leftEyeWhite.position.set(-0.15, 0.28, 0.36);
    farmer.add(leftEyeWhite);
    const rightEyeWhite = leftEyeWhite.clone();
    rightEyeWhite.position.set(0.15, 0.28, 0.36);
    farmer.add(rightEyeWhite);

    /* ── Eyes — Pupils ── */
    const pupilGeo = new THREE.SphereGeometry(0.042, 8, 8);
    const pupilMat = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.2 });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.15, 0.28, 0.42);
    farmer.add(leftPupil);
    const rightPupil = leftPupil.clone();
    rightPupil.position.set(0.15, 0.28, 0.42);
    farmer.add(rightPupil);

    /* ── Eyebrows ── */
    const browGeo = new THREE.BoxGeometry(0.14, 0.03, 0.04);
    const browMat = new THREE.MeshStandardMaterial({ color: mustacheColor, roughness: 0.8 });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.15, 0.38, 0.36);
    leftBrow.rotation.z = 0.12;
    farmer.add(leftBrow);
    const rightBrow = leftBrow.clone();
    rightBrow.position.set(0.15, 0.38, 0.36);
    rightBrow.rotation.z = -0.12;
    farmer.add(rightBrow);

    /* ── Nose ── */
    const noseGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const noseMat = new THREE.MeshStandardMaterial({ color: skinColor.clone().multiplyScalar(0.92), roughness: 0.5 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.18, 0.42);
    nose.scale.set(0.9, 0.8, 1);
    farmer.add(nose);

    /* ── Smile ── */
    const smileShape = new THREE.Shape();
    smileShape.absarc(0, 0, 0.08, 0.3, Math.PI - 0.3, false);
    const smileGeo = new THREE.ShapeGeometry(smileShape, 12);
    const smileMat = new THREE.MeshStandardMaterial({ color: mouthColor, roughness: 0.5, side: THREE.DoubleSide });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, 0.07, 0.41);
    farmer.add(smile);

    /* ── Mustache ── */
    const mustacheGeoL = new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI);
    const mustacheMat = new THREE.MeshStandardMaterial({ color: mustacheColor, roughness: 0.8 });
    const mustacheL = new THREE.Mesh(mustacheGeoL, mustacheMat);
    mustacheL.position.set(-0.07, 0.12, 0.4);
    mustacheL.rotation.z = Math.PI;
    mustacheL.rotation.x = 0.2;
    farmer.add(mustacheL);
    const mustacheR = mustacheL.clone();
    mustacheR.position.set(0.07, 0.12, 0.4);
    farmer.add(mustacheR);

    /* ── Turban ── */
    // Main turban dome
    const turbanGeo = new THREE.SphereGeometry(0.48, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const turbanMat = new THREE.MeshStandardMaterial({
      color: turbanColor,
      roughness: 0.6,
      metalness: 0.08,
    });
    const turban = new THREE.Mesh(turbanGeo, turbanMat);
    turban.position.set(0, 0.38, 0);
    turban.scale.set(1, 0.85, 0.98);
    farmer.add(turban);

    // Turban wrap layers (rings for detail)
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.TorusGeometry(0.43 - i * 0.03, 0.035, 6, 20);
      const ringMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? turbanColor : turbanAccent,
        roughness: 0.6,
        metalness: 0.1,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 0.42 + i * 0.08, 0);
      ring.rotation.x = Math.PI / 2 + (i * 0.08);
      ring.scale.set(1, 1, 0.5);
      farmer.add(ring);
    }

    // Turban front jewel/ornament
    const jewelGeo = new THREE.OctahedronGeometry(0.05, 0);
    const jewelMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x10b981,
      emissiveIntensity: 0.4,
    });
    const jewel = new THREE.Mesh(jewelGeo, jewelMat);
    jewel.position.set(0, 0.52, 0.38);
    farmer.add(jewel);

    /* ── Position farmer ── */
    farmer.position.set(0, 0.05, 0);
    scene.add(farmer);

    /* ── Animate ── */
    const clock = new THREE.Clock();

    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle idle bob
      farmer.position.y = 0.05 + Math.sin(t * 1.2) * 0.03;

      // Subtle breathing
      body.scale.x = 1 + Math.sin(t * 1.8) * 0.015;
      body.scale.z = 1 + Math.sin(t * 1.8 + 0.5) * 0.01;

      // Gentle head tilt
      head.rotation.z = Math.sin(t * 0.6) * 0.04;
      head.rotation.y = Math.sin(t * 0.4) * 0.06;

      // Eyes follow (subtle look around)
      const eyeX = Math.sin(t * 0.7) * 0.012;
      const eyeY = Math.sin(t * 0.5) * 0.008;
      leftPupil.position.x = -0.15 + eyeX;
      leftPupil.position.y = 0.28 + eyeY;
      rightPupil.position.x = 0.15 + eyeX;
      rightPupil.position.y = 0.28 + eyeY;

      // Turban jewel glow
      jewelMat.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.2;

      // Turban and accessories follow head
      turban.rotation.z = head.rotation.z;
      turban.rotation.y = head.rotation.y;
      jewel.rotation.z = head.rotation.z;
      jewel.rotation.y = head.rotation.y + t * 0.5;

      renderer.render(scene, camera);
    }

    animate();

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Dispose geometries and materials
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
