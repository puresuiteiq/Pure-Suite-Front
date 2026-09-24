import { motion } from 'framer-motion'

/**
 * Reusable entrance + merchant-brand hover treatment for dashboard sections.
 * It accepts normal Tailwind classes through `className` and can wrap cards,
 * tables, or any other page section.
 */
export default function AnimatedSection({
  children,
  className = '',
  interactive = true,
  delay = 0,
  ...props
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={
        interactive
          ? {
              y: -4,
              scale: 1.01,
            }
          : undefined
      }
      className={`dashboard-glow-card ${className}`}
      {...props}
    >
      {children}
    </motion.section>
  )
}
