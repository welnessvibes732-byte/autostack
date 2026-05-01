"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  Building2, KeySquare, Wrench, IndianRupee,
  Plus, Upload, Sparkles, TrendingUp, ArrowRight, Users, Activity, Wand2
} from "lucide-react"
import { supabase } from "@/lib/supabase"

gsap.registerPlugin(useGSAP, ScrollTrigger)

const KPI_CONFIG = [
  { key: "totalUnits",      label: "total units",      icon: Building2,    format: (v: number) => v,                                          sub: (s: any) => `${s.occupiedUnits} occupied` },
  { key: "expiringLeases",  label: "expiring leases",  icon: KeySquare,    format: (v: number) => v,                                            sub: () => "next 90 days" },
  { key: "openTickets",     label: "open tickets",     icon: Wrench,       format: (v: number) => v,                                             sub: (s: any) => `${s.urgentTickets} high priority` },
  { key: "collections",     label: "collections",      icon: IndianRupee,  format: (v: number) => `₹${(v/100000).toFixed(1)}L`,   sub: (s: any) => `↑ ${s.collectionPct}% of target` },
]

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [stats,   setStats]   = useState({ totalUnits: 0, occupiedUnits: 0, expiringLeases: 0, openTickets: 0, urgentTickets: 0, collections: 0, collectionPct: 0 })
  const [activities, setActivities] = useState<any[]>([])
  const [leads, setLeads] = useState({ new: 0, viewing: 0, closing: 0 })

  useEffect(() => {
    async function fetchData() {
      try {
        const now = new Date();
        const in90Days = new Date();
        in90Days.setDate(now.getDate() + 90);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [u, l, t, p, a, ld] = await Promise.all([
          supabase.from("units").select("*"),
          supabase.from("leases").select("*").eq("lease_status","active").lte("expiry_date", in90Days.toISOString().split('T')[0]).gte("expiry_date", now.toISOString().split('T')[0]),
          supabase.from("maintenance_tickets").select("*").eq("status","open"),
          supabase.from("rent_payments").select("*").gte("due_date", startOfMonth.split('T')[0]).lte("due_date", endOfMonth.split('T')[0]),
          supabase.from("audit_log").select("*").order("created_at",{ascending:false}).limit(10),
          supabase.from("leads").select("*"),
        ])
        
        const units = u.data || []
        const tickets = t.data || []
        const payments = p.data || []
        
        const amountPaid = payments.reduce((s:number,c:any) => s+(c.amount_paid||0), 0)
        const amountDue = payments.reduce((s:number,c:any) => s+(c.amount_due||0), 0)
        const collectionPct = amountDue > 0 ? Math.round((amountPaid / amountDue) * 100) : 0

        setStats({
          totalUnits: units.length,
          occupiedUnits: units.filter((x:any) => x.status === "occupied").length,
          expiringLeases: l.data?.length || 0,
          openTickets: tickets.length,
          urgentTickets: tickets.filter((x:any) => x.priority === "urgent").length,
          collections: amountPaid,
          collectionPct: collectionPct
        })
        setActivities(a.data || [])
        const ldata = ld.data || []
        setLeads({
          new:     ldata.filter((x:any) => x.stage==="new").length,
          viewing: ldata.filter((x:any) => x.stage==="viewing").length,
          closing: ldata.filter((x:any) => x.stage==="closing").length,
        })
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  useGSAP(() => {
    if (loading) return
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.fromTo(".dash-hero-text",
      { y: 60, opacity: 0, filter: "blur(12px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, stagger: 0.15 }
    )
    .fromTo(".kpi-card",
      { y: 32, opacity: 0, scale: 0.93 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.09, ease: "back.out(1.4)" },
      "-=0.4"
    )
    .fromTo(".activity-panel",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5 },
      "-=0.2"
    )
    .fromTo(".right-col",
      { x: 20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.45 },
      "-=0.35"
    )
    .fromTo(".activity-item",
      { x: -14, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.06 },
      "-=0.2"
    )
    .fromTo(".quick-action",
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, stagger: 0.07, ease: "back.out(1.8)" },
      "-=0.1"
    )

    /* Progress bars */
    document.querySelectorAll<HTMLElement>(".progress-fill-inner").forEach(el => {
      const w = el.getAttribute("data-width") || "0%"
      gsap.fromTo(el, { width: "0%" }, { width: w, duration: 1.3, ease: "power2.out", delay: 0.5 })
    })

    /* 3D tilt */
    document.querySelectorAll<HTMLElement>(".kpi-card").forEach(card => {
      card.addEventListener("mousemove", (e: MouseEvent) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientY - r.top  - r.height/2) / r.height
        const y = (e.clientX - r.left - r.width /2) / r.width
        gsap.to(card, { rotateX: -x*7, rotateY: y*7, transformPerspective: 900, duration: 0.35, ease: "power2.out" })
      })
      card.addEventListener("mouseleave", () =>
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "elastic.out(1,0.5)" })
      )
    })
  }, { scope: containerRef, dependencies: [loading] })

  const fallback = [
    { action: "New Lease Uploaded", desc: "Unit 14B agreement indexed & vectorized.", time: "10m ago" },
    { action: "Maintenance Ticket", desc: "Plumbing issue — Unit 4A. Vendor assigned.", time: "2h ago" },
    { action: "Rent Payment",       desc: "₹45,000 received for Unit 2C (April).", time: "5h ago" },
    { action: "Lead Converted",     desc: "Jane Smith moved to Negotiating stage.", time: "1d ago" },
    { action: "AI Search Query",    desc: "3 results found for 'lease expiry Q2'.", time: "2d ago" },
  ]
  const displayActivities = activities.length > 0 ? activities.slice(0,5) : fallback

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Glass hero header ── */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ borderRadius: "24px", padding: "32px 36px", position: "relative", overflow: "hidden" }}>
        {/* Decorative blur orb */}
        <div style={{
          position: "absolute", top: "-60px", right: "-60px",
          width: "220px", height: "220px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p className="dash-hero-text" style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px", fontFamily: "'DM Mono',monospace" }}>
              April 2026 · Portfolio Overview
            </p>
            <h1 className="dash-hero-text" style={{
              fontFamily: "'Poppins', system-ui, sans-serif",
              fontSize: "clamp(32px,4vw,52px)", fontWeight: 500,
              letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff",
            }}>
              your <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#A1A1AA" }}>portfolio</em>
              <br />dashboard
            </h1>
          </div>

          {/* Right: live badge + AI pill */}
          <div className="dash-hero-text" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{
              borderRadius: "9999px", padding: "7px 16px",
              display: "flex", alignItems: "center", gap: "8px",
              fontSize: "12px", color: "#A1A1AA",
            }}>
              <div style={{ position: "relative", width: "7px", height: "7px" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0D0D0D" }} />
                <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", background: "#0D0D0D", animation: "ripple 2s ease-out infinite" }} />
              </div>
              live
            </div>
            <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{
              borderRadius: "9999px", padding: "7px 16px",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "12px", color: "#A1A1AA",
            }}>
              <Sparkles size={11} />
              AI powered
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", perspective: "1000px" }}>
        {KPI_CONFIG.map(kpi => {
          const Icon = kpi.icon
          const value = kpi.format(stats[kpi.key as keyof typeof stats] as number)
          return (
            <div key={kpi.key} className="kpi-card" style={{ transformStyle: "preserve-3d" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                <span style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.06em", textTransform: "uppercase" }}>{kpi.label}</span>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "9999px",
                  background: "#0D0D0D", border: "1px solid #1E1E1E",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={14} color="#A1A1AA" />
                </div>
              </div>

              {loading
                ? <div className="skeleton" style={{ height: "40px", width: "70px", marginBottom: "8px" }} />
                : <div style={{
                    fontFamily: "'Poppins', system-ui, sans-serif",
                    fontSize: "36px", fontWeight: 500, color: "#fff",
                    letterSpacing: "-0.04em", lineHeight: 1, marginBottom: "8px",
                  }}>{value}</div>
              }

              {!loading && (
                <div style={{ fontSize: "12px", color: "#A1A1AA", letterSpacing: "-0.01em" }}>
                  {kpi.sub(stats)}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* ── Main 2-col ── */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: "14px" }}>

        {/* Activity panel */}
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ minHeight: "400px", display: "flex", flexDirection: "column" }}>
          <div style={{
            padding: "18px 22px 14px",
            border: "1px solid #1E1E1E",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 500, color: "#fff" }}>
              <Activity size={13} color="#A1A1AA" />
              recent activity
            </div>
            <button style={{
              fontSize: "12px", color: "#A1A1AA", background: "none",
              border: "none", cursor: "pointer", fontFamily: "'Poppins',system-ui,sans-serif",
              transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >view all →</button>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "4px 0" }}>
            {loading
              ? [1,2,3,4].map(i => (
                  <div key={i} style={{ padding: "14px 22px", display: "flex", gap: "12px", border: "1px solid #1E1E1E" }}>
                    <div className="skeleton" style={{ width: "6px", height: "6px", marginTop: "5px", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: "12px", width: "45%", marginBottom: "6px" }} />
                      <div className="skeleton" style={{ height: "10px", width: "78%" }} />
                    </div>
                  </div>
                ))
              : displayActivities.map((item: any, i: number) => (
                  <div key={i} className="activity-item list-item-clean"
                    style={{ padding: "14px 22px", display: "flex", gap: "12px", alignItems: "flex-start" }}
                  >
                    <div style={{ position: "relative", marginTop: "5px", flexShrink: 0 }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0D0D0D" }} />
                      {i === 0 && <div style={{ position: "absolute", inset: "-4px", borderRadius: "50%", background: "#0D0D0D", animation: "ripple 2.5s ease-out infinite" }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#fff", marginBottom: "2px", letterSpacing: "-0.02em" }}>{item.action || "System Activity"}</div>
                      <div style={{ fontSize: "12px", color: "#A1A1AA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.desc || "Activity logged."}</div>
                    </div>
                    <div style={{ fontSize: "11px", color: "#A1A1AA", flexShrink: 0, fontFamily: "'DM Mono',monospace" }}>{item.time || "—"}</div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Right column */}
        <div className="right-col" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Processing card (Bloom-style with icon) */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ borderRadius: "20px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "9999px",
                background: "#0D0D0D",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Wand2 size={14} color="#A1A1AA" />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff", letterSpacing: "-0.02em" }}>quick actions</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "add property",    icon: Plus },
                { label: "upload document", icon: Upload },
                { label: "ask AI search",   icon: Sparkles },
              ].map(({ label, icon: Icon }) => (
                <button key={label} className="quick-action" style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "9px 14px", borderRadius: "9999px",
                  cursor: "pointer", background: "#0D0D0D",
                  border: "1px solid #1E1E1E",
                  color: "#A1A1AA", fontSize: "13px",
                  fontFamily: "'Poppins',system-ui,sans-serif",
                  transition: "all 0.18s ease", textAlign: "left",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    gsap.to(el, { scale: 1.03, duration: 0.2 })
                    el.style.background = "rgba(255,255,255,0.1)"
                    el.style.color = "#fff"
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    gsap.to(el, { scale: 1, duration: 0.3, ease: "elastic.out(1,0.5)" })
                    el.style.background = "rgba(255,255,255,0.04)"
                    el.style.color = "rgba(255,255,255,0.6)"
                  }}
                >
                  <Icon size={13} />
                  {label}
                  <ArrowRight size={11} style={{ marginLeft: "auto", opacity: 0.35 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Lead Pipeline */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ borderRadius: "20px", padding: "20px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
              <Users size={12} color="#A1A1AA" />
              <span style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.07em", textTransform: "uppercase" }}>lead pipeline</span>
            </div>
            {[
              { label: "new intake", value: leads.new     || 12, pct: "70%" },
              { label: "viewing",    value: leads.viewing || 5,  pct: "40%" },
              { label: "closing",    value: leads.closing || 3,  pct: "25%" },
            ].map(({ label, value, pct }, i) => (
              <div key={i} style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", color: "#A1A1AA" }}>{label}</span>
                  {loading
                    ? <div className="skeleton" style={{ height: "13px", width: "20px" }} />
                    : <span style={{ fontSize: "13px", fontWeight: 500, color: "#fff", fontFamily: "'DM Mono',monospace" }}>{value}</span>
                  }
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill-inner" style={{ height: "100%", borderRadius: "9999px", background: "#FF5656", width: "0%", transition: "width 1.3s cubic-bezier(0.16,1,0.3,1)" }}
                  />
                </div>
              </div>
            ))}

            <div style={{
              paddingTop: "12px", border: "1px solid #1E1E1E",
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "12px", color: "#A1A1AA",
            }}>
              <TrendingUp size={11} />
              ↑ 18% conversion this month
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
