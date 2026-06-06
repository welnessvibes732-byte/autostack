"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { BarChart3, TrendingUp, Users, Building2, DollarSign, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

export default function Analytics() {
  const ref = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    occupancyRate: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    revenueMtd: 0,
    newLeads: 0,
    avgRent: 0,
    barData: [] as { month: string, value: number, label: string }[],
    leadsFunnel: [] as { stage: string, count: number, pct: number, color: string }[],
    leaseExpiry: [] as { period: string, count: number, color: string }[]
  })

  useEffect(() => {
    async function loadData() {
      try {
        const orgId = await getOrCreateOrg()
        
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

        // 1. Units & Occupancy
        const { data: units } = await supabase.from("units").select("status").eq("organization_id", orgId)
        const totalUnits = units?.length || 0
        const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0
        const vacantUnits = totalUnits - occupiedUnits
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

        // 2. Revenue MTD
        const { data: payments } = await supabase
          .from("rent_payments")
          .select("amount_paid, paid_date")
          .eq("organization_id", orgId)
          .eq("status", "paid")
          .gte("paid_date", firstDayOfMonth)
        const revenueMtd = payments?.reduce((acc, p) => acc + Number(p.amount_paid || 0), 0) || 0

        // 3. New Leads
        const { count: newLeadsCount } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .gte("created_at", firstDayOfMonth)

        // 4. Avg Rent (from active leases)
        const { data: leases } = await supabase
          .from("leases")
          .select("rent_amount, expiry_date")
          .eq("organization_id", orgId)
          .eq("lease_status", "active")
        
        const totalRent = leases?.reduce((acc, l) => acc + Number(l.rent_amount || 0), 0) || 0
        const avgRent = leases && leases.length > 0 ? Math.round(totalRent / leases.length) : 0

        // 5. Bar Chart (Last 6 months revenue)
        const { data: historicalPayments } = await supabase
          .from("rent_payments")
          .select("amount_paid, paid_date")
          .eq("organization_id", orgId)
          .eq("status", "paid")
          .gte("paid_date", sixMonthsAgo.toISOString())
          
        const monthlyRevenue: Record<string, number> = {}
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = d.toLocaleString('default', { month: 'short' })
          monthlyRevenue[key] = 0 // initialize
        }
        
        historicalPayments?.forEach(p => {
          if (p.paid_date) {
            const date = new Date(p.paid_date)
            const key = date.toLocaleString('default', { month: 'short' })
            if (monthlyRevenue[key] !== undefined) {
              monthlyRevenue[key] += Number(p.amount_paid || 0)
            }
          }
        })
        
        // Find max for scaling (assume target is max + 20% for visual scale)
        const maxRev = Math.max(...Object.values(monthlyRevenue), 1)
        const targetRev = maxRev * 1.2
        const barData = Object.entries(monthlyRevenue).map(([month, rev]) => ({
          month,
          value: Math.round((rev / targetRev) * 100),
          label: rev > 100000 ? `₹${(rev/100000).toFixed(1)}L` : `₹${rev}`
        }))

        // 6. Leads Funnel
        const { data: allLeads } = await supabase.from("leads").select("stage").eq("organization_id", orgId)
        const funnelGroups = {
          "new": 0, "viewing_scheduled": 0, "negotiating": 0, "closed_won": 0
        }
        allLeads?.forEach(l => {
          if (funnelGroups[l.stage as keyof typeof funnelGroups] !== undefined) {
            funnelGroups[l.stage as keyof typeof funnelGroups]++
          }
        })
        const maxLead = Math.max(...Object.values(funnelGroups), 1)
        const leadsFunnel = [
          { stage: "New Intake", count: funnelGroups["new"], color: "#3b82f6", pct: Math.round(funnelGroups["new"]/maxLead*100) || 0 },
          { stage: "Viewing", count: funnelGroups["viewing_scheduled"], color: "#7c3aed", pct: Math.round(funnelGroups["viewing_scheduled"]/maxLead*100) || 0 },
          { stage: "Negotiating", count: funnelGroups["negotiating"], color: "#f59e0b", pct: Math.round(funnelGroups["negotiating"]/maxLead*100) || 0 },
          { stage: "Closed", count: funnelGroups["closed_won"], color: "#10b981", pct: Math.round(funnelGroups["closed_won"]/maxLead*100) || 0 },
        ]

        // 7. Lease Expiry
        let thisMonth = 0, next30 = 0, next60 = 0, safe = 0
        leases?.forEach(l => {
          if (l.expiry_date) {
            const exp = new Date(l.expiry_date)
            const diffDays = Math.floor((exp.getTime() - now.getTime()) / (1000 * 3600 * 24))
            if (diffDays <= 30) thisMonth++
            else if (diffDays <= 60) next30++
            else if (diffDays <= 90) next60++
            else safe++
          }
        })
        const leaseExpiry = [
          { period: "< 30 days", count: thisMonth, color: "#f43f5e" },
          { period: "30-60 days", count: next30, color: "#f59e0b" },
          { period: "60-90 days", count: next60, color: "#3b82f6" },
          { period: "90+ days", count: safe, color: "#10b981" }
        ]

        setData({
          occupancyRate, occupiedUnits, vacantUnits,
          revenueMtd,
          newLeads: newLeadsCount || 0,
          avgRent,
          barData,
          leadsFunnel,
          leaseExpiry
        })

      } catch (e) {
        console.error("Failed to load analytics:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-stat",   { opacity: 0, y: 24, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.07, ease: "back.out(1.4)" }, "-=0.2")
      .fromTo(".anim-card",   { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.1 }, "-=0.2")
      .fromTo(".bar-fill",    { scaleY: 0 }, { scaleY: 1, duration: 0.65, stagger: 0.06, ease: "back.out(1.2)", transformOrigin: "bottom" }, "-=0.1")
      .fromTo(".ring-fill",   { strokeDashoffset: 283 }, { strokeDashoffset: 283 - (283 * (data.occupancyRate / 100)), duration: 1.2, ease: "power2.out" }, "<")
  }, { scope: ref, dependencies: [loading, data] })

  const METRICS = [
    { label: "Occupancy Rate", value: `${data.occupancyRate}%`, sub: "Real-time portfolio", color: "#10b981", icon: Building2 },
    { label: "Revenue MTD",    value: data.revenueMtd > 100000 ? `₹${(data.revenueMtd/100000).toFixed(1)}L` : `₹${data.revenueMtd.toLocaleString()}`, sub: "Collected this month", color: "#3b82f6", icon: DollarSign },
    { label: "New Leads",      value: data.newLeads.toString(), sub: "Inbound this month", color: "#f59e0b", icon: Users },
    { label: "Avg Rent",       value: `₹${data.avgRent.toLocaleString()}`, sub: "Per active lease", color: "#7c3aed", icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <Loader2 className="animate-spin text-gray-500" size={32} />
      </div>
    )
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <header className="page-header" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>LIVE METRICS</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <BarChart3 size={22} color="var(--text-2)" /> Analytics
        </h1>
        <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Portfolio performance and revenue insights.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "14px" }}>
        {METRICS.map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="anim-stat" style={{ padding: "20px", borderRadius: "14px", background: `linear-gradient(135deg,${color}14,${color}05)`, border: "1px solid #1E1E1E", position: "relative", overflow: "hidden", cursor: "default" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -4, boxShadow: `0 16px 40px ${color}30`, duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ position: "absolute", top: "-16px", right: "-16px", width: "60px", height: "60px", borderRadius: "50%", background: color, opacity: 0.12, filter: "blur(12px)", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
              <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #333" }}>
                <Icon size={13} color={color} />
              </div>
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "28px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "11px", color, marginTop: "6px", fontWeight: 500 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "18px" }}>
        {/* Bar chart */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>Revenue Collected</div>
              <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>Last 6 months</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "110px" }}>
            {data.barData.map(({ month, value, label }) => (
              <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }} title={label}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div className="bar-fill" style={{ width: "100%", borderRadius: "5px 5px 0 0", background: "linear-gradient(to bottom, #ec4899, #f97316)", height: `${Math.max(value, 2)}%`, boxShadow: "0 0 12px rgba(255,86,86,0.25)" }} />
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>Portfolio Occupancy</div>
          <div style={{ fontSize: "12px", color: "var(--text-3)", marginBottom: "20px" }}>Real-time unit status</div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <svg width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
              <circle className="ring-fill" cx="50" cy="50" r="45" fill="none" stroke="url(#ringGrad)" strokeWidth="8"
                strokeDasharray="283" strokeDashoffset="283" strokeLinecap="round" transform="rotate(-90 50 50)" />
              <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
              <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="Sora,sans-serif">{data.occupancyRate}%</text>
              <text x="50" y="60" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="DM Sans,sans-serif">Occupied</text>
            </svg>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[{ label: "Occupied", val: data.occupiedUnits, color: "#10b981" }, { label: "Vacant", val: data.vacantUnits, color: "#f59e0b" }].map(({ label, val, color }) => {
                const total = data.occupiedUnits + data.vacantUnits || 1;
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{label}</span>
                      <span style={{ fontSize: "12px", color, fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{val}</span>
                    </div>
                    <div style={{ height: "4px", borderRadius: "99px", background: "var(--surface-3)" }}>
                      <div className="bar-fill" style={{ height: "100%", borderRadius: "99px", background: color, width: `${(val/total)*100}%`, boxShadow: `0 0 8px ${color}` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>Lead Conversion Funnel</div>
          {data.leadsFunnel.map(({ stage, count, color, pct }) => (
            <div key={stage} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-2)" }}>{stage}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color, fontFamily: "'DM Mono',monospace" }}>{count}</span>
              </div>
              <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-3)", overflow: "hidden" }}>
                <div className="bar-fill" style={{ height: "100%", borderRadius: "99px", background: color, width: `${Math.max(pct, 2)}%`, boxShadow: `0 0 8px ${color}50` }} />
              </div>
            </div>
          ))}
          {data.leadsFunnel.every(f => f.count === 0) && (
            <div style={{ fontSize: "12px", color: "var(--text-3)", textAlign: "center", marginTop: "20px" }}>No leads pipeline data available.</div>
          )}
        </div>

        {/* Lease timeline */}
        <div className="anim-card" style={{ padding: "24px", borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>Lease Expiry Timeline</div>
          {data.leaseExpiry.map(({ period, count, color }) => (
            <div key={period} className="anim-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontSize: "13px", color: "var(--text-2)" }}>{period}</span>
              </div>
              <span style={{ fontSize: "14px", fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

