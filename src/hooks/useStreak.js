import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Spring-based count interpolation hook.
 * Animates from current displayed value toward target using spring physics.
 */
function useSpringCounter(target) {
  const [displayed, setDisplayed] = useState(target)
  const animRef = useRef(null)
  const stateRef = useRef({ pos: target, vel: 0, target })

  useEffect(() => {
    stateRef.current.target = target

    const stiffness = 140
    const damping = 18
    const mass = 1
    const dt = 1 / 60

    function step() {
      const s = stateRef.current
      const dist = s.target - s.pos
      const springForce = stiffness * dist
      const dampForce = damping * s.vel
      const acc = (springForce - dampForce) / mass
      s.vel += acc * dt
      s.pos += s.vel * dt

      const displayVal = Math.round(s.pos)
      setDisplayed(displayVal)

      if (Math.abs(dist) < 0.01 && Math.abs(s.vel) < 0.01) {
        s.pos = s.target
        s.vel = 0
        setDisplayed(s.target)
        return
      }
      animRef.current = requestAnimationFrame(step)
    }

    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animRef.current)
  }, [target])

  return displayed
}

export function useStreak() {
  const [streak, setStreak] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [autoModeEnabled, setAutoModeEnabled] = useState(false)
  const [autoModeDirection, setAutoModeDirection] = useState(null)
  const [lastAutoRunDate, setLastAutoRunDate] = useState(null)
  const [tick, setTick] = useState(0)

  const displayedStreak = useSpringCounter(streak ?? 0)

  // Fetch initial value
  useEffect(() => {
    async function fetchStreak() {
      const { data, error } = await supabase
        .from('streak_data')
        .select('value, message, auto_mode_enabled, auto_mode_direction, last_auto_run_date')
        .eq('id', 1)
        .maybeSingle()
      
      if (error) {
        setError(error.message)
      } else if (!data) {
        setError('Database empty. Please insert a row with id=1 in Supabase.')
      } else {
        setStreak(data.value)
        setMessage(data.message || '')
        setAutoModeEnabled(data.auto_mode_enabled || false)
        setAutoModeDirection(data.auto_mode_direction || null)
        setLastAutoRunDate(data.last_auto_run_date || null)
      }
      setLoading(false)
    }
    fetchStreak()
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('streak-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'streak_data', filter: 'id=eq.1' },
        (payload) => {
          setStreak(payload.new.value)
          setMessage(payload.new.message || '')
          setAutoModeEnabled(payload.new.auto_mode_enabled || false)
          setAutoModeDirection(payload.new.auto_mode_direction || null)
          setLastAutoRunDate(payload.new.last_auto_run_date || null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Update streak value in DB
  const updateStreak = useCallback(async (newValue) => {
    const { error } = await supabase
      .from('streak_data')
      .update({ value: newValue })
      .eq('id', 1)
    if (error) throw error
    // Optimistically update local state too (realtime will confirm)
    setStreak(newValue)
  }, [])

  const updateMessage = useCallback(async (newMessage) => {
    const { error } = await supabase
      .from('streak_data')
      .update({ message: newMessage })
      .eq('id', 1)
    if (error) throw error
    setMessage(newMessage)
  }, [])

  const updateAutoMode = useCallback(async ({ enabled, direction, lastRunDate }) => {
    const updates = {}
    if (enabled !== undefined) updates.auto_mode_enabled = enabled
    if (direction !== undefined) updates.auto_mode_direction = direction
    if (lastRunDate !== undefined) updates.last_auto_run_date = lastRunDate

    const { error } = await supabase
      .from('streak_data')
      .update(updates)
      .eq('id', 1)
    if (error) throw error

    if (enabled !== undefined) setAutoModeEnabled(enabled)
    if (direction !== undefined) setAutoModeDirection(direction)
    if (lastRunDate !== undefined) setLastAutoRunDate(lastRunDate)
  }, [])

  const updateAll = useCallback(async ({ newValue, newMessage, autoModeEnabled, autoModeDirection, lastRunDate }) => {
    const updates = {}
    if (newValue !== undefined) updates.value = newValue
    if (newMessage !== undefined) updates.message = newMessage
    if (autoModeEnabled !== undefined) updates.auto_mode_enabled = autoModeEnabled
    if (autoModeDirection !== undefined) updates.auto_mode_direction = autoModeDirection
    if (lastRunDate !== undefined) updates.last_auto_run_date = lastRunDate

    const { error } = await supabase
      .from('streak_data')
      .update(updates)
      .eq('id', 1)
    if (error) throw error

    if (newValue !== undefined) setStreak(newValue)
    if (newMessage !== undefined) setMessage(newMessage)
    if (autoModeEnabled !== undefined) setAutoModeEnabled(autoModeEnabled)
    if (autoModeDirection !== undefined) setAutoModeDirection(autoModeDirection)
    if (lastRunDate !== undefined) setLastAutoRunDate(lastRunDate)
  }, [])

  // Midnight tick logic on load & automatic rollover
  useEffect(() => {
    if (loading || !autoModeEnabled || !autoModeDirection || streak === null) return

    const d = new Date()
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const runTick = async () => {
      if (!lastAutoRunDate) {
        const { error } = await supabase
          .from('streak_data')
          .update({ last_auto_run_date: todayStr })
          .eq('id', 1)
        if (!error) setLastAutoRunDate(todayStr)
        return
      }

      if (todayStr > lastAutoRunDate) {
        const today = new Date(todayStr)
        const lastRun = new Date(lastAutoRunDate)
        const diffTime = Math.abs(today - lastRun)
        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        if (daysPassed > 0) {
          let newStreak = streak + (autoModeDirection === 'up' ? daysPassed : -daysPassed)
          if (newStreak < 0) newStreak = 0

          const { error } = await supabase
            .from('streak_data')
            .update({ value: newStreak, last_auto_run_date: todayStr })
            .eq('id', 1)
          if (!error) {
            setStreak(newStreak)
            setLastAutoRunDate(todayStr)
          }
        }
      }
    }

    runTick()

    // Calculate time until next midnight and set a timeout to re-trigger
    const nextMidnight = new Date()
    nextMidnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = nextMidnight - new Date() + 1000 // Add 1s safety buffer

    const timeout = setTimeout(() => {
      setTick(t => t + 1)
    }, msUntilMidnight)

    return () => clearTimeout(timeout)
  }, [loading, autoModeEnabled, autoModeDirection, lastAutoRunDate, streak, tick])

  return { 
    streak, displayedStreak, message, loading, error, 
    updateStreak, updateMessage, updateAutoMode, updateAll,
    autoModeEnabled, autoModeDirection, lastAutoRunDate 
  }
}
