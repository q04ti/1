import { useEffect, useRef } from 'react'

// ── Ember particle (fire, floats UP) ─────────────────────────────────────────
function createEmber(canvas) {
  const x = Math.random() * canvas.width
  const y = canvas.height + Math.random() * 40
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 0.8,
    vy: -(Math.random() * 1.8 + 0.6),
    size: Math.random() * 3.5 + 1,
    opacity: Math.random() * 0.6 + 0.3,
    life: 1,
    decay: Math.random() * 0.004 + 0.002,
    hue: Math.random() * 30 + 15, // 15-45 → red-orange-yellow
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.04 + 0.01,
  }
}

// ── Ice crystal particle (floats DOWN) ───────────────────────────────────────
function createCrystal(canvas) {
  const x = Math.random() * canvas.width
  const y = -(Math.random() * 40)
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 0.5,
    vy: Math.random() * 1.2 + 0.4,
    size: Math.random() * 4 + 2,
    opacity: Math.random() * 0.5 + 0.25,
    life: 1,
    decay: Math.random() * 0.003 + 0.0015,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.03,
    branches: Math.floor(Math.random() * 2) + 3, // 3 or 4 pairs
  }
}

function drawEmber(ctx, p) {
  ctx.save()
  ctx.globalAlpha = p.opacity * p.life
  const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
  gradient.addColorStop(0, `rgba(215, 189, 134, 1)`)
  gradient.addColorStop(0.4, `rgba(215, 189, 134, 0.8)`)
  gradient.addColorStop(1, `rgba(215, 189, 134, 0)`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
  ctx.fill()
  // bright core
  ctx.fillStyle = `rgba(215, 189, 134, 0.9)`
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawCrystal(ctx, p) {
  ctx.save()
  ctx.globalAlpha = p.opacity * p.life
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  const arms = p.branches * 2
  const len = p.size * 3.5
  for (let i = 0; i < arms; i++) {
    const angle = (Math.PI * 2 / arms) * i
    ctx.save()
    ctx.rotate(angle)
    // main arm
    ctx.strokeStyle = `rgba(215, 189, 134, 0.85)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -len)
    ctx.stroke()
    // side branches
    const branchLen = len * 0.35
    const branchY = -len * 0.5
    ctx.lineWidth = 0.8
    ctx.strokeStyle = `rgba(215, 189, 134, 0.6)`
    ctx.beginPath()
    ctx.moveTo(0, branchY)
    ctx.lineTo(branchLen * 0.6, branchY - branchLen * 0.5)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, branchY)
    ctx.lineTo(-branchLen * 0.6, branchY - branchLen * 0.5)
    ctx.stroke()
    ctx.restore()
  }
  // glint center
  ctx.fillStyle = `rgba(215, 189, 134, 0.9)`
  ctx.beginPath()
  ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function useParticles(canvasRef, mode) {
  const particlesRef = useRef([])
  const animRef = useRef(null)
  const modeRef = useRef(mode)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const MAX_PARTICLES = 80

    function tick() {
      const currentMode = modeRef.current
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (currentMode === 'zero') {
        particlesRef.current = []
        animRef.current = requestAnimationFrame(tick)
        return
      }

      // Spawn
      if (particlesRef.current.length < MAX_PARTICLES) {
        const spawnCount = currentMode === 'positive' ? 2 : 1
        for (let i = 0; i < spawnCount; i++) {
          if (currentMode === 'positive') {
            particlesRef.current.push(createEmber(canvas))
          }
        }
      }

      // Update & draw
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      for (const p of particlesRef.current) {
        p.life -= p.decay
        p.x += p.vx
        p.y += p.vy
        if (currentMode === 'positive') {
          p.wobble += p.wobbleSpeed
          p.x += Math.sin(p.wobble) * 0.4
          drawEmber(ctx, p)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef])
}
