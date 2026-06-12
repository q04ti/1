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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const displayedStreak = useSpringCounter(streak ?? 0)

  // Fetch initial value
  useEffect(() => {
    async function fetchStreak() {
      const { data, error } = await supabase
        .from('streak_data')
        .select('value')
        .eq('id', 1)
        .single()
      if (error) {
        setError(error.message)
      } else {
        setStreak(data.value)
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

  return { streak, displayedStreak, loading, error, updateStreak }
}
