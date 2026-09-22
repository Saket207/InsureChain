import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * ThreeDTelemetrySphere – An interactive Three.js particle sphere that
 * represents decentralized oracle node telemetry.  It rotates gently and
 * reacts to mouse position within its canvas.
 */
export default function ThreeDTelemetrySphere({ riskScore = 50, className = '' }) {
  const containerRef = useRef(null);
  const frameIdRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    // ── Scene, Camera, Renderer ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Color based on risk ──
    const riskHue = riskScore > 60 ? 0.0 : riskScore > 35 ? 0.12 : 0.38;
    const coreColor = new THREE.Color().setHSL(riskHue, 0.85, 0.55);
    const glowColor = new THREE.Color().setHSL(riskHue, 0.7, 0.35);

    // ── Particles on a Sphere ──
    const particleCount = 600;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const radius = 1.5;

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 2 + Math.random() * 3;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      color: coreColor,
      size: 0.04,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Wireframe Icosahedron Shell ──
    const icoGeo = new THREE.IcosahedronGeometry(1.45, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    scene.add(icoMesh);

    // ── Inner Core Glow ──
    const coreGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.12,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // ── Orbital Ring ──
    const ringGeo = new THREE.TorusGeometry(1.8, 0.008, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    scene.add(ring);

    // ── Mouse tracking ──
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener('mousemove', onMouseMove);

    // ── Animation Loop ──
    const clock = new THREE.Clock();
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Auto rotation
      particles.rotation.y = t * 0.12;
      particles.rotation.x = Math.sin(t * 0.08) * 0.15;

      icoMesh.rotation.y = -t * 0.08;
      icoMesh.rotation.x = t * 0.05;

      ring.rotation.z = t * 0.15;

      // Core pulse
      const pulse = 1 + Math.sin(t * 2) * 0.05;
      coreMesh.scale.set(pulse, pulse, pulse);
      coreMat.opacity = 0.1 + Math.sin(t * 1.5) * 0.06;

      // React to mouse
      const targetRotX = mouseRef.current.y * 0.4;
      const targetRotY = mouseRef.current.x * 0.4;
      particles.rotation.x += (targetRotX - particles.rotation.x) * 0.03;
      icoMesh.rotation.x += (targetRotX - icoMesh.rotation.x) * 0.02;

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handler ──
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      container.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      icoGeo.dispose();
      icoMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [riskScore]);

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-square max-w-[280px] mx-auto ${className}`}
      style={{ cursor: 'grab' }}
    />
  );
}
