import { useEffect, useState, useRef } from 'react';
import { animate } from 'framer-motion';

export default function AnimatedCounter({ value, duration = 1.5, delay = 0 }) {
  const [displayValue, setDisplayValue] = useState('0');
  const previousValueRef = useRef(0);

  useEffect(() => {
    // Parse the value to find numbers
    const isCurrency = typeof value === 'string' && (value.includes('₹') || value.includes('Rs'));
    
    // Extract numeric part from string if necessary
    let numericTarget = 0;
    let prefix = '';
    let suffix = '';

    if (typeof value === 'number') {
      numericTarget = value;
    } else if (typeof value === 'string') {
      // Find prefix (like ₹)
      const currencyMatch = value.match(/^[^0-9]*/);
      prefix = currencyMatch ? currencyMatch[0] : '';
      
      // Find suffix (like /100)
      const suffixMatch = value.match(/[^0-9,.]*$/);
      suffix = suffixMatch ? suffixMatch[0] : '';

      // Clean number
      const cleaned = value.replace(/[^0-9.]/g, '');
      numericTarget = parseFloat(cleaned) || 0;
    }

    const startVal = previousValueRef.current;
    previousValueRef.current = numericTarget;

    const controls = animate(startVal, numericTarget, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate(value) {
        if (isCurrency || typeof value === 'string') {
          // Format as currency if it was initially currency
          const formatted = new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 2
          }).format(value);
          setDisplayValue(`${prefix}${formatted}${suffix}`);
        } else {
          setDisplayValue(Math.floor(value).toString());
        }
      }
    });

    return () => controls.stop();
  }, [value, duration, delay]);

  return <span>{displayValue}</span>;
}
