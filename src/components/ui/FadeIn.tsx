import React from 'react';
import { motion, MotionProps } from 'motion/react';

interface FadeInProps extends Omit<MotionProps, 'initial' | 'animate' | 'exit'> {
  children: React.ReactNode;
  className?: string;
  /** Vertical slide offset in pixels — default 8 */
  slideY?: number;
  /** Animation duration in seconds — default 0.18 */
  duration?: number;
  /** Delay in seconds */
  delay?: number;
  as?: keyof typeof motion;
}

/**
 * FadeIn — standardised entrance animation that respects prefers-reduced-motion.
 *
 * When the user prefers reduced motion the element is shown immediately
 * (opacity 1, no translate) so there is no jarring effect.
 *
 * Usage:
 *   <FadeIn><MyComponent /></FadeIn>
 *   <FadeIn as="li" delay={0.05 * index}><ListItem /></FadeIn>
 */
export const FadeIn: React.FC<FadeInProps> = ({
  children,
  className,
  slideY = 8,
  duration = 0.18,
  delay = 0,
  ...rest
}) => {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: slideY }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: slideY / 2 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};
