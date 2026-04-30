"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { BarChart3, TrendingUp, Users, Building2, DollarSign } from "lucide-react"

gsap.registerPlugin(useGSAP)

const METRICS = [
  { label: "Occupancy Rate", value: "97%",   sub: "+2% vs last month", color: "#10b981", icon: Building2 },
  { label: "Revenue MTD",    value: "₹8.4L", sub: "92% of target",     color: "#3b82f6", icon: DollarSign },
  { label: "New Leads",      value: "34",    sub: "↑ 18% this week",   color: "#f59e0b", icon: Users },
  { label: "Avg Rent",       value: "₹42K",  sub: "Per unit / month",  color: "#7c3aed", icon: TrendingUp },
]

const BAR_DATA = [
  { month: "Nov", value: 72 }, { month: "Dec", value: 85 },
  { month: "Jan", value: 79 }, { month: "Feb", value: 91 },
  { month: "Mar", value: 88 }, { month: "Apr", value: 96 },
]

export default function Analytics() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-stat",   { opacity: 0, y: 24, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.07, ease: "back.out(1.4)" }, "-=0.2")
      .fromTo(".anim-card",   { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1 }, "-=0.2")
      .fromTo(".bar-fill",    { scaleY: 0 }, { scaleY: 1, duration: 0.65, stagger: 0.06, ease: "back.out(1.2)", transformOrigin: "bottom" }, "-=0.1")
      .fromTo(".ring-fill",   { strokeDashoffset: 283 }, { strokeDashoffset: 9, duration: 1.2, ease: "power2.out" }, "<")
  }, { scope: ref })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <header className="page-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>LIVE METRICS</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <BarChart3 size={22} color="var(--text-2)" /> Analytics
        </h1>
        <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Portfolio performance and revenue insights.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
        {METRICS.map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="anim-stat" style={{ padding: "20px", borderRadius: "14px", background: `linear-gradient(135deg,${color}14,${color}05)`, border: `1px solid ${color}22`, position: "relative", overflow: "hidden", cursor: "default" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -4, boxShadow: `0 16px 40px ${color}30`, duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ position: "absolute", top: "-16px", right: "-16px", width: "60px", height: "60px", borderRadius: "50%", background: color, opacity: 0.12, filter: "blur(12px)", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}30` }}>
                <Icon size={13} color={color} />
              </div>
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "28px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "11px", color, marginTop: "6px", fontWeight: 500 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
        {/* Bar chart */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>Revenue vs Target</div>
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Last 6 months</div>
            </div>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "99px", background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>↑ 96%</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "110px" }}>
            {BAR_DATA.map(({ month, value }) => (
              <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div className="bar-fill" style={{ width: "100%", borderRadius: "5px 5px 0 0", background: "linear-gradient(180deg,#3b82f6,#6366f1)", height: `${value}%`, boxShadow: "0 0 12px rgba(59,130,246,0.3)" }} />
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>Portfolio Occupancy</div>
          <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "20px" }}>Real-time unit status</div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <svg width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
              <circle className="ring-fill" cx="50" cy="50" r="45" fill="none" stroke="url(#ringGrad)" strokeWidth="8"
                strokeDasharray="283" strokeDashoffset="283" strokeLinecap="round" transform="rotate(-90 50 50)" />
              <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
              <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="Sora,sans-serif">97%</text>
              <text x="50" y="60" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="DM Sans,sans-serif">Occupied</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[{ label: "Occupied", val: 138, color: "#10b981" }, { label: "Vacant", val: 4, color: "#f59e0b" }].map(({ label, val, color }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{label}</span>
                    <span style={{ fontSize: "12px", color, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{val}</span>
                  </div>
                  <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-3)" }}>
                    <div className="bar-fill" style={{ height: "100%", borderRadius: "99px", background: color, width: `${Math.round(val/142*100)}%`, boxShadow: `0 0 8px ${color}` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>Lead Conversion Funnel</div>
          {[{ stage: "New Intake", count: 34, color: "#3b82f6", pct: 100 }, { stage: "Viewing", count: 18, color: "#7c3aed", pct: 53 }, { stage: "Negotiating", count: 8, color: "#f59e0b", pct: 24 }, { stage: "Closed", count: 5, color: "#10b981", pct: 15 }].map(({ stage, count, color, pct }) => (
            <div key={stage} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{stage}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color, fontFamily: "'DM Mono',monospace" }}>{count}</span>
              </div>
              <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-3)", overflow: "hidden" }}>
                <div className="bar-fill" style={{ height: "100%", borderRadius: "99px", background: color, width: `${pct}%`, boxShadow: `0 0 8px ${color}50` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Lease timeline */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>Lease Expiry Timeline</div>
          {[{ period: "This Month", count: 2, color: "#f43f5e" }, { period: "Next 30 days", count: 5, color: "#f59e0b" }, { period: "60–90 days", count: 12, color: "#3b82f6" }, { period: "90+ days", count: 123, color: "#10b981" }].map(({ period, count, color }) => (
            <div key={period} className="anim-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>{period}</span>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
