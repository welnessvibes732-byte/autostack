"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Receipt, Plus, FileText, AlertTriangle, CheckCircle2 } from "lucide-react"

gsap.registerPlugin(useGSAP)

const INVOICES = [
  { id: "INV-2026-04-001", vendor: "Elite Plumbing", unit: "Unit 4A", amount: "₹12,500", ocr: "100%", ocrOk: true, status: "Pending", statusColor: "#f59e0b" },
  { id: "INV-2026-04-002", vendor: "SparkFix Electrical", unit: "Unit 8B", amount: "₹8,200", ocr: "94%", ocrOk: true, status: "Approved", statusColor: "#10b981" },
  { id: "INV-2026-04-003", vendor: "ColorPro Paints", unit: "Unit 12C", amount: "₹22,000", ocr: "71%", ocrOk: false, status: "Anomaly", statusColor: "#f43f5e" },
]

export default function Invoices() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-stat",   { opacity: 0, y: 20, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-filter", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".anim-row",    { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.09 }, "-=0.1")
  }, { scope: ref })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>FINANCE</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Receipt size={22} color="var(--text-2)" /> Invoices
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Vendor invoices, OCR extraction, and anomaly detection.</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.3)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
        ><Plus size={14} /> Upload Invoice</button>
      </header>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
        {[
          { label: "Pending Approval", value: "4",    color: "#f59e0b", icon: Receipt },
          { label: "Anomalies Found",  value: "1",    color: "#f43f5e", icon: AlertTriangle },
          { label: "Processed (30d)",  value: "₹2.8L",color: "#10b981", icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="anim-stat" style={{ padding: "18px 20px", borderRadius: "14px", background: `linear-gradient(135deg,${color}12,${color}04)`, border: `1px solid ${color}22`, display: "flex", alignItems: "center", gap: "14px", cursor: "default" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -3, boxShadow: `0 12px 30px ${color}25`, duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}30`, flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "22px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "3px" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px" }}>
        {["All", "Pending", "Approved", "Anomaly"].map((f, i) => (
          <button key={f} style={{ padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent", border: i === 0 ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)", color: i === 0 ? "#fff" : "var(--text-3)", transition: "all 0.2s" }}
            onMouseEnter={e => { if(i!==0){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.05)"} }}
            onMouseLeave={e => { if(i!==0){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent"} }}
          >{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Invoice ID","Vendor","Unit","Amount","OCR Match","Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv, i) => (
              <tr key={inv.id} className="anim-row" style={{ borderBottom: i < INVOICES.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px", fontSize: "12px", color: "var(--text-2)", fontFamily: "'DM Mono',monospace" }}>{inv.id}</td>
                <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 600, color: "#fff" }}>{inv.vendor}</td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{inv.unit}</td>
                <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "'DM Mono',monospace" }}>{inv.amount}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: inv.ocrOk ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.12)", color: inv.ocrOk ? "#34d399" : "#fb7185", border: `1px solid ${inv.ocrOk ? "rgba(16,185,129,0.25)" : "rgba(244,63,94,0.25)"}` }}>
                    <FileText size={10} /> {inv.ocr}
                  </span>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${inv.statusColor}15`, color: inv.statusColor, border: `1px solid ${inv.statusColor}30` }}>{inv.status}</span>
                </td>
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <button style={{ fontSize: "12px", fontWeight: 500, color: "#93c5fd", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#93c5fd")}
                  >Review →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
