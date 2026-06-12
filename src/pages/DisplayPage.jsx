import { useRef, useEffect } from 'react'
import { useStreak } from '../hooks/useStreak'
import { useParticles } from '../hooks/useParticles'

function getMode(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'zero'
}

// SVG frost crack paths (corner cracks)
function FrostCracks({ active }) {
  return (
    <svg
      className={`frost-cracks${active ? ' active' : ''}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top-left corner cracks */}
      <polyline points="0,0 8,3 5,8 12,12 8,18 15,15 18,22" fill="none" stroke="rgba(160,220,255,0.35)" strokeWidth="0.3"/>
      <polyline points="0,0 4,10 10,7 7,15 14,20" fill="none" stroke="rgba(160,220,255,0.25)" strokeWidth="0.2"/>
      <polyline points="0,5 6,5 10,2 12,8" fill="none" stroke="rgba(160,220,255,0.2)" strokeWidth="0.2"/>
      {/* Top-right corner cracks */}
      <polyline points="100,0 92,3 95,8 88,12 92,18 85,15 82,22" fill="none" stroke="rgba(160,220,255,0.35)" strokeWidth="0.3"/>
      <polyline points="100,0 96,10 90,7 93,15 86,20" fill="none" stroke="rgba(160,220,255,0.25)" strokeWidth="0.2"/>
      {/* Bottom-left corner cracks */}
      <polyline points="0,100 8,97 5,92 12,88 8,82 15,85 18,78" fill="none" stroke="rgba(160,220,255,0.35)" strokeWidth="0.3"/>
      <polyline points="0,95 6,95 10,98 12,92" fill="none" stroke="rgba(160,220,255,0.2)" strokeWidth="0.2"/>
      {/* Bottom-right corner cracks */}
      <polyline points="100,100 92,97 95,92 88,88 92,82 85,85 82,78" fill="none" stroke="rgba(160,220,255,0.35)" strokeWidth="0.3"/>
      <polyline points="100,95 94,95 90,98 88,92" fill="none" stroke="rgba(160,220,255,0.2)" strokeWidth="0.2"/>
      {/* Scattered micro-cracks */}
      <polyline points="20,0 22,5 18,8 25,12" fill="none" stroke="rgba(160,220,255,0.15)" strokeWidth="0.15"/>
      <polyline points="75,0 73,6 78,9 72,14" fill="none" stroke="rgba(160,220,255,0.15)" strokeWidth="0.15"/>
      <polyline points="0,40 4,42 3,48 7,45" fill="none" stroke="rgba(160,220,255,0.15)" strokeWidth="0.15"/>
      <polyline points="100,60 96,62 97,68 93,65" fill="none" stroke="rgba(160,220,255,0.15)" strokeWidth="0.15"/>
    </svg>
  )
}

export default function DisplayPage() {
  const { streak, displayedStreak, message, loading } = useStreak()
  const canvasRef = useRef(null)

  const mode = getMode(streak ?? 0)
  useParticles(canvasRef, mode)

  // Set body class for overflow
  useEffect(() => {
    document.body.classList.remove('admin-page')
    return () => {}
  }, [])

  return (
    <div className="display-root">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Frost overlay for negative */}
      <div className={`frost-overlay${mode === 'negative' ? ' active' : ''}`} />

      {/* SVG frost cracks */}
      <FrostCracks active={mode === 'negative'} />

      {/* Vignette */}
      <div className={`vignette ${mode}`} />

      {/* Streak number */}
      <div className="streak-wrapper">


        {/* Glow aura */}
        <div className={`glow-aura ${mode}`} />

        {loading ? (
          <span className="loading-number">—</span>
        ) : (
          <span className={`streak-number ${mode}`}>
            {displayedStreak}
          </span>
        )}
      </div>

      {/* Custom Message */}
      {message && message.trim() !== '' && !loading && (
        <div className="custom-message">
          {message}
        </div>
      )}
    </div>
  )
}
