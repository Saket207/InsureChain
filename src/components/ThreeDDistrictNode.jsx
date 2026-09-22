import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeDDistrictNode({ riskScore = 50, ndvi = 0.5, name = "District", isSatellite = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 300;
    const height = 180;

    // 1. Create Scene, Camera, Renderer
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear out any old canvas
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 2. Create the core mesh - Glowing futuristic crop wireframe
    // Color changes based on risk or crop health!
    const isHealthy = ndvi > 0.5;
    const primaryColor = isHealthy ? 0x10b981 : 0xf59e0b; // Emerald green or amber
    const secondaryColor = 0x3b82f6; // Blue accents

    // Crystal outer wireframe sphere
    const geometry = new THREE.IcosahedronGeometry(2.2, 1);
    const material = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Dynamic inner core points network
    const pointsGeometry = new THREE.SphereGeometry(1.6, 16, 16);
    const pointsMaterial = new THREE.PointsMaterial({
      color: secondaryColor,
      size: 0.11,
      transparent: true,
      opacity: 0.85,
    });
    const pointCloud = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(pointCloud);

    // Core central sphere representing the crop node
    const coreGeo = new THREE.IcosahedronGeometry(0.8, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 3. Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate crystal meshes
      mesh.rotation.y += 0.007;
      mesh.rotation.x += 0.003;

      pointCloud.rotation.y -= 0.005;
      pointCloud.rotation.z += 0.002;

      coreMesh.rotation.y += 0.015;
      coreMesh.rotation.x -= 0.01;

      // Pulsing effect based on risk score / NDVI
      const time = Date.now() * 0.0025;
      const pulse = 1.0 + Math.sin(time) * 0.08;
      coreMesh.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };
    
    animate();

    // 4. Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    // 5. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      
      // Dispose materials & geometries to prevent WebGL memory leaks
      geometry.dispose();
      material.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      renderer.dispose();
    };
  }, [riskScore, ndvi, name]);

  // Fully inline styles — optimized for high-contrast visibility
  const containerStyle = isSatellite
    ? { 
        background: 'rgba(15, 23, 42, 0.92)', 
        border: '2px solid rgba(16, 185, 129, 0.4)', 
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
      }
    : { 
        background: 'rgba(248, 250, 252, 0.95)', 
        border: '2px solid rgba(148, 163, 184, 0.4)', 
        backdropFilter: 'blur(12px)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      };
  
  const labelColor = isSatellite ? '#ffffff' : '#0f172a';
  const metaColor = isSatellite ? '#cbd5e1' : '#1e293b';
  const activeGlowColor = isSatellite ? '#34d399' : '#047857';

  return (
    <div className="relative w-full h-[180px] rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300 border shadow-md hover:shadow-lg"
         style={containerStyle}>
      {/* Absolute floating indicators */}
      <div className="absolute top-3 left-4 flex flex-col pointer-events-none z-10">
        <span className="text-[11px] font-black tracking-widest uppercase filter drop-shadow-sm" style={{ color: labelColor }}>
          3D TELEMETRY NODE
        </span>
        <span className="text-[10px] font-black font-mono mt-1 bg-slate-900/30 px-2 py-0.5 rounded border border-white/10" style={{ color: metaColor }}>
          {name.toUpperCase()} / RISK: <span className={riskScore > 50 ? 'text-red-400' : 'text-emerald-400'}>{riskScore}%</span> / NDVI: {ndvi}
        </span>
      </div>
      
      <div className="absolute bottom-3 right-4 flex items-center gap-2 pointer-events-none z-10 bg-slate-900/40 px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
        <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: activeGlowColor }} />
        <span className="text-[10px] font-black uppercase font-mono tracking-wider" style={{ color: activeGlowColor }}>
          ACTIVE GLOW
        </span>
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
