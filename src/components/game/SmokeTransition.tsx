'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  modeKey: string;
  className?: string;
}

export default function SmokeTransition({ children, modeKey, className = '' }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={modeKey}
        initial={{
          opacity: 0,
          scale: 0.95,
          filter: 'blur(10px)',
          y: 12,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 1.04,
          filter: 'blur(12px)',
          y: -8,
        }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 22,
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

