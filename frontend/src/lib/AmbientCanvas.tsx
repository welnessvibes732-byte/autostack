"use client"
import { useEffect, useRef } from "react"

interface Particle {
  x: number; y: number; vx: number; vy: number
  radius: number; opacity: number; color: string; life: number; maxLife: number
}

interface Orb {
  x: number; y: number; vx: number; vy: number
  radius: number; color: string; opacity: number
}

const PALETTE = ["#3b82f6", "#7c3aed", "#10b981", "#f59e0b", "#f43f5e"]

function rand(min: number, max: number) { return Math.random() * (max - min) + min }

export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    const particles: Particle[] = []
    const orbs: Orb[] = []

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Spawn slow-moving nebula orbs
    for (let i = 0; i < 5; i++) {
      orbs.push({
        x: rand(0, window.innerWidth),
        y: rand(0, window.innerHeight),
        vx: rand(-0.08, 0.08),
        vy: rand(-0.06, 0.06),
        radius: rand(180, 320),
        color: PALETTE[i % PALETTE.length],
        opacity: rand(0.025, 0.055),
      })
    }

    const spawnParticle = () => {
      particles.push({
        x: rand(0, canvas.width),
        y: rand(canvas.height + 10, canvas.height + 40),
        vx: rand(-0.4, 0.4),
        vy: rand(-0.6, -1.4),
        radius: rand(1, 2.5),
        opacity: rand(0.3, 0.8),
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        life: 0,
        maxLife: rand(120, 280),
      })
    }

    let frame = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      // Spawn particles occasionally
      if (frame % 4 === 0 && particles.length < 80) spawnParticle()

      // Draw orbs (large blurred glows)
      for (const orb of orbs) {
        orb.x += orb.vx
        orb.y += orb.vy
        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        grad.addColorStop(0, orb.color + Math.round(orb.opacity * 255).toString(16).padStart(2, "0"))
        grad.addColorStop(1, "transparent")
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life++
        const t = p.life / p.maxLife
        const alpha = p.opacity * (1 - t * t)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, "0")
        ctx.fill()
        if (p.life >= p.maxLife) particles.splice(i, 1)
      }
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", width: "100%", height: "100%",
      }}
      aria-hidden="true"
    />
  )
}
