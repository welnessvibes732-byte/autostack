"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Link2, CheckCircle2, XCircle, Workflow, Mail, MessageSquare, Zap, Globe } from "lucide-react"

gsap.registerPlugin(useGSAP)

const INTEGRATIONS = [
  { name: "Google Workspace", desc: "Ingest documents directly from Gmail and Drive. Auto-vectorise on receive.", status: "connected", icon: Mail, color: "#10b981" },
  { name: "WhatsApp Business", desc: "Send alerts, lease reminders, and lead follow-ups via WhatsApp automation.", status: "disconnected", icon: MessageSquare, color: "#3b82f6" },
  { name: "n8n Webhooks", desc: "Trigger custom operational workflows from any PropIQ event.", status: "disconnected", icon: Workflow, color: "#7c3aed" },
  { name: "Zapier", desc: "Connect to 5000+ apps. Automate repetitive data workflows.", status: "disconnected", icon: Zap, color: "#f59e0b" },
  { name: "Zoho CRM", desc: "Sync leads and contacts bidirectionally with Zoho.", status: "disconnected", icon: Globe, color: "#f43f5e" },
  { name: "Tally / QuickBooks", desc: "Push rent collections and invoices to your accounting software.", status: "disconnected", icon: Link2, color: "#10b981" },
]

export default function Integrations() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".int-card", { opacity: 0, y: 28, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.07, ease: "back.out(1.3)" }, "-=0.2")
  }, { scope: ref })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <header className="page-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>ECOSYSTEM</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <Link2 size={22} color="var(--text-2)" /> Integrations
        </h1>
        <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Connect external services to the PropIQ ecosystem.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
        {INTEGRATIONS.map(({ name, desc, status, icon: Icon, color }) => {
          const connected = status === "connected"
          return (
            <div key={name} className="int-card" style={{ padding: "22px", borderRadius: "16px", background: "var(--surface)", border: `1px solid ${connected ? color + "30" : "var(--border)"}`, display: "flex", flexDirection: "column", gap: "14px", position: "relative", overflow: "hidden", cursor: "default" }}
              onMouseEnter={e => gsap.to(e.currentTarget, { y: -4, boxShadow: `0 16px 40px ${color}20`, duration: 0.25 })}
              onMouseLeave={e => gsap.to(e.currentTarget, { y: 0,  boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
            >
              {connected && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg,transparent,${color},transparent)` }} />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}15`, border: "1px solid #333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "99px", background: connected ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)", border: connected ? "1px solid rgba(16,185,129,0.25)" : "1px solid var(--border)", fontSize: "11px", fontWeight: 600, color: connected ? "#34d399" : "var(--text-3)" }}>
                  {connected ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  {connected ? "Connected" : "Disconnected"}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>{name}</div>
                <p style={{ fontSize: "12px", color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>{desc}</p>
              </div>
              <button style={{ width: "100%", padding: "9px", borderRadius: "9px", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s", background: connected ? "rgba(255,255,255,0.05)" : `${color}15`, border: connected ? "1px solid var(--border-2)" : `1px solid ${color}30`, color: connected ? "var(--text-2)" : color }}
                onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.02, duration: 0.2 })}
                onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: "back.out(1.5)" })}
              >{connected ? "Configure →" : "Connect API →"}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
