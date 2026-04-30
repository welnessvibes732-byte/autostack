"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Plus, Search, Mail, Phone, ExternalLink, Users } from "lucide-react"
import { supabase } from "@/lib/supabase"

gsap.registerPlugin(useGSAP)

export default function Tenants() {
  const ref = useRef<HTMLDivElement>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTenants() {
      try {
        const { data, error } = await supabase.from('tenants').select(`
          *,
          leases ( lease_status, unit:units ( unit_number, property:properties(name) ) )
        `)
        if (error) throw error;
        
        const transformed = (data || []).map(t => {
          const name = t.full_name || 'Unknown Tenant';
          const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
          
          const colors = ['#3b82f6', '#7c3aed', '#f59e0b', '#10b981', '#f43f5e'];
          const colorIndex = name.length % colors.length;
          
          const userLeases = t.leases || [];
          const numLeases = userLeases.length;
          
          let unitDisplay = 'None';
          let status = 'Inactive';
          let statusColor = '#f43f5e';
          
          if (numLeases > 0) {
            const activeLease = userLeases.find((l: any) => l.lease_status === 'active') || userLeases[0];
            if (activeLease) {
              if (activeLease.lease_status === 'active') {
                status = 'Active';
                statusColor = '#10b981';
              } else {
                status = 'Past';
                statusColor = '#f59e0b';
              }
              
              if (activeLease.unit) {
                unitDisplay = activeLease.unit.unit_number || 'Unassigned';
                if (activeLease.unit.property?.name) {
                  unitDisplay += `, ${activeLease.unit.property.name}`;
                }
              }
            }
          }
          
          return {
            id: t.id,
            name,
            initials,
            color: colors[colorIndex],
            email: t.email || '—',
            phone: t.phone || '—',
            unit: unitDisplay,
            leases: numLeases,
            status,
            statusColor
          }
        })
        setTenants(transformed)
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchTenants()
  }, [])

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-filter", { opacity: 0, y: 10  }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".anim-row",    { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08 }, "-=0.1")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>REGISTRY</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={22} color="var(--text-2)" /> Tenants
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Client registry and communication hub.</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.3)", fontFamily: "'DM Sans',sans-serif" }}
          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
        ><Plus size={14} /> Add Tenant</button>
      </header>

      <div className="anim-filter" style={{ position: "relative", maxWidth: "320px" }}>
        <Search size={14} color="var(--text-3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input type="text" placeholder="Search name, email, phone…" style={{ display: "block", width: "100%", height: "38px", borderRadius: "9px", border: "1px solid var(--border-2)", background: "rgba(0,0,0,0.25)", padding: "0 12px 0 34px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
          onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
        />
      </div>

      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Tenant","Contact","Unit","Leases","Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "36px", width: "140px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "28px", width: "120px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "100px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "30px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "60px", borderRadius: "99px" }} /></td>
                  <td style={{ padding: "14px 18px" }} />
                </tr>
              ))
            ) : tenants.map((t, i) => (
              <tr key={t.id} className="anim-row" style={{ borderBottom: i < tenants.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${t.color}20`, border: `1px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: t.color, flexShrink: 0 }}>{t.initials}</div>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#fff" }}>{t.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-2)" }}><Mail size={11} color="var(--text-3)" />{t.email}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-2)" }}><Phone size={11} color="var(--text-3)" />{t.phone}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{t.unit}</td>
                <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "'DM Mono',monospace" }}>{t.leases}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${t.statusColor}15`, color: t.statusColor, border: `1px solid ${t.statusColor}30` }}>{t.status}</span>
                </td>
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <button style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.15s", marginLeft: "auto" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.color = "#93c5fd" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                  ><ExternalLink size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
