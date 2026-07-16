export const motion = {
  fast: 0.16,
  medium: 0.28,
  slow: 0.42,
  // Spec easing: spring-like for sheets, smooth-out for in-place transitions
  ease: [0.22, 1, 0.36, 1],
  spring: [0.34, 1.45, 0.64, 1],
  sheet:  [0.32, 1.0, 0.32, 1.0],
};

export const motionCssVars = {
  '--motion-fast':     `${motion.fast}s`,
  '--motion-medium':   `${motion.medium}s`,
  '--motion-slow':     `${motion.slow}s`,
  '--motion-ease':     `cubic-bezier(${motion.ease.join(',')})`,
  '--motion-spring':   `cubic-bezier(${motion.spring.join(',')})`,
  '--motion-sheet':    `cubic-bezier(${motion.sheet.join(',')})`,
};
