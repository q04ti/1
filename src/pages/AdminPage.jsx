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
        width: '100%',
        padding: '0.8rem',
        fontSize: '1.1rem',
        marginTop: '1rem',
        borderRadius: '12px'
      }}
    >
      {label}
    </button>
  )
}

export default function AdminPage() {
  const { 
    streak: daysRemaining, displayedStreak, message, loading, error, 
    updateStreak, updateMessage, updateAutoMode
  } = useStreak()
  
  const [busy, setBusy] = useState(false)
  const [targetDays, setTargetDays] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [inputMsg, setInputMsg] = useState('')

  // Sync inputMsg when message loads initially
  useEffect(() => {
    if (message !== undefined) {
      setInputMsg(message)
    }
  }, [message])

  const mode = getMode(daysRemaining ?? 0)

  // Set body class for scrolling
  useEffect(() => {
    document.body.classList.add('admin-page')
    return () => document.body.classList.remove('admin-page')
  }, [])

  const handleStartCountdown = async () => {
    if (busy) return
    
    let days = null
    if (targetDays) {
      days = parseInt(targetDays, 10)
    } else if (targetDate) {
      const today = new Date()
      // Calculate start of today for accurate day difference
      today.setHours(0, 0, 0, 0)
      const target = new Date(targetDate)
      target.setHours(0, 0, 0, 0)
      const diffTime = target - today
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
    
    if (days === null || isNaN(days) || days < 0) return

    setBusy(true)
    try {
      await updateStreak(days)
      if (inputMsg !== message) {
        await updateMessage(inputMsg)
      }
      // Enable auto mode downwards to decrement daily
      const d = new Date()
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      await updateAutoMode({ enabled: true, direction: 'down', lastRunDate: todayStr })
      
      setTargetDays('')
      setTargetDate('')
    } catch (err) {
      console.error(err)
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
            <span className="status-dot green pulse" />
            countdown · admin
          </p>
        </div>

        {/* Current display */}
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

        {/* Setup Section */}
        <div className="admin-setup-section" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'rgba(255,255,255,0.8)' }}>Set New Countdown</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Target Days</label>
            <input 
              type="number" 
              className="admin-input" 
              placeholder="e.g. 37" 
              value={targetDays}
              onChange={(e) => {
                setTargetDays(e.target.value)
                setTargetDate('') // clear date if days are set
              }}
              disabled={busy || loading || !!error}
            />
          </div>

          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>OR</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Target Date</label>
            <input 
              type="date" 
              className="admin-input" 
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value)
                setTargetDays('') // clear days if date is set
              }}
              disabled={busy || loading || !!error}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <PillButton
            label="Start Countdown"
            color="success"
            onClick={handleStartCountdown}
            disabled={busy || loading || !!error || (!targetDays && !targetDate)}
          />
        </div>

        <div className="admin-divider" />

        {/* Message Input */}
        <div className="admin-message-section">
          <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.5rem' }}>Display Message</label>
          <input 
            type="text" 
            className="admin-input" 
            placeholder="e.g. days until my birthday..." 
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={busy || loading || !!error}
          />
          <button 
            className="admin-submit-btn" 
            onClick={handleUpdateMessage}
            disabled={busy || loading || !!error}
            style={{ marginTop: '0.5rem' }}
          >
            Update Message
          </button>
        </div>

        <p className="admin-footer">live · supabase realtime</p>
      </div>
    </div>
  )
}
