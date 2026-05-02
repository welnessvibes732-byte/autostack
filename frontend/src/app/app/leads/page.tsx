"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Plus, MoreHorizontal, UserPlus, Phone, Mail, X, Loader2, Settings2, Send } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

export default function Leads() {
  const ref = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState<any[]>([
    { id: "new",         label: "New Intake",  color: "#3b82f6", cards: [] },
    { id: "qualified",   label: "Qualified",   color: "#7c3aed", cards: [] },
    { id: "viewing",     label: "Viewing",     color: "#f59e0b", cards: [] },
    { id: "negotiating", label: "Negotiating", color: "#f43f5e", cards: [] },
    { id: "closed",      label: "Closed",      color: "#10b981", cards: [] },
  ])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", stage: "new", budget: "", notes: "" })

  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [questions, setQuestions] = useState("")
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const fetchLeadsData = async () => {
    try {
      const orgId = await getOrCreateOrg()
      const { data: orgData } = await supabase.from('organizations').select('lead_settings').eq('id', orgId).single()
      if (orgData && orgData.lead_settings) {
        setQuestions(orgData.lead_settings.questions || "")
      }

      const { data, error } = await supabase.from('leads').select('*')
      if (error) throw error;
      
      const leads = data || [];
      
      const baseCols = [
        { id: "new",         label: "New Intake",  color: "#3b82f6", cards: [] as any[] },
        { id: "qualified",   label: "Qualified",   color: "#7c3aed", cards: [] as any[] },
        { id: "viewing",     label: "Viewing",     color: "#f59e0b", cards: [] as any[] },
        { id: "negotiating", label: "Negotiating", color: "#f43f5e", cards: [] as any[] },
        { id: "closed",      label: "Closed",      color: "#10b981", cards: [] as any[] },
      ]

      leads.forEach(l => {
        const name = (l.full_name || '').trim() || 'Unknown Lead';
        const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
        const stage = (l.stage || 'new').toLowerCase();
        
        let col = baseCols.find(c => c.id === stage);
        if (!col) col = baseCols[0];
        
        const time = new Date(l.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
        
        col.cards.push({
          id: l.id,
          name,
          note: l.notes || (l.budget_max ? `Budget: ₹${l.budget_max}` : 'No notes provided.'),
          time,
          initials,
          bg: col.color,
          email: l.email
        });
      });
      
      setColumns(baseCols);
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeadsData()
  }, [])

  async function submitLead() {
    if (!form.full_name) { alert("Please enter the lead's full name."); return }
    setIsSubmitting(true)
    try {
      const organization_id = await getOrCreateOrg()
      const { error, data: insertedLead } = await supabase.from('leads').insert({
        organization_id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        stage: form.stage,
        budget_max: form.budget ? parseFloat(form.budget) : null,
        notes: form.notes
      }).select('*').single()
      if (error) throw error

      try {
        await fetch('http://localhost:5678/webhook-test/lead-qualification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: insertedLead.id, email: insertedLead.email, full_name: insertedLead.full_name })
        })
      } catch (err) { console.error("n8n qualification webhook failed", err) }
      setShowModal(false)
      setForm({ full_name: "", email: "", phone: "", stage: "new", budget: "", notes: "" })
      setLoading(true)
      fetchLeadsData()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDrop(e: any, newStage: string) {
    e.preventDefault()
    if (!draggedCard) return
    try {
      const { error } = await supabase.from('leads').update({ stage: newStage }).eq('id', draggedCard)
      if (error) throw error
      fetchLeadsData()
    } catch (err: any) { alert(err.message) }
    setDraggedCard(null)
  }

  async function handleFollowUp(leadId: string, email: string) {
    if (!email) { alert("Lead has no email."); return }
    try {
      const { error } = await supabase.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', leadId)
      if (error) throw error
      await fetch('http://localhost:5678/webhook-test/lead-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, email })
      })
      alert("Follow-up email triggered via n8n!")
      fetchLeadsData()
    } catch (err: any) { alert(err.message) }
  }

  async function saveSettings() {
    setIsSavingSettings(true)
    try {
      const orgId = await getOrCreateOrg()
      const { error } = await supabase.from('organizations').update({ lead_settings: { questions } }).eq('id', orgId)
      if (error) throw error
      setShowSettings(false)
    } catch (err: any) { alert(err.message) }
    finally { setIsSavingSettings(false) }
  }

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".kanban-col",  { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".kanban-card", { opacity: 0, y: 16, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.05, ease: "back.out(1.4)" }, "-=0.2")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px", height: "calc(100vh - 100px)" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)", flexShrink: 0  }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>CRM</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <UserPlus size={22} color="var(--text-2)" /> Leads Pipeline
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Track and convert prospective tenants.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowSettings(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)", color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
            onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0, duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
          >
            <Settings2 size={14} /> Settings
          </button>
          <button onClick={() => { setForm({...form, stage: "new"}); setShowModal(true) }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
          ><Plus size={14} /> Add Lead</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "16px" }}>
        {loading ? (
          [1,2,3,4,5].map(i => (
             <div key={i} className="skeleton kanban-col" style={{ minWidth: "220px", flex: 1, borderRadius: "14px", background: "var(--surface)" }} />
          ))
        ) : columns.map(({ id, label, color, cards }) => (
          <div key={id} className="kanban-col" 
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, id)}
            style={{ minWidth: "220px", flex: 1, display: "flex", flexDirection: "column", borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
            {/* Column header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: "13px", color: "#fff" }}>{label}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: "#1E1E1E", color, border: `1px solid ${color}25` }}>{cards.length}</span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
              {cards.map((card: any) => (
                <div key={card.id} className="kanban-card" 
                  draggable
                  onDragStart={() => setDraggedCard(card.id)}
                  style={{ padding: "14px", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "grab", transition: "all 0.2s" }}
                  onMouseEnter={e => gsap.to(e.currentTarget, { y: -2, boxShadow: `0 8px 20px rgba(0,0,0,0.35)`, borderColor: "var(--border-2)", duration: 0.2 })}
                  onMouseLeave={e => gsap.to(e.currentTarget, { y: 0,  boxShadow: "none", borderColor: "var(--border)", duration: 0.3, ease: "back.out(1.5)" })}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "#fff" }}>{card.name}</span>
                    <button style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "0" }}><MoreHorizontal size={13} /></button>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-2)", margin: "0 0 10px", lineHeight: 1.4 }}>{card.note}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{card.time}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button onClick={() => handleFollowUp(card.id, card.email)} style={{ padding: "4px 8px", borderRadius: "6px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "10px", fontWeight: 600, marginRight: "4px" }}>
                        <Send size={10} /> Follow-up
                      </button>
                      <button style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#0D0D0D", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", color: "var(--text-3)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = `rgba(59,130,246,0.12)`; e.currentTarget.style.color = "#3b82f6" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                      ><Phone size={10} /></button>
                      <button style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#0D0D0D", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", color: "var(--text-3)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = `rgba(59,130,246,0.12)`; e.currentTarget.style.color = "#3b82f6" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                      ><Mail size={10} /></button>
                      <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: `${card.bg}25`, border: `1px solid ${card.bg}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: card.bg }}>{card.initials}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add card button */}
              <button onClick={() => { setForm({...form, stage: id}); setShowModal(true) }} style={{ padding: "10px", borderRadius: "10px", border: "1px dashed var(--border)", background: "transparent", color: "var(--text-3)", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent" }}
              ><Plus size={12} /> Add card</button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Lead Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "500px", maxWidth: "95%", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><UserPlus size={18} color="#ec4899" /> New Lead</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Full Name</label>
                <input type="text" placeholder="e.g. John Doe" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Email</label>
                  <input type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Phone</label>
                  <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Stage</label>
                  <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
                    <option value="new">New Intake</option>
                    <option value="qualified">Qualified</option>
                    <option value="viewing">Viewing</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Budget Max (₹)</label>
                  <input type="number" placeholder="e.g. 50000" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Notes / Requirements</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Looking for a 2BHK near metro..." rows={3} style={{ width: "100%", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "12px 14px", fontSize: "14px", outline: "none", resize: "none", fontFamily: "'DM Sans',sans-serif" }} />
              </div>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={submitLead} disabled={isSubmitting} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Save Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "450px", maxWidth: "95%", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><Settings2 size={18} color="#ec4899" /> Lead Settings</h2>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Qualification Questions</label>
                <p style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "12px" }}>These questions will be sent via email to new leads via the n8n automation.</p>
                <textarea value={questions} onChange={e => setQuestions(e.target.value)} placeholder="1. When are you looking to move?&#10;2. How many bedrooms?&#10;3. Do you have pets?" rows={6} style={{ width: "100%", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "12px 14px", fontSize: "14px", outline: "none", resize: "none", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.5 }} />
              </div>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505" }}>
              <button onClick={() => setShowSettings(false)} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={saveSettings} disabled={isSavingSettings} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSavingSettings ? "not-allowed" : "pointer", opacity: isSavingSettings ? 0.7 : 1 }}>
                {isSavingSettings ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
    </div>
  )
}
