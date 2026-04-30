"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Plus, MoreHorizontal, UserPlus, Phone, Mail } from "lucide-react"
import { supabase } from "@/lib/supabase"

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

  useEffect(() => {
    async function fetchLeads() {
      try {
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
          const name = `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown Lead';
          const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
          const stage = (l.stage || 'new').toLowerCase();
          
          let col = baseCols.find(c => c.id === stage);
          if (!col) col = baseCols[0];
          
          const time = new Date(l.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
          
          col.cards.push({
            id: l.id,
            name,
            note: l.notes || (l.budget ? `Budget: ₹${l.budget}` : 'No notes provided.'),
            time,
            initials,
            bg: col.color
          });
        });
        
        setColumns(baseCols);
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".kanban-col",  { opacity: 0, y: 28, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".kanban-card", { opacity: 0, y: 16, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.05, ease: "back.out(1.4)" }, "-=0.2")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px", height: "calc(100vh - 100px)" }}>
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>CRM</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <UserPlus size={22} color="var(--text-2)" /> Leads Pipeline
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Track and convert prospective tenants.</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.3)", fontFamily: "'DM Sans',sans-serif" }}
          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
        ><Plus size={14} /> Add Lead</button>
      </header>

      <div style={{ flex: 1, display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "16px" }}>
        {loading ? (
          [1,2,3,4,5].map(i => (
             <div key={i} className="skeleton kanban-col" style={{ minWidth: "220px", flex: 1, borderRadius: "14px", background: "var(--surface)" }} />
          ))
        ) : columns.map(({ id, label, color, cards }) => (
          <div key={id} className="kanban-col" style={{ minWidth: "220px", flex: 1, display: "flex", flexDirection: "column", borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
            {/* Column header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: "13px", color: "#fff" }}>{label}</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}25` }}>{cards.length}</span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto" }}>
              {cards.map((card: any) => (
                <div key={card.id} className="kanban-card" style={{ padding: "14px", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s" }}
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
                      <button style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", color: "var(--text-3)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = `rgba(59,130,246,0.12)`; e.currentTarget.style.color = "#3b82f6" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                      ><Phone size={10} /></button>
                      <button style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", color: "var(--text-3)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = `rgba(59,130,246,0.12)`; e.currentTarget.style.color = "#3b82f6" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                      ><Mail size={10} /></button>
                      <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: `${card.bg}25`, border: `1px solid ${card.bg}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: card.bg }}>{card.initials}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add card button */}
              <button style={{ padding: "10px", borderRadius: "10px", border: "1px dashed var(--border)", background: "transparent", color: "var(--text-3)", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-3)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent" }}
              ><Plus size={12} /> Add card</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
