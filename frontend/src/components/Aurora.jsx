import { AURA_BLOBS, AURA_MESH, GRAIN_TEXTURE } from '../assets/index.js'

/**
 * Organic page backdrop: a mesh-gradient wash, a few heavily blurred shapes
 * drifting on long loops, and a whisper of grain. Fixed and non-interactive so
 * it never intercepts clicks or scrolls independently of the content.
 */
export default function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={AURA_MESH} />

      {AURA_BLOBS.map((blob) => (
        <div
          key={blob.id}
          className={`absolute ${blob.shape} ${blob.color} ${blob.blur} ${blob.opacity} ${blob.className}`}
          style={blob.style}
        />
      ))}

      {/* Grain last so it sits over the gradients, and faded right down. */}
      <div className="absolute inset-0 opacity-[0.035]" style={GRAIN_TEXTURE} />

      {/* Warm vignette pulls attention back towards the content. Kept light so
          the lower half of a tall page does not flatten into dead space. */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_100%_at_50%_18%,transparent_45%,rgba(240,231,222,0.42)_100%)]" />
    </div>
  )
}