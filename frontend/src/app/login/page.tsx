"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import gsap from "gsap"

const VIDEO_SRC = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"

export default function Login() {
  const router = useRouter()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)

  /* ── GSAP entrance — staggered words + card ── */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.fromTo(".hero-word",
      { y: 80, opacity: 0, filter: "blur(12px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.14 }
    )
    .fromTo(".nav-pill",
      { y: -32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
      "-=0.7"
    )
    .fromTo(cardRef.current,
      { y: 48, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: "back.out(1.4)" },
      "-=0.4"
    )
    .fromTo(".auth-field",
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.08 },
      "-=0.25"
    )
    .fromTo(".stat-block",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
      "-=0.3"
    )
  }, [])

  /* ── Card 3-D tilt ── */
  const onCardMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current!.getBoundingClientRect()
    const dx = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)
    const dy = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)
    gsap.to(cardRef.current, { rotateX: -dy * 4, rotateY: dx * 4, duration: 0.4, ease: "power2.out", transformPerspective: 900 })
  }
  const onCardLeave = () =>
    gsap.to(cardRef.current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "elastic.out(1,0.5)" })

  /* ── Auth handler ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    gsap.to(".auth-btn", { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1 })

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError(authErr.message)
      gsap.to(cardRef.current, { x: [-8, 8, -6, 6, -3, 3, 0] as any, duration: 0.5, ease: "power2.out" })
    } else {
      setSuccess(true)
      gsap.to(cardRef.current, {
        scale: 0.97, opacity: 0, y: -20, duration: 0.4, ease: "power2.in",
        onComplete: () => router.push("/app/dashboard"),
      })
    }
    setLoading(false)
  }

  const inputBase: React.CSSProperties = {
    display: "block", width: "100%", height: "46px",
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.45)",
    padding: "0 20px", fontSize: "14px", color: "#fff", outline: "none",
    fontFamily: "'Readex Pro', system-ui, sans-serif",
    transition: "border-color 0.2s, box-shadow 0.2s",
    letterSpacing: "-0.01em",
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.5)"
    e.target.style.boxShadow   = "0 0 0 3px rgba(255,255,255,0.08)"
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.12)"
    e.target.style.boxShadow   = "none"
  }

  return (
    <section style={{ position: "relative", height: "100dvh", width: "100%", overflow: "hidden", background: "#000", fontFamily: "'Readex Pro', system-ui, sans-serif" }}>

      {/* ── Fullscreen video ── */}
      <video
        autoPlay loop muted playsInline
        src={VIDEO_SRC}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
      />

      {/* ── Dark overlay so text is legible ── */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 100%)" }} />

      {/* ── Floating pill navbar ── */}
      <nav style={{
        position: "absolute", zIndex: 20, top: 0, left: 0, right: 0,
        padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
      }}>
        {/* Logo pill */}
        <div className="nav-pill" style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(23,23,23,0.9)", backdropFilter: "blur(16px)",
          borderRadius: "9999px", paddingLeft: "16px", paddingRight: "24px", paddingTop: "12px", paddingBottom: "12px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <svg viewBox="0 0 256 256" style={{ height: "20px", width: "20px" }} fill="none">
            <path d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z" fill="#ffffff" />
          </svg>
          <span style={{ color: "#fff", fontSize: "14px", fontWeight: 400, letterSpacing: "-0.02em" }}>PropIQ</span>
        </div>

        {/* Center links pill — hidden on small screens via inline check; Tailwind handles md: */}
        <div className="nav-pill" style={{
          display: "flex", alignItems: "center", gap: "4px",
          background: "rgba(23,23,23,0.9)", backdropFilter: "blur(16px)",
          borderRadius: "9999px", padding: "8px 12px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {["platform", "portfolio", "analytics", "support"].map(l => (
            <a key={l} href="#" style={{
              color: "rgba(255,255,255,0.65)", fontSize: "13px", fontWeight: 400,
              padding: "8px 20px", borderRadius: "9999px",
              textDecoration: "none", letterSpacing: "-0.01em",
              transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
            >{l}</a>
          ))}
        </div>

        {/* CTA pill */}
        <Link href="/signup" className="nav-pill" style={{
          background: "#fff", color: "#000", fontSize: "13px", fontWeight: 400,
          borderRadius: "9999px", padding: "12px 24px", textDecoration: "none",
          letterSpacing: "-0.01em", transition: "background 0.2s",
          whiteSpace: "nowrap",
        }}
          onMouseEnter={e => (e.currentTarget.style.background = "#e5e5e5")}
          onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
        >
          get started
        </Link>
      </nav>

      {/* ── Staggered hero words ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", userSelect: "none" }}>
        <div className="hero-word" style={{
          position: "absolute", left: "40px", top: "18%",
          fontFamily: "'Readex Pro', system-ui, sans-serif",
          fontSize: "clamp(72px, 12vw, 180px)", fontWeight: 500,
          color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.95,
          textTransform: "lowercase",
        }}>manage</div>

        <div className="hero-word" style={{
          position: "absolute", right: "40px", top: "38%",
          fontFamily: "'Readex Pro', system-ui, sans-serif",
          fontSize: "clamp(72px, 12vw, 180px)", fontWeight: 500,
          color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.95,
          textTransform: "lowercase", textAlign: "right",
        }}>your</div>

        <div className="hero-word" style={{
          position: "absolute", left: "22%", top: "58%",
          fontFamily: "'Readex Pro', system-ui, sans-serif",
          fontSize: "clamp(72px, 12vw, 180px)", fontWeight: 500,
          color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.95,
          textTransform: "lowercase",
        }}>portfolio</div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-block" style={{ position: "absolute", right: "96px", top: "14%", textAlign: "right", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
          <div style={{ height: "1px", width: "80px", background: "rgba(255,255,255,0.35)", transform: "rotate(20deg)" }} />
          <span style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 500, color: "#fff", letterSpacing: "-0.04em" }}>+12k</span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>units managed</div>
      </div>

      <div className="stat-block" style={{ position: "absolute", left: "80px", bottom: "100px", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 500, color: "#fff", letterSpacing: "-0.04em" }}>+98%</span>
          <div style={{ height: "1px", width: "80px", background: "rgba(255,255,255,0.35)", transform: "rotate(-20deg)" }} />
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>collection rate</div>
      </div>

      <div className="stat-block" style={{ position: "absolute", right: "80px", bottom: "80px", textAlign: "right", zIndex: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
          <div style={{ height: "1px", width: "80px", background: "rgba(255,255,255,0.35)", transform: "rotate(-20deg)" }} />
          <span style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 500, color: "#fff", letterSpacing: "-0.04em" }}>+500</span>
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>property managers</div>
      </div>

      {/* ── Bottom gradient ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "200px", background: "linear-gradient(to bottom, transparent, #000)", pointerEvents: "none" }} />

      {/* ── Centered auth card ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        pointerEvents: "none",
      }}>
        <div
          ref={cardRef}
          onMouseMove={onCardMove}
          onMouseLeave={onCardLeave}
          style={{
            pointerEvents: "all",
            width: "100%", maxWidth: "400px",
            background: "rgba(10,10,10,0.82)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px",
            padding: "40px 36px",
            boxShadow: "0 40px 80px -16px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)",
            transformStyle: "preserve-3d",
            position: "relative",
          }}
        >
          {/* Top shimmer line */}
          <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: "1px", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)" }} />

          <h1 style={{
            fontFamily: "'Readex Pro', system-ui, sans-serif",
            fontSize: "22px", fontWeight: 500, color: "#fff",
            letterSpacing: "-0.04em", lineHeight: 0.95,
            marginBottom: "6px", textAlign: "center", textTransform: "lowercase",
          }}>welcome back</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", textAlign: "center", marginBottom: "30px", fontWeight: 300, letterSpacing: "-0.01em" }}>
            sign in to your portfolio dashboard
          </p>

          {error && (
            <div style={{
              marginBottom: "20px", padding: "12px 16px", borderRadius: "12px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.8)", fontSize: "13px",
            }}>⚠ {error}</div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="auth-field">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: 400, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                email address
              </label>
              <input type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputBase} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <div className="auth-field">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: 400, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                password
              </label>
              <input type="password" required autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputBase} onFocus={onFocus} onBlur={onBlur}
              />
            </div>

            <button type="submit" className="auth-btn"
              disabled={loading || success}
              style={{
                width: "100%", height: "48px", borderRadius: "9999px", marginTop: "8px",
                background: success ? "rgba(255,255,255,0.9)" : "#fff",
                border: "none", color: "#000",
                fontSize: "14px", fontWeight: 400,
                fontFamily: "'Readex Pro', system-ui, sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "-0.02em",
                opacity: loading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "background 0.2s, opacity 0.2s",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#e5e5e5" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff" }}
            >
              {loading ? (
                <><div style={{ width: "16px", height: "16px", border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />signing in…</>
              ) : success ? "redirecting…" : "sign in →"}
            </button>
          </form>

          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: "20px", letterSpacing: "-0.01em" }}>
            no account?{" "}
            <Link href="/signup" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
            >create one free →</Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  )
}
