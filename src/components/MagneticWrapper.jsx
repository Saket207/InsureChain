import { useRef, useCallback } from 'react';
import gsap from 'gsap';

/**
 * MagneticWrapper – wraps a child element and applies a magnetic drag-toward-cursor
 * effect using GSAP. The element gently pulls toward the cursor when hovered.
 * On mouse leave it snaps back to the original position.
 */
export default function MagneticWrapper({ children, strength = 0.35, className = '' }) {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    gsap.to(el, {
      x: deltaX,
      y: deltaY,
      duration: 0.4,
      ease: 'power3.out',
    });
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, {
      x: 0,
      y: 0,
      duration: 0.6,
      ease: 'elastic.out(1, 0.4)',
    });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`inline-block ${className}`}
    >
      {children}
    </div>
  );
}
