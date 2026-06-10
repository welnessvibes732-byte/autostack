"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Settings, Save, Shield, Users, CreditCard, Key, Building2, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

const TABS = [
  { label: "Organisation", icon: Building2 },
  { label: "Team & Roles",  icon: Users },
  { label: "Billing",       icon: CreditCard },
  { label: "API Keys",      icon: Key },
]

export default function SettingsPage() {
  const ref = useRef<HTMLDivElement>(null)
  
  // Form State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  
  const [activeTab, setActiveTab] = useState(TABS[0].label)
  const [orgName, setOrgName] = useState("")
  // Note: tax_id doesn't natively exist in schema, we will use gstin or a jsonb field if we need it. 
  // Wait, looking at the schema, organizations has no tax_id or gstin. We'll add it to state but won't crash if it fails to save, or we can just leave it client-side. Actually, we'll just save the ones we know exist: name, country, currency.
  const [taxId, setTaxId] = useState("") 
  const [country, setCountry] = useState("")
  const [currency, setCurrency] = useState("")

  useEffect(() => {
    async function loadOrg() {
      try {
        const id = await getOrCreateOrg()
        setOrgId(id)
        
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", id)
          .single()
          
        if (error) throw error
        
        if (data) {
          setOrgName(data.name || "")
          setCountry(data.country || "")
          setCurrency(data.currency || "")
          setTaxId(data.settings_json?.tax_id || "") 
        }
      } catch (e) {
        console.error("Failed to load org:", e)
      } finally {
        setLoading(false)
      }
    }
    loadOrg()
  }, [])

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgName,
          country: country,
          currency: currency,
          settings_json: { tax_id: taxId }
        })
        .eq("id", orgId)
        
      if (error) throw error
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      console.error("Failed to save:", e)
    } finally {
      setSaving(false)
    }
  }

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".settings-tab", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.06 }, "-=0.2")
      .fromTo(".anim-card",   { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1, ease: "back.out(1.3)" }, "-=0.2")
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
          {TABS.map(({ label, icon: Icon }, i) => {
            const isActive = activeTab === label;
            return (
              <button key={label} className="settings-tab" onClick={() => setActiveTab(label)} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 12px", borderRadius: "9px", textAlign: "left",
                background: isActive ? "rgba(59,130,246,0.1)" : "transparent",
                border: isActive ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
                color: isActive ? "#93c5fd" : "var(--text-3)",
                fontSize: "13px", fontWeight: 500, cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
              }}
                onMouseEnter={e => { if(!isActive){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.04)";gsap.to(e.currentTarget,{x:3,duration:0.2})} }}
                onMouseLeave={e => { if(!isActive){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent";gsap.to(e.currentTarget,{x:0,duration:0.3,ease:"back.out(1.5)"})} }}
              >
                <Icon size={14} color={isActive ? "#93c5fd" : "var(--text-3)"} />
                {label}
              </button>
            )
          })}
        </aside>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
          {activeTab === "Organisation" ? (
            <>
              {/* Org details */}
              <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg,transparent,rgba(255,86,86,0.25),transparent)" }} />
                <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: "15px", fontWeight: 600, color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building2 size={15} color="var(--text-2)" /> Organisation Details
                </h2>
                
                {loading ? (
                   <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
                     <Loader2 className="animate-spin text-gray-500" />
                   </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "16px" }}>
                      <div className="anim-field">
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 500, color: "var(--text-2)", letterSpacing: "0.02em" }}>Company Name</label>
                        <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle}
                          onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)" }}
                          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none" }}
                        />
                      </div>
                      <div className="anim-field">
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 500, color: "var(--text-2)", letterSpacing: "0.02em" }}>Tax ID / GSTIN</label>
                        <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} style={inputStyle}
                          onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)" }}
                          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none" }}
                        />
                      </div>
                      <div className="anim-field">
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 500, color: "var(--text-2)", letterSpacing: "0.02em" }}>Country</label>
                        <input type="text" value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}
                          onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)" }}
                          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none" }}
                        />
                      </div>
                      <div className="anim-field">
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 500, color: "var(--text-2)", letterSpacing: "0.02em" }}>Currency</label>
                        <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}
                          onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)" }}
                          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none" }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "20px" }}>
                      <button onClick={handleSave} disabled={saving} className="anim-field" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s", opacity: saving ? 0.7 : 1 }}
                        onMouseEnter={e => { if(!saving) gsap.to(e.currentTarget, { scale: 1.03, y: -2, duration: 0.2 }) }}
                        onMouseLeave={e => { if(!saving) gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" }) }}
                      >
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      {saveSuccess && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "13px", fontWeight: 500 }}>
                          <CheckCircle2 size={16} /> Saved successfully
                        </div>
                      )}
                    </div>
                  </>
                )}
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
                  <button onClick={() => {
                    if (window.confirm("Are you sure you want to delete your organisation? This action is permanent and all data will be wiped.")) {
                      alert("Organisation deletion must be requested via support.");
                    }
                  }} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.2)"; gsap.to(e.currentTarget, { scale: 1.03, duration: 0.2 }) }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(244,63,94,0.1)"; gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: "back.out(1.5)" }) }}
                  >Delete Organisation</button>
                </div>
              </div>
            </>
          ) : (
            <div className="anim-card" style={{ padding: "40px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", textAlign: "center", color: "var(--text-3)" }}>
              <Settings size={32} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
              <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>{activeTab} Settings</h2>
              <p style={{ fontSize: "14px" }}>These settings will be available in the next release.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

