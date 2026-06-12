import { useRef, useEffect } from 'react'
import { useStreak } from '../hooks/useStreak'
import { useParticles } from '../hooks/useParticles'

function getMode(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'zero'
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
