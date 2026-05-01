"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Bell, Settings, X, Check } from "lucide-react"

gsap.registerPlugin(useGSAP)

const ALERTS = [
  { id: 1, severity: "urgent", color: "#f43f5e", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.2)", label: "Urgent", title: "Lease Expiry Warning", desc: "Unit 14B (Jane Smith) expires in 15 days. Renewal pending.", time: "2 hours ago" },
  { id: 2, severity: "info",   color: "#3b82f6", bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)",  label: "System", title: "Document Ingestion Complete", desc: "lease_agreement_14B.pdf vectorized & indexed into AI Search.", time: "5 hours ago" },
  { id: 3, severity: "warn",   color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", label: "Warning", title: "Rent Payment Overdue", desc: "Unit 7C payment of ₹32,000 is 3 days past due date.", time: "1 day ago" },
  { id: 4, severity: "ok",     color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)", label: "OK", title: "Maintenance Ticket Closed", desc: "Plumbing issue in Unit 4A resolved by FastFix Plumbers.", time: "2 days ago" },
]

export default function Alerts() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header",  { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-filter",  { opacity: 0, y: 12 },  { opacity: 1, y: 0, duration: 0.35 }, "-=0.15")
      .fromTo(".alert-card",   { opacity: 0, x: -24, scale: 0.97 },
                               { opacity: 1, x: 0,  scale: 1,  duration: 0.45, stagger: 0.08, ease: "back.out(1.3)" }, "-=0.1")
  }, { scope: ref })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>
      {/* Header */}
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>SYSTEM</p>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Bell size={22} color="var(--text-2)" /> Alerts
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Active system alerts and notifications.</p>
        </div>
        <button className="anim-filter" style={{
          display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px",
          borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)",
          color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
          onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0,  duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
        >
          <Settings size={14} /> Configure
        </button>
      </header>

      {/* Filter */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px" }}>
        {["All Alerts", "Urgent", "System", "Warning"].map((f, i) => (
          <button key={f} style={{
            padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent",
            border: i === 0 ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)",
            color: i === 0 ? "#fff" : "var(--text-3)",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)" }}
            onMouseLeave={e => { if (i !== 0) { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.background = "transparent" } }}
          >{f}</button>
        ))}
      </div>

      {/* Alert cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {ALERTS.map((alert) => (
          <div key={alert.id} className="alert-card" style={{
            display: "flex", alignItems: "flex-start", gap: "16px",
            padding: "18px 20px",
            borderRadius: "14px",
            background: alert.bg,
            border: `1px solid ${alert.border}`,
            borderLeft: `3px solid ${alert.color}`,
            transition: "transform 0.2s, box-shadow 0.2s",
            cursor: "default",
          }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -2, boxShadow: `0 8px 24px rgba(0,0,0,0.3)`, duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0,  boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: alert.color, boxShadow: `0 0 10px ${alert.color}`, flexShrink: 0, marginTop: "6px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: `${alert.color}20`, color: alert.color, border: `1px solid ${alert.color}30`, letterSpacing: "0.04em" }}>{alert.label}</span>
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: "14px", color: "#fff" }}>{alert.title}</span>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>{alert.desc}</p>
              <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "6px 0 0", fontFamily: "'DM Mono', monospace" }}>{alert.time}</p>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.15)"; e.currentTarget.style.color = "#34d399" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
              ><Check size={13} /></button>
              <button style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.12)"; e.currentTarget.style.color = "#fb7185" }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
              ><X size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
