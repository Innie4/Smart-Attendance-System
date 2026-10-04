const TONES = {
  default: '',
  warm: 'glass-warm',
  good: 'glass-good',
  alert: 'glass-alert',
}

/**
 * Frosted panel. `as` lets a caller render the same surface as a different
 * element (a section, an article, a router link) without duplicating the glass
 * treatment. Tone tints are applied via the `glass-*` modifiers in index.css.
 */
export default function GlassCard({
  as: Tag = 'div',
  tone = 'default',
  hover = false,
  className = '',
  children,
  ...rest
}) {
  const lift = hover
    ? 'transition-all duration-500 ease-spring hover:-translate-y-1 hover:shadow-lift'
    : ''

  return (
    <Tag className={`card ${TONES[tone] || ''} ${lift} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}