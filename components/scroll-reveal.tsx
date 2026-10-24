'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  duration?: number;
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  distance = 28,
  duration = 0.65,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  const getInitial = () => {
    if (shouldReduceMotion) return { opacity: 0 };
    switch (direction) {
      case 'up': return { opacity: 0, y: distance, filter: 'blur(3px)' };
      case 'down': return { opacity: 0, y: -distance, filter: 'blur(3px)' };
      case 'left': return { opacity: 0, x: -distance, filter: 'blur(3px)' };
      case 'right': return { opacity: 0, x: distance, filter: 'blur(3px)' };
      case 'none': return { opacity: 0, scale: 0.97 };
      default: return { opacity: 0, y: distance };
    }
  };

  const getAnimate = () => {
    if (shouldReduceMotion) return { opacity: 1 };
    return {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      filter: 'blur(0px)',
    };
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={getAnimate()}
      viewport={{ once: true, margin: '-60px' }}
      transition={{
        duration,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1] as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
