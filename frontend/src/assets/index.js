/**
 * Central asset registry.
 *
 * The drifting background is declared here rather than inline in JSX so its
 * palette and motion can be retuned in one place. Everything exported from
 * this file should be imported as `from '../assets/index.js'`.
 */

/**
 * Large, heavily blurred shapes that sit behind the frosted panels. Each one
 * drifts on its own duration and axis so the loop is never perceptible.
 * `shape` is an organic border-radius rather than a circle, which is what stops
 * the blobs reading as generic gradient spheres.
 */
export const AURA_BLOBS = [
  {
    id: 'rose',
    className: 'animate-drift-a',
    color: 'bg-aura-rose',
    shape: 'rounded-[58%_42%_46%_54%/48%_56%_44%_52%]',
    style: { top: '-14%', left: '-8%', width: '58vw', height: '58vw' },
    blur: 'blur-3xl',
    opacity: 'opacity-50',
  },
  {
    id: 'sage',
    className: 'animate-drift-b',
    color: 'bg-aura-sage',
    shape: 'rounded-[44%_56%_62%_38%/56%_42%_58%_44%]',
    style: { top: '8%', right: '-12%', width: '52vw', height: '52vw' },
    blur: 'blur-3xl',
    opacity: 'opacity-40',
  },
  {
    id: 'lilac',
    className: 'animate-drift-c',
    color: 'bg-aura-lilac',
    shape: 'rounded-[62%_38%_40%_60%/42%_60%_40%_58%]',
    style: { bottom: '-18%', left: '22%', width: '62vw', height: '62vw' },
    blur: 'blur-3xl',
    opacity: 'opacity-45',
  },
  {
    id: 'ochre',
    className: 'animate-drift-b',
    color: 'bg-aura-ochre',
    shape: 'rounded-[50%_50%_38%_62%/60%_40%_60%_40%]',
    style: { bottom: '2%', right: '4%', width: '38vw', height: '38vw' },
    blur: 'blur-2xl',
    opacity: 'opacity-40',
  },
]

/**
 * Mesh-gradient wash underneath the blobs. Three offset radial pools give the
 * page depth without the hard banding a linear gradient produces.
 */
export const AURA_MESH = {
  backgroundImage: [
    'radial-gradient(60% 55% at 16% 8%, rgba(232,180,174,0.55) 0%, rgba(232,180,174,0) 100%)',
    'radial-gradient(55% 60% at 88% 18%, rgba(201,183,216,0.5) 0%, rgba(201,183,216,0) 100%)',
    'radial-gradient(70% 60% at 45% 100%, rgba(179,196,174,0.5) 0%, rgba(179,196,174,0) 100%)',
    'radial-gradient(50% 45% at 100% 88%, rgba(227,201,160,0.42) 0%, rgba(227,201,160,0) 100%)',
  ].join(', '),
}

/**
 * Faint fractal-noise overlay. Breaks up the smooth gradients so large areas
 * read as paper rather than as flat CSS.
 */
export const GRAIN_TEXTURE = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.32'/%3E%3C/svg%3E\")",
}