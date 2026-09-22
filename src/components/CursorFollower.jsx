import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CursorFollower() {
  const mainDotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const mainDot = mainDotRef.current;
    const ring = ringRef.current;
    if (!mainDot || !ring) return;

    // Set initial positions offscreen
    gsap.set([mainDot, ring], { xPercent: -50, yPercent: -50, x: -100, y: -100 });

    const onMouseMove = (e) => {
      // Direct positioning for inner dot, slightly lagged positioning for outer ring
      gsap.to(mainDot, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.05,
        ease: 'power2.out'
      });
      gsap.to(ring, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.3,
        ease: 'power2.out'
      });
    };

    const onMouseOver = (e) => {
      const target = e.target.closest('.hover-target') || e.target.closest('button') || e.target.closest('a');
      if (target) {
        gsap.to(ring, {
          scale: 2,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: 'rgba(16, 185, 129, 0.8)',
          duration: 0.3
        });
        gsap.to(mainDot, {
          scale: 0.5,
          backgroundColor: '#34d399',
          duration: 0.3
        });
      }
    };

    const onMouseOut = (e) => {
      const target = e.target.closest('.hover-target') || e.target.closest('button') || e.target.closest('a');
      if (target) {
        gsap.to(ring, {
          scale: 1,
          backgroundColor: 'transparent',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          duration: 0.3
        });
        gsap.to(mainDot, {
          scale: 1,
          backgroundColor: '#10b981',
          duration: 0.3
        });
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);
    window.addEventListener('mouseout', onMouseOut);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  return (
    <>
      {/* Hide default cursor on desktop when follower is active, handled via CSS on body */}
      <div 
        ref={mainDotRef} 
        className="fixed w-2.5 h-2.5 bg-emerald-500 rounded-full pointer-events-none z-[9999] hidden md:block mix-blend-difference"
      />
      <div 
        ref={ringRef} 
        className="fixed w-8 h-8 border border-emerald-500/40 rounded-full pointer-events-none z-[9998] hidden md:block backdrop-blur-[1px] transition-transform duration-75"
      />
    </>
  );
}
