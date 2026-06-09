"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRouter } from "next/navigation"
import {
  Building2, KeySquare, Wrench, IndianRupee, CheckSquare,
  Plus, Upload, Sparkles, TrendingUp, ArrowRight, Users, Activity, Wand2, X, FileText, UserPlus, ArrowUpRight, CheckCircle2, Clock, AlertTriangle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from "recharts"

gsap.registerPlugin(useGSAP, ScrollTrigger)

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")

  const [stats, setStats] = useState({
    totalUnits: 0, occupiedUnits: 0, vacantUnits: 0, occupancyRate: 0,
    expiringLeases: 0, criticalLeasesCount: 0,
    openTickets: 0, highPriorityTickets: 0,
    amountDue: 0, amountPaid: 0, collectionRate: 0, liveNOI: 0,
    totalPending: 0, pendingDetails: { invoices: 0, leases: 0, maintenance: 0, signoffs: 0 }
  })
  
  const [activities, setActivities] = useState<any[]>([])
  const [leads, setLeads] = useState({ new: 0, qualified: 0, viewing_scheduled: 0, negotiating: 0, pending_signoff: 0 })
  const [leaseExpiries, setLeaseExpiries] = useState<any[]>([])
  const [pendingItems, setPendingItems] = useState({ invoices: [] as any[], leases: [] as any[], tickets: [] as any[], signoffs: [] as any[] })
  
  const [dismissedAlerts, setDismissedAlerts] = useState({ leases: false, approvals: false })
  const [overdueApprovalsCount, setOverdueApprovalsCount] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const org = await getOrCreateOrg()
        setOrgId(org)

        const now = new Date()
        const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const in365Days = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0]
        const overdueDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

        const [
          u, l, t, p,
          invCountRes, leaseCountRes, maintCountRes, signoffCountRes,
          a, ld,
          criticalLeasesRes, overdueAppRes,
          leaseExpiryRes, approvedInvoicesRes,
          recentInvoices, recentLeases, recentTickets, recentLeads
        ] = await Promise.all([
          supabase.from("units").select("status").eq("organization_id", org),
          supabase.from("leases").select("*", { count: 'exact', head: true }).eq("organization_id", org).eq("lease_status", "active").lte("expiry_date", in90Days),
          supabase.from("maintenance_tickets").select("priority").eq("organization_id", org).in("status", ["open", "assigned", "quoted", "in_progress"]),
          supabase.from("rent_payments").select("amount_due, amount_paid").eq("organization_id", org).gte("due_date", startOfMonth).lte("due_date", endOfMonth),
          
          supabase.from("invoices").select("*", { count: 'exact', head: true }).eq("organization_id", org).in("status", ["received", "matched", "flagged"]),
          supabase.from("leases").select("*", { count: 'exact', head: true }).eq("organization_id", org).eq("lease_status", "active").lte("expiry_date", in90Days).is("renewal_status", null),
          supabase.from("maintenance_tickets").select("*", { count: 'exact', head: true }).eq("organization_id", org).eq("status", "quoted").not("actual_cost", "is", null),
          supabase.from("leads").select("*", { count: 'exact', head: true }).eq("organization_id", org).eq("stage", "pending_signoff"),
          
          supabase.from("audit_log").select("id, action, entity_type, entity_id, new_values, created_at, user_id").eq("organization_id", org).order("created_at", { ascending: false }).limit(15),
          supabase.from("leads").select("stage").eq("organization_id", org).not("stage", "in", '("closed_won","closed_lost")'),
          
          supabase.from("leases").select("*", { count: 'exact', head: true }).eq("organization_id", org).eq("lease_status", "active").lte("expiry_date", in30Days),
          supabase.from("invoices").select("*", { count: 'exact', head: true }).eq("organization_id", org).in("status", ["received", "matched", "flagged"]).lte("created_at", overdueDate),
          
          supabase.from("leases").select("expiry_date").eq("organization_id", org).eq("lease_status", "active").gte("expiry_date", now.toISOString().split('T')[0]).lte("expiry_date", in365Days),
          supabase.from("invoices").select("total_amount").eq("organization_id", org).in("status", ["approved", "paid"]),
          
          supabase.from("invoices").select("id, vendor_name, total_amount, created_at").eq("organization_id", org).in("status", ["received", "matched", "flagged"]).order('created_at', { ascending: true }).limit(3),
          supabase.from("leases").select("id, tenant_name, expiry_date, units(unit_number)").eq("organization_id", org).eq("lease_status", "active").lte("expiry_date", in90Days).is("renewal_status", null).order('expiry_date', { ascending: true }).limit(3),
          supabase.from("maintenance_tickets").select("id, title, actual_cost").eq("organization_id", org).eq("status", "quoted").not("actual_cost", "is", null).order('priority', { ascending: false }).limit(3),
          supabase.from("leads").select("id, full_name, lead_score").eq("organization_id", org).eq("stage", "pending_signoff").order('lead_score', { ascending: false }).limit(3)
        ])

        const units = u.data || []
        const occupied = units.filter(x => x.status === "occupied").length
        
        const tickets = t.data || []
        const highPriority = tickets.filter(x => x.priority === "urgent" || x.priority === "high").length
        
        const payments = p.data || []
        const amountDue = payments.reduce((s, c) => s + (c.amount_due || 0), 0)
        const amountPaid = payments.reduce((s, c) => s + (c.amount_paid || 0), 0)

        const totalApprovedInvoices = (approvedInvoicesRes.data || []).reduce((s, c) => s + (c.total_amount || 0), 0)
        // Real NOI from actual ledger (GAAP compliant) — falls back to simple calc
        let liveNOI = amountPaid - totalApprovedInvoices
        try {
          const { data: realNoi } = await supabase.rpc('get_real_noi', {
            p_org_id: org, p_from: startOfMonth, p_to: endOfMonth
          })
          if (realNoi !== null && realNoi !== undefined) liveNOI = Number(realNoi)
        } catch(e) { /* RPC not available, use fallback */ }

        const invCount = invCountRes.count || 0
        const leaseCount = leaseCountRes.count || 0
        const maintCount = maintCountRes.count || 0
        const signoffCount = signoffCountRes.count || 0

        setStats({
          totalUnits: units.length,
          occupiedUnits: occupied,
          vacantUnits: units.length - occupied,
          occupancyRate: units.length > 0 ? Math.round((occupied / units.length) * 100) : 0,
          expiringLeases: l.count || 0,
          criticalLeasesCount: criticalLeasesRes.count || 0,
          openTickets: tickets.length,
          highPriorityTickets: highPriority,
          amountDue, amountPaid,
          collectionRate: amountDue > 0 ? Math.round((amountPaid / amountDue) * 100) : 0,
          liveNOI,
          totalPending: invCount + leaseCount + maintCount + signoffCount,
          pendingDetails: { invoices: invCount, leases: leaseCount, maintenance: maintCount, signoffs: signoffCount }
        })
        
        setActivities(a.data || [])
        
        const leadsData = ld.data || []
        setLeads({
          new: leadsData.filter(x => x.stage === "new").length,
          qualified: leadsData.filter(x => x.stage === "qualified").length,
          viewing_scheduled: leadsData.filter(x => x.stage === "viewing_scheduled").length,
          negotiating: leadsData.filter(x => x.stage === "negotiating").length,
          pending_signoff: leadsData.filter(x => x.stage === "pending_signoff").length
        })

        setOverdueApprovalsCount(overdueAppRes.count || 0)

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const chartData: { name: string, count: number, fullDate: Date }[] = []
        let currentDate = new Date(now.getFullYear(), now.getMonth(), 1)
        for (let i = 0; i < 12; i++) {
          const monthStr = months[currentDate.getMonth()]
          const yearStr = currentDate.getFullYear().toString().substring(2)
          chartData.push({ name: `${monthStr} '${yearStr}`, count: 0, fullDate: new Date(currentDate) })
          currentDate.setMonth(currentDate.getMonth() + 1)
        }
        
        ;(leaseExpiryRes.data || []).forEach(l => {
          const lDate = new Date(l.expiry_date)
          const target = chartData.find(c => c.fullDate.getMonth() === lDate.getMonth() && c.fullDate.getFullYear() === lDate.getFullYear())
          if (target) target.count += 1
        })
        setLeaseExpiries(chartData)

        setPendingItems({
          invoices: recentInvoices.data || [],
          leases: recentLeases.data || [],
          tickets: recentTickets.data || [],
          signoffs: recentLeads.data || []
        })

      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()

    const channel = supabase.channel(`dashboard-realtime-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setActivities(prev => [payload.new, ...prev].slice(0, 15))
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
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
    .fromTo(".alert-banner",
      { y: -20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5 },
      "-=0.2"
    )
    .fromTo(".activity-panel, .right-col, .lead-pipe, .expiry-chart",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
      "-=0.2"
    )

    document.querySelectorAll<HTMLElement>(".progress-fill-inner").forEach(el => {
      const w = el.getAttribute("data-width") || "0%"
      gsap.fromTo(el, { width: "0%" }, { width: w, duration: 1.3, ease: "power2.out", delay: 0.5 })
    })

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

  const formatCurrency = (val: number) => val ? `₹${val.toLocaleString('en-IN')}` : '-'
  const formatCurrencyL = (val: number) => val ? `₹${(val/100000).toFixed(1)}L` : '₹0L'
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours/24)}d ago`
  }

  const getActivityIcon = (action: string) => {
    if (action.includes('lease')) return <FileText size={14} className="text-blue-400" />
    if (action.includes('lead')) return <UserPlus size={14} className="text-purple-400" />
    if (action.includes('invoice')) return <CheckCircle2 size={14} className="text-green-400" />
    if (action.includes('maintenance')) return <Wrench size={14} className="text-amber-400" />
    return <Activity size={14} className="text-[#A1A1AA]" />
  }

  const getActivityText = (item: any) => {
    switch (item.action) {
      case 'lead_scored': return `Lead ${item.entity_id.substring(0,6)} scored/classified.`
      case 'follow_up_sent': return `Follow-up sent for lead ${item.entity_id.substring(0,6)}.`
      case 'lead_stage_updated': return `Lead moved to new stage.`
      case 'lease_ingested': return `Lease document indexed.`
      case 'invoice_approved': return `Invoice approved.`
      default: return `${item.action.replace(/_/g, ' ')}`
    }
  }

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Glass hero header */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ borderRadius: "24px", padding: "32px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p className="dash-hero-text" style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px", fontFamily: "'DM Mono',monospace" }}>
              Portfolio Overview
            </p>
            <h1 className="dash-hero-text" style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
              your <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#A1A1AA" }}>portfolio</em>
              <br />dashboard
            </h1>
          </div>
          <div className="dash-hero-text flex gap-3 flex-wrap">
            <button onClick={() => router.push('/app/properties')} className="px-4 py-2 bg-white text-black font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"><Plus size={16}/> Add Property</button>
            <button onClick={() => router.push('/app/leases')} className="px-4 py-2 bg-[#1E1E1E] text-white font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"><Upload size={16}/> Upload Lease</button>
            <button onClick={() => router.push('/app/search')} className="px-4 py-2 bg-[#1E1E1E] text-white font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"><Sparkles size={16}/> Ask AI</button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {loading ? [1,2,3,4,5,6].map(i => <div key={i} className="kpi-card h-[130px] bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse"/>) : (
          <>
            {/* Total Units */}
            <div className="kpi-card bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors transform-style-3d">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Total Units</span>
                <div className="w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center"><Building2 size={14} color="#A1A1AA"/></div>
              </div>
              <div className="text-4xl font-medium text-white mb-2">{stats.totalUnits}</div>
              <div className="text-xs text-[#A1A1AA] mb-2">Occ: {stats.occupiedUnits} | Vac: {stats.vacantUnits}</div>
              <div className="h-1 bg-black rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full progress-fill-inner" data-width={`${stats.occupancyRate}%`}/>
              </div>
            </div>

            {/* Expiring Leases */}
            <div className={`kpi-card bg-[#0D0D0D] border rounded-xl p-5 transition-colors cursor-pointer ${stats.expiringLeases > 0 ? (stats.criticalLeasesCount > 0 ? 'border-red-500/50 hover:border-red-400' : 'border-amber-500/50 hover:border-amber-400') : 'border-[#1E1E1E] hover:border-white/20'}`} onClick={() => router.push('/app/leases')}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest flex items-center gap-2">
                  Expiring Leases {stats.criticalLeasesCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>}
                </span>
                <div className="w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center"><KeySquare size={14} color="#A1A1AA"/></div>
              </div>
              <div className="text-4xl font-medium text-white mb-2">{stats.expiringLeases}</div>
              <div className="text-xs text-[#A1A1AA]">Next 90 Days</div>
            </div>

            {/* Open Tickets */}
            <div className={`kpi-card bg-[#0D0D0D] border rounded-xl p-5 transition-colors cursor-pointer ${stats.highPriorityTickets > 0 ? 'border-amber-500/50 hover:border-amber-400' : 'border-[#1E1E1E] hover:border-white/20'}`} onClick={() => router.push('/app/maintenance')}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Open Tickets</span>
                <div className="w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center"><Wrench size={14} color="#A1A1AA"/></div>
              </div>
              <div className="text-4xl font-medium text-white mb-2">{stats.openTickets}</div>
              <div className={`text-xs ${stats.highPriorityTickets > 0 ? 'text-amber-400' : 'text-[#A1A1AA]'}`}>{stats.highPriorityTickets} High Priority</div>
            </div>

            {/* Monthly Collections */}
            <div className={`kpi-card bg-[#0D0D0D] border rounded-xl p-5 transition-colors cursor-pointer ${stats.collectionRate < 80 ? 'border-amber-500/50 hover:border-amber-400' : 'border-[#1E1E1E] hover:border-white/20'}`} onClick={() => router.push('/app/analytics')}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Collections</span>
                <div className="w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center"><IndianRupee size={14} color="#A1A1AA"/></div>
              </div>
              <div className="text-3xl font-medium text-white mb-2 tracking-tight">{formatCurrencyL(stats.amountPaid)}</div>
              <div className="text-xs text-[#A1A1AA] mb-2">{stats.collectionRate}% of {formatCurrencyL(stats.amountDue)} target</div>
              <div className="h-1 bg-black rounded-full overflow-hidden">
                <div className={`h-full rounded-full progress-fill-inner ${stats.collectionRate < 80 ? 'bg-amber-500' : 'bg-green-500'}`} data-width={`${stats.collectionRate}%`}/>
              </div>
            </div>

            {/* Live NOI Telemetry */}
            <div className="kpi-card bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-cyan-500/50 transition-colors transform-style-3d relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-24 h-24 bg-cyan-500/10 blur-xl rounded-full pointer-events-none" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} className="animate-pulse"/> Live Yield (NOI)
                </span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Activity size={14} color="#00F0FF"/></div>
              </div>
              <div className="text-3xl font-bold text-white mb-2 tracking-tight relative z-10">{formatCurrencyL(stats.liveNOI)}</div>
              <div className="text-xs text-[#A1A1AA] mb-2 relative z-10">Real-time dynamic ledger computation</div>
            </div>

            {/* Pending Approvals */}
            <div className={`kpi-card bg-[#0D0D0D] border rounded-xl p-5 transition-colors cursor-pointer relative ${stats.totalPending > 10 ? 'border-red-500/50 hover:border-red-400' : stats.totalPending > 0 ? 'border-amber-500/50 hover:border-amber-400' : 'border-[#1E1E1E] hover:border-white/20'}`} onClick={() => router.push('/app/approvals')}>
              {stats.totalPending > 0 && <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${stats.totalPending > 10 ? 'bg-red-500' : 'bg-amber-500'} animate-pulse`} />}
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Pending Approvals</span>
                <div className="w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center"><CheckSquare size={14} color="#A1A1AA"/></div>
              </div>
              <div className="text-4xl font-medium text-white mb-2">{stats.totalPending}</div>
              <div className="text-[10px] text-[#A1A1AA] leading-tight">
                Inv: {stats.pendingDetails.invoices} | Ren: {stats.pendingDetails.leases} | Quo: {stats.pendingDetails.maintenance} | Sig: {stats.pendingDetails.signoffs}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Alert Banners */}
      {!loading && stats.criticalLeasesCount > 0 && !dismissedAlerts.leases && (
        <div className="alert-banner flex justify-between items-center bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"/>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">{stats.criticalLeasesCount} lease(s) expire within 30 days. Immediate renewal action required.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/app/leases')} className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded transition-colors">View Expiring Leases</button>
            <button onClick={() => setDismissedAlerts(prev => ({...prev, leases: true}))}><X size={16} className="opacity-50 hover:opacity-100"/></button>
          </div>
        </div>
      )}
      
      {!loading && overdueApprovalsCount > 0 && !dismissedAlerts.approvals && (
        <div className="alert-banner flex justify-between items-center bg-amber-500/10 border border-amber-500/20 text-amber-400 px-6 py-4 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"/>
          <div className="flex items-center gap-3">
            <Clock size={18} />
            <span className="text-sm font-medium">{overdueApprovalsCount} invoice(s) have been awaiting approval for over 48 hours.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/app/approvals')} className="text-xs bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded transition-colors">Review Invoices</button>
            <button onClick={() => setDismissedAlerts(prev => ({...prev, approvals: true}))}><X size={16} className="opacity-50 hover:opacity-100"/></button>
          </div>
        </div>
      )}

      {/* Main 2-Col */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Col: Activity Feed */}
        <div className="activity-panel lg:col-span-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex flex-col h-[500px]">
          <div className="p-5 border-b border-[#1E1E1E] flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><Activity size={16} color="#A1A1AA" /> Recent Activity</div>
            <button className="text-xs text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-1">View All <ArrowRight size={12}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? [1,2,3,4].map(i => <div key={i} className="h-16 border-b border-[#1E1E1E] animate-pulse m-2 bg-black rounded" />) :
              activities.length === 0 ? <div className="p-8 text-center text-[#A1A1AA] text-sm">No recent activity</div> :
              activities.map((item, i) => (
              <div key={i} className="p-3 border-b border-[#1E1E1E]/50 flex gap-3 hover:bg-white/5 transition-colors cursor-pointer group rounded-lg">
                <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center">
                  {getActivityIcon(item.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium capitalize">{item.action.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-[#A1A1AA] truncate mt-0.5">{getActivityText(item)}</div>
                </div>
                <div className="text-xs text-[#A1A1AA] whitespace-nowrap mt-1 font-mono">{getTimeAgo(item.created_at)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Pending Approvals */}
        <div className="right-col lg:col-span-2 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex flex-col h-[500px] overflow-hidden">
          <div className="p-5 border-b border-[#1E1E1E] flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><CheckSquare size={16} color="#A1A1AA" /> Pending Approvals</div>
            <button onClick={() => router.push('/app/approvals')} className="text-xs text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-1">Go to Approvals <ArrowUpRight size={12}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {loading ? [1,2,3].map(i => <div key={i} className="h-20 bg-black animate-pulse rounded border border-[#1E1E1E]" />) : (
              <>
                {/* Invoices Mini */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Invoices ({stats.pendingDetails.invoices})</span>
                    <button onClick={() => router.push('/app/approvals')} className="text-xs text-blue-400 hover:text-blue-300">Review All →</button>
                  </div>
                  {pendingItems.invoices.length === 0 ? <div className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12}/> All clear</div> :
                    <div className="space-y-2">
                      {pendingItems.invoices.map((inv: any) => (
                        <div key={inv.id} className="bg-black border border-[#1E1E1E] p-3 rounded-lg flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white font-medium truncate">{inv.vendor_name || 'Vendor'}</div>
                            <div className="text-xs text-[#A1A1AA] mt-0.5">{getTimeAgo(inv.created_at)}</div>
                          </div>
                          <div className="text-sm font-bold text-white pl-3">{formatCurrency(inv.total_amount)}</div>
                        </div>
                      ))}
                    </div>
                  }
                </div>

                {/* Leases Mini */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Lease Renewals ({stats.pendingDetails.leases})</span>
                    <button onClick={() => router.push('/app/approvals')} className="text-xs text-blue-400 hover:text-blue-300">Review All →</button>
                  </div>
                  {pendingItems.leases.length === 0 ? <div className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12}/> All clear</div> :
                    <div className="space-y-2">
                      {pendingItems.leases.map((lease: any) => (
                        <div key={lease.id} className="bg-black border border-[#1E1E1E] p-3 rounded-lg flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-white font-medium truncate">{lease.tenant_name}</div>
                            <div className="text-xs text-[#A1A1AA] mt-0.5">Unit {lease.units?.unit_number}</div>
                          </div>
                          <div className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                            {Math.ceil((new Date(lease.expiry_date).getTime() - Date.now()) / 86400000)}d left
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </div>

                {/* Deals Mini */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Deal Sign-offs ({stats.pendingDetails.signoffs})</span>
                    <button onClick={() => router.push('/app/approvals')} className="text-xs text-blue-400 hover:text-blue-300">Review All →</button>
                  </div>
                  {pendingItems.signoffs.length === 0 ? <div className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12}/> All clear</div> :
                    <div className="space-y-2">
                      {pendingItems.signoffs.map((lead: any) => (
                        <div key={lead.id} className="bg-black border border-[#1E1E1E] p-3 rounded-lg flex justify-between items-center">
                          <div className="text-sm text-white font-medium truncate flex-1">{lead.full_name}</div>
                          <div className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                            Score: {lead.lead_score}
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Lead Pipeline */}
      <section className="lead-pipe bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-white mb-6"><Users size={16} color="#A1A1AA"/> Lead Pipeline</div>
        <div className="flex flex-col md:flex-row w-full h-16 rounded-lg overflow-hidden border border-[#1E1E1E]">
          {[
            { label: "New", count: leads.new, color: "bg-blue-900/40 border-blue-500/30 text-blue-300" },
            { label: "Qualified", count: leads.qualified, color: "bg-indigo-900/40 border-indigo-500/30 text-indigo-300" },
            { label: "Viewing", count: leads.viewing_scheduled, color: "bg-purple-900/40 border-purple-500/30 text-purple-300" },
            { label: "Negotiating", count: leads.negotiating, color: "bg-fuchsia-900/40 border-fuchsia-500/30 text-fuchsia-300" },
            { label: "Sign-off", count: leads.pending_signoff, color: "bg-pink-900/40 border-pink-500/30 text-pink-300" }
          ].map((stage, i) => {
            const totalActive = Object.values(leads).reduce((a,b)=>a+b,0) || 1
            const pct = Math.max((stage.count / totalActive) * 100, 5) // min 5% width so it's visible
            return (
              <div key={stage.label} className={`h-full flex flex-col justify-center items-center border-r last:border-0 border-[#1E1E1E] hover:bg-white/5 transition-colors cursor-pointer ${stage.color}`} style={{ width: `${pct}%` }} onClick={() => router.push('/app/leads')}>
                <span className="text-xs opacity-70 uppercase tracking-wider hidden sm:block">{stage.label}</span>
                <span className="text-lg font-bold">{stage.count}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Expiry Timeline */}
      <section className="expiry-chart bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-white mb-6"><TrendingUp size={16} color="#A1A1AA"/> Lease Expiry Timeline — Next 12 Months</div>
        <div className="h-[250px] w-full">
          {loading ? <div className="w-full h-full bg-black/50 animate-pulse rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaseExpiries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: '#1E1E1E'}} 
                  contentStyle={{backgroundColor: '#000', border: '1px solid #1E1E1E', borderRadius: '8px'}}
                  labelStyle={{color: '#A1A1AA', fontSize: '12px'}}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {leaseExpiries.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count >= 5 ? '#ef4444' : entry.count >= 3 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

    </div>
  )
}
