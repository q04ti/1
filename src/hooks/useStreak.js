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
  const [autoModeEnabled, setAutoModeEnabled] = useState(false)
  const [autoModeDirection, setAutoModeDirection] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const displayedStreak = useSpringCounter(streak ?? 0)

  const getLocalYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const parseYMD = (ymdStr) => {
    const [y, m, d] = ymdStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Fetch initial value
  useEffect(() => {
    async function fetchStreak() {
      const { data, error } = await supabase
        .from('streak_data')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) {
        setError(error.message)
      } else {
        let currentValue = data.value;
        const todayStr = getLocalYMD();
        let shouldUpdateDB = false;
        let newDateStr = data.last_auto_update_date;

        if (data.auto_mode_enabled) {
          if (data.last_auto_update_date && data.last_auto_update_date !== todayStr) {
            const lastUpdateDate = parseYMD(data.last_auto_update_date);
            const todayDate = parseYMD(todayStr);
            const diffDays = Math.round((todayDate - lastUpdateDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
              currentValue += (diffDays * data.auto_mode_direction);
              shouldUpdateDB = true;
              newDateStr = todayStr;
            }
          } else if (!data.last_auto_update_date) {
            shouldUpdateDB = true;
            newDateStr = todayStr;
          }
        }

        if (shouldUpdateDB) {
          await supabase.from('streak_data').update({
            value: currentValue,
            last_auto_update_date: newDateStr
          }).eq('id', 1);
        }

        setStreak(currentValue)
        setMessage(data.message || '')
        setAutoModeEnabled(data.auto_mode_enabled || false)
        setAutoModeDirection(data.auto_mode_direction || 1)
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
          setAutoModeDirection(payload.new.auto_mode_direction || 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Update streak value in DB
  const updateStreak = useCallback(async (newValue, autoDirection) => {
    const updatePayload = { value: newValue }
    if (autoDirection !== undefined) {
      updatePayload.auto_mode_direction = autoDirection
      updatePayload.last_auto_update_date = getLocalYMD()
    }

    const { error } = await supabase
      .from('streak_data')
      .update(updatePayload)
      .eq('id', 1)
    if (error) throw error
    
    // Optimistically update
    setStreak(newValue)
    if (autoDirection !== undefined) {
      setAutoModeDirection(autoDirection)
    }
  }, [])

  const updateMessage = useCallback(async (newMessage) => {
    const { error } = await supabase
      .from('streak_data')
      .update({ message: newMessage })
      .eq('id', 1)
    if (error) throw error
    setMessage(newMessage)
  }, [])

  const toggleAutoMode = useCallback(async () => {
    const newEnabled = !autoModeEnabled;
    const { error } = await supabase
      .from('streak_data')
      .update({ 
        auto_mode_enabled: newEnabled,
        last_auto_update_date: newEnabled ? getLocalYMD() : null 
      })
      .eq('id', 1)
    if (error) throw error
    setAutoModeEnabled(newEnabled)
  }, [autoModeEnabled])

  return { 
    streak, 
    displayedStreak, 
    message, 
    loading, 
    error, 
    autoModeEnabled, 
    autoModeDirection, 
    updateStreak, 
    updateMessage,
    toggleAutoMode 
  }
}
