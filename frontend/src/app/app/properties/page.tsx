"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Plus, Search, MapPin, Home, ChevronRight, Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

gsap.registerPlugin(useGSAP)

export default function Properties() {
  const ref = useRef<HTMLDivElement>(null)
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProperties() {
      try {
        const { data: props, error } = await supabase.from('properties').select(`
          *,
          units:units ( id, status, rent_amount )
        `)
        if (error) throw error;
        
        const transformed = (props || []).map(p => {
          const totalUnits = p.units?.length || 0;
          const occupiedUnits = p.units?.filter((u: any) => u.status === 'occupied').length || 0;
          const totalRent = p.units?.reduce((sum: number, u: any) => sum + Number(u.rent_amount || 0), 0) || 0;
          
          let status = 'Vacant';
          let statusColor = '#f43f5e'; 
          
          if (totalUnits > 0) {
            if (occupiedUnits === totalUnits) {
              status = 'Full';
              statusColor = '#3b82f6';
            } else if (occupiedUnits > 0) {
              status = 'Partial';
              statusColor = '#f59e0b';
            }
          }
          
          const rentStr = totalRent > 0 ? (totalRent >= 100000 ? `₹${(totalRent/100000).toFixed(1)}L` : `₹${(totalRent/1000).toFixed(1)}K`) : '—';
          
          return {
            id: p.id,
            name: p.name || 'Unnamed Property',
            address: p.city ? `${p.address_line1}, ${p.city}` : p.address_line1,
            units: totalUnits,
            occupied: occupiedUnits,
            rent: rentStr,
            status,
            statusColor
          }
        })
        setProperties(transformed)
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchProperties()
  }, [])

  const handleAddProperty = async () => {
    try {
      const name = window.prompt("Property Name (e.g., Sunrise Apartments)");
      if (!name) return;
      const address_line1 = window.prompt("Address (e.g., 123 Main St)");
      const city = window.prompt("City (e.g., New York)");
      const property_type = window.prompt("Property Type (residential/commercial)", "residential");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let { data: orgData, error: orgErr } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
      let organization_id = orgData?.id;

      if (!organization_id) {
        const { data: newOrg, error: createErr } = await supabase.from('organizations').insert({ name: 'Default Organization', owner_id: user.id }).select('id').single();
        if (createErr) throw new Error("Could not create default organization: " + createErr.message);
        organization_id = newOrg.id;
      }

      const { error } = await supabase.from('properties').insert({
        organization_id,
        name,
        address_line1,
        city,
        property_type
      });

      if (error) throw error;
      alert("Property added successfully!");
      window.location.reload();
    } catch (err: any) {
      alert("Error adding property: " + err.message);
    }
  }



  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-filter", { opacity: 0, y: 10  }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".prop-card",   { opacity: 0, y: 32, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.07, ease: "back.out(1.3)" }, "-=0.15")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)"  }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>PORTFOLIO</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Building2 size={22} color="var(--text-2)" /> Properties
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Your real estate portfolio master list.</p>
        </div>
        <button onClick={handleAddProperty} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif" }}
          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
        ><Plus size={14} /> Add Property</button>
      </header>

      {/* Filters */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
          <Search size={14} color="var(--text-3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input type="text" placeholder="Search properties…" style={{ display: "block", width: "100%", height: "38px", borderRadius: "9px", border: "1px solid var(--border-2)", background: "rgba(0,0,0,0.25)", padding: "0 12px 0 34px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
            onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
          />
        </div>
        {["All","Active","Full","Partial","Vacant"].map((f, i) => (
          <button key={f} style={{ padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent", border: i === 0 ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)", color: i === 0 ? "#fff" : "var(--text-3)", transition: "all 0.2s" }}
            onMouseEnter={e => { if(i!==0){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.05)"} }}
            onMouseLeave={e => { if(i!==0){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent"} }}
          >{f}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "16px" }}>
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="skeleton prop-card" style={{ padding: "22px", borderRadius: "16px", background: "var(--surface)", height: "200px" }} />
          ))
        ) : properties.map(({ id, name, address, units, occupied, rent, status, statusColor }) => (
          <div key={id} className="prop-card" style={{ padding: "22px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "16px", cursor: "pointer", position: "relative", overflow: "hidden" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.4)", borderColor: "var(--border-2)", duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", borderColor: "var(--border)", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "11px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Home size={20} color="#3b82f6" />
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>{status}</span>
            </div>
            <div>
              <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: "15px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: "5px" }}>{name}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-3)", fontSize: "12px" }}>
                <MapPin size={11} /> {address}
              </div>
            </div>
            {/* Occupancy bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-3)" }}>Occupancy</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: statusColor }}>{units > 0 ? Math.round(occupied/units*100) : 0}%</span>
              </div>
              <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-3)" }}>
                <div style={{ height: "100%", borderRadius: "99px", background: statusColor, width: `${units > 0 ? Math.round(occupied/units*100) : 0}%`, boxShadow: `0 0 8px ${statusColor}50`, transition: "width 1s ease" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "2px" }}>Units</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "'DM Mono',monospace" }}>{occupied}/{units}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "2px" }}>Rent/mo</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>{rent}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 500, color: "#93c5fd" }}>
                Details <ChevronRight size={13} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
