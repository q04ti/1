import { useState, useEffect } from 'react'
import { useStreak } from '../hooks/useStreak'

function getMode(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'zero'
}

function PillButton({ label, color, onClick, disabled }) {
  const [flashing, setFlashing] = useState(false)
  const [pressing, setPressing] = useState(false)

  const handleClick = async () => {
    if (disabled) return
    setPressing(true)
    setTimeout(() => setPressing(false), 180)
    await onClick()
    setFlashing(true)
    setTimeout(() => setFlashing(false), 700)
  }

  return (
    <button
      className={`pill-btn ${color}-btn${flashing ? ' flashing' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      style={{
        transform: pressing ? 'scale(0.93)' : undefined,
        transition: pressing
          ? 'transform 80ms ease-in'
          : 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms ease, filter 200ms ease',
      }}
    >
      {label}
    </button>
  )
}

export default function AdminPage() {
  const { streak, displayedStreak, message, loading, error, autoModeEnabled, autoModeDirection, updateStreak, updateMessage, toggleAutoMode } = useStreak()
  const [busy, setBusy] = useState(false)
  const [inputMsg, setInputMsg] = useState('')

  // Sync inputMsg when message loads initially
  useEffect(() => {
    if (message !== undefined) {
      setInputMsg(message)
    }
  }, [message])

  const mode = getMode(streak ?? 0)

  // Set body class for scrolling
  useEffect(() => {
    document.body.classList.add('admin-page')
    return () => document.body.classList.remove('admin-page')
  }, [])

  const handleTexted = async () => {
    if (busy || streak === null) return
    setBusy(true)
    try {
      const newVal = streak <= 0 ? 1 : streak + 1
      await updateStreak(newVal, 1)
    } finally {
      setBusy(false)
    }
  }

  const handleDidntText = async () => {
    if (busy || streak === null) return
    setBusy(true)
    try {
      const newVal = streak > 0 ? 0 : streak - 1
      await updateStreak(newVal, -1)
    } finally {
      setBusy(false)
    }
  }

  const handleUpdateMessage = async () => {
    if (busy) return
    setBusy(true)
    try {
      await updateMessage(inputMsg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-root">
      <div className="admin-content">
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p className="admin-label">
            <span className="status-dot" />
            streak system · admin
          </p>
          {autoModeEnabled && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span className={`status-dot ${autoModeDirection > 0 ? 'success' : 'fail'}`} />
              Auto Mode Active ({autoModeDirection > 0 ? '+1/day' : '-1/day'})
            </div>
          )}
        </div>

        {/* Current streak display */}
        <div style={{ textAlign: 'center' }}>
          {loading ? (
            <span className="admin-streak-display zero">—</span>
          ) : error ? (
            <div style={{ color: '#ff4444', fontSize: '1rem', padding: '1rem' }}>
              ⚠ {error}
            </div>
          ) : (
            <span className={`admin-streak-display ${mode}`}>
              {displayedStreak}
            </span>
          )}
        </div>

        <div className="admin-divider" />

        {/* Buttons */}
        <div className="admin-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <PillButton
              label="✅"
              color="success"
              onClick={handleTexted}
              disabled={busy || loading || !!error}
            />
            <PillButton
              label="❌"
              color="fail"
              onClick={handleDidntText}
              disabled={busy || loading || !!error}
            />
          </div>
          
          <button 
            className="admin-submit-btn" 
            onClick={toggleAutoMode}
            disabled={busy || loading || !!error}
            style={{ 
              backgroundColor: autoModeEnabled ? 'rgba(0, 255, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: autoModeEnabled ? '#00ff80' : 'rgba(255,255,255,0.6)',
              border: `1px solid ${autoModeEnabled ? 'rgba(0,255,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
              alignSelf: 'center',
              width: '100%',
              padding: '0.8rem',
              letterSpacing: '0.05em',
              fontWeight: 600
            }}
          >
            AUTO MODE {autoModeEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="admin-divider" />

        {/* Message Input */}
        <div className="admin-message-section">
          <input 
            type="text" 
            className="admin-input" 
            placeholder="Type a custom message..." 
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={busy || loading || !!error}
          />
          <button 
            className="admin-submit-btn" 
            onClick={handleUpdateMessage}
            disabled={busy || loading || !!error}
          >
            Update Message
          </button>
        </div>

        <div className="admin-divider" />

        {/* Logic hint */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', lineHeight: 1.8, letterSpacing: '0.03em' }}>
          {streak !== null && (
            <>
              <div>✅ → {streak <= 0 ? `set to 1` : `${streak} + 1 = ${streak + 1}`}</div>
              <div>❌ → {streak > 0 ? `set to 0` : `${streak} - 1 = ${streak - 1}`}</div>
            </>
          )}
        </div>

        <p className="admin-footer">live · supabase realtime</p>
      </div>
    </div>
  )
}
