import { LazyMotion, MotionConfig, useReducedMotion } from 'motion/react'
import type { PropsWithChildren } from 'react'
const loadFeatures = () => import('./features').then(module => module.default)
export function MotionProvider({ children }: PropsWithChildren) {
  const reduced = useReducedMotion()
  return <LazyMotion features={loadFeatures} strict><MotionConfig reducedMotion="user" transition={reduced ? { duration: 0 } : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>{children}</MotionConfig></LazyMotion>
}
