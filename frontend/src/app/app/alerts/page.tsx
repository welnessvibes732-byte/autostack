"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Bell, Settings, X, Check, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

gsap.registerPlugin(useGSAP)

const SEVERITY_MAP: Record<string, { color: string; bg: string; border: string; label: string }> = {
  urgent:  { color: "#f43f5e", bg: "rgba(244,63,94,0.08)",  border: "rgba(244,63,94,0.2)",  label: "Urgent" },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", label: "Warning" },
  info:    { color: "#3b82f6", bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)", label: "System" },
  ok:      { color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", label: "OK" },
}

export default function Alerts() {
  const ref = useRef<HTMLDivElement>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
        if (error) throw error
        setAlerts(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const dismiss = async (id: string) => {
    setAlerts(a => a.filter(x => x.id !== id))
    await supabase.from("alerts").update({ status: "dismissed" }).eq("id", id)
  }

  const acknowledge = async (id: string) => {
    setAlerts(a => a.map(x => x.id === id ? { ...x, status: "acknowledged" } : x))
    await supabase.from("alerts").update({ status: "acknowledged" }).eq("id", id)
  }

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header",  { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-filter",  { opacity: 0, y: 12 },  { opacity: 1, y: 0, duration: 0.35 }, "-=0.15")
      .fromTo(".alert-card",   { opacity: 0, x: -24, scale: 0.97 },
                               { opacity: 1, x: 0,  scale: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.3)" }, "-=0.1")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>SYSTEM</p>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={22} color="var(--text-2)" /> Alerts
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Active system alerts and notifications.</p>
        </div>
        <button className="anim-filter" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)", color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s" }}
          onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
          onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0,  duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
        >
          <Settings size={14} /> Configure
        </button>
      </header>

      <div className="anim-filter" style={{ display: "flex", gap: "10px" }}>
        {["All Alerts", "Urgent", "System", "Warning"].map((f, i) => (
          <button key={f} style={{ padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent", border: i === 0 ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)", color: i === 0 ? "#fff" : "var(--text-3)", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
            onMouseLeave={e => { if (i !== 0) { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent" } }}
          >{f}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "14px" }} />)
        ) : alerts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-3)", fontSize: "14px", background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)" }}>
            <Bell size={28} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No alerts right now. All systems clear!</p>
          </div>
        ) : alerts.map((alert) => {
          const sev = SEVERITY_MAP[alert.severity] || SEVERITY_MAP["info"]
          const timeAgo = new Date(alert.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
          return (
            <div key={alert.id} className="alert-card" style={{ display: "flex", alignItems: "flex-start", gap: "16px", padding: "18px 20px", borderRadius: "14px", background: sev.bg, border: `1px solid ${sev.border}`, borderLeft: `3px solid ${sev.color}`, transition: "transform 0.2s", cursor: "default", opacity: alert.status === "dismissed" ? 0.4 : 1 }}
              onMouseEnter={e => gsap.to(e.currentTarget, { y: -2, boxShadow: `0 8px 24px rgba(0,0,0,0.3)`, duration: 0.25 })}
              onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: sev.color, boxShadow: `0 0 10px ${sev.color}`, flexShrink: 0, marginTop: "6px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: `${sev.color}20`, color: sev.color, border: `1px solid ${sev.color}30`, letterSpacing: "0.04em" }}>{sev.label}</span>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: "14px", color: "#fff" }}>{alert.title || alert.message}</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{alert.message || alert.description}</p>
                <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "6px 0 0", fontFamily: "'DM Mono', monospace" }}>{timeAgo}</p>
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button onClick={() => acknowledge(alert.id)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.15)"; e.currentTarget.style.color = "#34d399" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                ><Check size={13} /></button>
                <button onClick={() => dismiss(alert.id)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.12)"; e.currentTarget.style.color = "#fb7185" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                ><X size={13} /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
