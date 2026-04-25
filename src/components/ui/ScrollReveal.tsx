import React, { useRef } from 'react';
import { motion, useInView } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  baseOpacity?: number;
  enableBlur?: boolean;
  baseRotation?: number;
  blurStrength?: number;
}

export default function ScrollReveal({
  children,
  baseOpacity = 0.1,
  enableBlur = true,
  baseRotation = 3,
  blurStrength = 4
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: baseOpacity, 
        y: 20, 
        rotate: baseRotation,
        filter: enableBlur ? `blur(${blurStrength}px)` : 'none'
      }}
      animate={isInView ? { 
        opacity: 1, 
        y: 0, 
        rotate: 0,
        filter: 'blur(0px)'
      } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}
