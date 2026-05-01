"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Settings, Save, Shield, Users, CreditCard, Key, Building2 } from "lucide-react"

gsap.registerPlugin(useGSAP)

const TABS = [
  { label: "Organisation", icon: Building2 },
  { label: "Team & Roles",  icon: Users },
  { label: "Billing",       icon: CreditCard },
  { label: "API Keys",      icon: Key },
]

export default function SettingsPage() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".settings-tab", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.06 }, "-=0.2")
      .fromTo(".anim-card",   { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-field",  { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.07 }, "-=0.2")
  }, { scope: ref })

  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", height: "42px", borderRadius: "9px",
    border: "1px solid #1E1E1E", background: "rgba(0,0,0,0.25)",
    padding: "0 14px", fontSize: "14px", color: "#fff", outline: "none",
    fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s, box-shadow 0.2s",
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>
      <header className="page-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>ACCOUNT</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <Settings size={22} color="var(--text-2)" /> Settings
        </h1>
        <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Manage your organisation, team, billing, and API access.</p>
      </header>

      <div style={{ display: "flex", gap: "28px" }}>
        {/* Sidebar tabs */}
        <aside style={{ width: "180px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
          {TABS.map(({ label, icon: Icon }, i) => (
            <button key={label} className="settings-tab" style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 12px", borderRadius: "9px", textAlign: "left",
              background: i === 0 ? "rgba(59,130,246,0.1)" : "transparent",
              border: i === 0 ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
              color: i === 0 ? "#93c5fd" : "var(--text-3)",
              fontSize: "13px", fontWeight: 500, cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
            }}
              onMouseEnter={e => { if(i!==0){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.04)";gsap.to(e.currentTarget,{x:3,duration:0.2})} }}
              onMouseLeave={e => { if(i!==0){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent";gsap.to(e.currentTarget,{x:0,duration:0.3,ease:"back.out(1.5)"})} }}
            >
              <Icon size={14} color={i === 0 ? "#93c5fd" : "var(--text-3)"} />
              {label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Org details */}
          <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,rgba(255,86,86,0.25),transparent)" }} />
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "15px", fontWeight: 600, color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Building2 size={15} color="var(--text-2)" /> Organisation Details
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "16px" }}>
              {[{ label: "Company Name", val: "Acme Real Estate Pvt Ltd", type: "text" }, { label: "Tax ID / GSTIN", val: "GSTIN-123456789", type: "text" }, { label: "Country", val: "India", type: "text" }, { label: "Currency", val: "INR (₹)", type: "text" }].map(({ label, val, type }) => (
                <div key={label} className="anim-field">
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 500, color: "var(--text-2)", letterSpacing: "0.02em" }}>{label}</label>
                  <input type={type} defaultValue={val} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)" }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none" }}
                  />
                </div>
              ))}
            </div>
            <button className="anim-field" style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
              onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.03, y: -2, duration: 0.2 })}
              onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
            >
              <Save size={13} /> Save Changes
            </button>
          </div>

          {/* Danger zone */}
          <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,rgba(244,63,94,0.3),transparent)" }} />
            <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "15px", fontWeight: 600, color: "#fb7185", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={15} /> Danger Zone
            </h2>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderRadius: "10px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.15)" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#fb7185" }}>Delete Organisation</div>
                <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "3px" }}>This action is permanent. All data will be wiped.</div>
              </div>
              <button style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.2)"; gsap.to(e.currentTarget, { scale: 1.03, duration: 0.2 }) }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,63,94,0.1)"; gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: "back.out(1.5)" }) }}
              >Delete Organisation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
