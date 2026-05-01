"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Wrench, Plus, Users, AlertCircle, Clock, CheckCircle2 } from "lucide-react"

gsap.registerPlugin(useGSAP)

const TICKETS = [
  { id: "#TKT-1001", unit: "Unit 4A", issue: "Plumbing", priority: "High", priorityColor: "#f43f5e", status: "Open", statusColor: "#f59e0b", vendor: "—" },
  { id: "#TKT-1002", unit: "Unit 8B", issue: "Electrical", priority: "Medium", priorityColor: "#f59e0b", status: "In Progress", statusColor: "#3b82f6", vendor: "SparkFix Co." },
  { id: "#TKT-1003", unit: "Unit 12C", issue: "Painting", priority: "Low", priorityColor: "#10b981", status: "Closed", statusColor: "#10b981", vendor: "ColorPro" },
]

export default function Maintenance() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-stat",   { opacity: 0, y: 20, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-filter", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".anim-row",    { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08 }, "-=0.1")
  }, { scope: ref })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)"  }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>OPERATIONS</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Wrench size={22} color="var(--text-2)" /> Maintenance
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Ticket tracking, vendor assignment, and issue resolution.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)", color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
            onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0, duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
          ><Users size={14} /> Vendors</button>
          <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", transition: "all 0.2s" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.03, y: -2, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
          ><Plus size={14} /> New Ticket</button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "14px" }}>
        {[
          { label: "Open Tickets",    value: "8",  icon: AlertCircle,   color: "#f43f5e" },
          { label: "In Progress",     value: "3",  icon: Clock,         color: "#f59e0b" },
          { label: "Resolved (30d)",  value: "14", icon: CheckCircle2,  color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="anim-stat" style={{ padding: "18px 20px", borderRadius: "14px", background: "#0D0D0D", border: "1px solid #1E1E1E", display: "flex", alignItems: "center", gap: "14px", cursor: "default" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -3, boxShadow: `0 12px 32px ${color}25`, duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #333", flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "22px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "3px" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px" }}>
        {["All", "Open", "In Progress", "Closed"].map((f, i) => (
          <button key={f} style={{ padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: i === 0 ? "rgba(59,130,246,0.12)" : "transparent", border: i === 0 ? "1px solid rgba(59,130,246,0.25)" : "1px solid var(--border)", color: i === 0 ? "#93c5fd" : "var(--text-3)", transition: "all 0.2s" }}
            onMouseEnter={e => { if(i!==0){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.04)"} }}
            onMouseLeave={e => { if(i!==0){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent"} }}
          >{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Ticket ID", "Unit", "Issue", "Priority", "Status", "Vendor", ""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TICKETS.map((t, i) => (
              <tr key={t.id} className="anim-row" style={{ borderBottom: i < TICKETS.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)", fontFamily: "'DM Mono',monospace" }}>{t.id}</td>
                <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 600, color: "#fff" }}>{t.unit}</td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{t.issue}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${t.priorityColor}15`, color: t.priorityColor, border: `1px solid ${t.priorityColor}30` }}>{t.priority}</span>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${t.statusColor}15`, color: t.statusColor, border: `1px solid ${t.statusColor}30` }}>{t.status}</span>
                </td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: t.vendor === "—" ? "var(--text-3)" : "var(--text-2)", fontStyle: t.vendor === "—" ? "italic" : "normal" }}>{t.vendor}</td>
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <button style={{ fontSize: "12px", fontWeight: 500, color: "#93c5fd", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#93c5fd")}
                  >View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
