import type { Variants } from 'motion/react'
export const popupVariants: Variants = {
  hidden: { opacity: 0, y: -5, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
}
export const dialogVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1 },
}
export const viewVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}
