"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import {
  LayoutDashboard, Building2, KeySquare, Users, UserPlus, Wrench,
  FileText, Search, BarChart3, Receipt, BellRing, Link2, Settings, LogOut,
  ChevronLeft, Menu, X, CheckSquare, Truck, IndianRupee
} from "lucide-react"

import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

const navItems = [
  { name: "Dashboard",    href: "/app/dashboard",    icon: LayoutDashboard },
  { name: "Properties",   href: "/app/properties",   icon: Building2 },
  { name: "Leases",       href: "/app/leases",       icon: KeySquare },
  { name: "Tenants",      href: "/app/tenants",      icon: Users },
  { name: "Leads",        href: "/app/leads",        icon: UserPlus },
  { name: "Maintenance",  href: "/app/maintenance",  icon: Wrench },
  { name: "Vendors",      href: "/app/vendors",      icon: Truck },
  { name: "Documents",    href: "/app/documents",    icon: FileText },
  { name: "AI Search",    href: "/app/search",       icon: Search },
  { name: "Analytics",    href: "/app/analytics",    icon: BarChart3 },
  { name: "Finance",      href: "/app/finance",      icon: IndianRupee },
  { name: "Invoices",     href: "/app/invoices",     icon: Receipt },
  { name: "Approvals",    href: "/app/approvals",    icon: CheckSquare },
  { name: "Alerts",       href: "/app/alerts",       icon: BellRing },
  { name: "Integrations", href: "/app/integrations", icon: Link2 },
  { name: "Settings",     href: "/app/settings",     icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loading,     setLoading]     = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const sidebarRef = useRef<HTMLElement>(null)
  const mainRef    = useRef<HTMLElement>(null)

  useEffect(() => {
    let channel: any;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login")
      else {
        setLoading(false)
        const init = async () => {
          const orgId = await getOrCreateOrg()
          const fetchCounts = async () => {
            const [invoiceCount, leaseCount, maintenanceCount, signoffCount] = await Promise.all([
              supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['received', 'matched', 'flagged']),
              supabase.from('leases').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('lease_status', 'active').lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).is('renewal_status', null),
              supabase.from('maintenance_tickets').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'quoted').not('actual_cost', 'is', null),
              supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('stage', 'pending_signoff')
            ])
            setPendingApprovals((invoiceCount.count || 0) + (leaseCount.count || 0) + (maintenanceCount.count || 0) + (signoffCount.count || 0))
          }
          await fetchCounts()
          
          const channelId = `approvals-badge-realtime-${Math.random()}`
          channel = supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${orgId}` }, fetchCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tickets', filter: `organization_id=eq.${orgId}` }, fetchCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `organization_id=eq.${orgId}` }, fetchCounts)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leases', filter: `organization_id=eq.${orgId}` }, fetchCounts)
            .subscribe()
        }
        init()
      }
    })
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])

  useGSAP(() => {
    if (loading) return
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.fromTo(sidebarRef.current,
      { x: -80, opacity: 0, filter: "blur(12px)" },
      { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.8 }
    )
    .fromTo(".nav-link-item",
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.04 },
      "-=0.4"
    )
    .fromTo(mainRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5 },
      "-=0.3"
    )
  }, { dependencies: [loading] })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  /* Loading */
  if (loading) return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div className="float-anim" style={{ fontSize: "40px" }}>🌿</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "#0D0D0D",
              animation: "pulse-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden relative bg-black text-white font-[Poppins,system-ui,sans-serif]" style={{ overflow: "hidden",
      background: "#000", color: "#fff",
      position: "relative",
    }}>

      {/* Dark overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "#000000",
      }} />

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#1E1E1E] bg-[#050505] relative z-20">
        <div className="flex items-center gap-2">
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#0D0D0D", border: "1px solid #1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🌿</div>
          <span className="font-semibold text-white tracking-tight">PropIQ</span>
        </div>
        <button onClick={() => setIsMobileOpen(true)} className="text-gray-400 p-1">
          <Menu size={24} />
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        className={`bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl flex flex-col flex-shrink-0 z-50 fixed md:relative transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isMobileOpen ? "left-3" : "-left-[300px] md:left-0"}`}
        style={{
          width: isCollapsed ? "64px" : "220px",
          height: "calc(100vh - 24px)",
          margin: "12px 0 12px 12px",
          top: "0"
        }}
      >
        {/* Mobile close button */}
        <button onClick={() => setIsMobileOpen(false)} className="absolute right-4 top-5 md:hidden text-gray-400 z-50">
          <X size={20} />
        </button>

        {/* Collapse toggle (desktop only) */}
        <button
          className="hidden md:flex absolute -right-[13px] top-[28px] w-[26px] h-[26px] rounded-full bg-[#0D0D0D] border border-[#1E1E1E] items-center justify-center cursor-pointer z-20 text-[#A1A1AA] transition-all duration-200 hover:bg-white/10 hover:text-white"
          onClick={() => setIsCollapsed(v => !v)}
        >
          {isCollapsed ? <Menu size={11} /> : <ChevronLeft size={11} />}
        </button>

        {/* Logo */}
        <div style={{
          height: "64px", display: "flex", alignItems: "center",
          padding: "0 18px", gap: "10px", overflow: "hidden", flexShrink: 0,
          borderBottom: "1px solid #1E1E1E",
        }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
            background: "#0D0D0D",
            border: "1px solid #1E1E1E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px",
          }}>🌿</div>
          {(!isCollapsed || isMobileOpen) && (
            <span style={{
              fontWeight: 600, fontSize: "16px",
              letterSpacing: "-0.04em", color: "#fff",
              whiteSpace: "nowrap",
            }}>PropIQ</span>
          )}
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`nav-link-item${isActive ? " liquid-glass" : ""}`}
                title={isCollapsed && !isMobileOpen ? item.name : undefined}
                style={{
                  display: "flex", alignItems: "center",
                  gap: isCollapsed && !isMobileOpen ? 0 : "10px",
                  padding: isCollapsed && !isMobileOpen ? "10px" : "8px 14px",
                  justifyContent: isCollapsed && !isMobileOpen ? "center" : "flex-start",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                  transition: "all 0.18s ease",
                  whiteSpace: "nowrap", overflow: "hidden",
                  background: isActive ? undefined : "transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.color = "#fff"
                    el.style.background = "rgba(255,255,255,0.06)"
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLAnchorElement
                    el.style.color = "rgba(255,255,255,0.45)"
                    el.style.background = "transparent"
                  }
                }}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                {(!isCollapsed || isMobileOpen) && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                    {item.name === "Approvals" && pendingApprovals > 0 && (
                      <span style={{
                        background: "#ef4444", color: "white", fontSize: "10px", fontWeight: "bold",
                        padding: "2px 6px", borderRadius: "10px", marginLeft: "4px"
                      }}>
                        {pendingApprovals}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Sign Out */}
        <div style={{ padding: "8px", borderTop: "1px solid #1E1E1E" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center",
              gap: isCollapsed && !isMobileOpen ? 0 : "10px",
              justifyContent: isCollapsed && !isMobileOpen ? "center" : "flex-start",
              width: "100%", padding: isCollapsed && !isMobileOpen ? "10px" : "8px 14px",
              borderRadius: "9999px", cursor: "pointer",
              border: "none", background: "transparent",
              color: "#A1A1AA",
              fontSize: "13px",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "#fff"; el.style.background = "rgba(255,255,255,0.06)" }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "rgba(255,255,255,0.3)"; el.style.background = "transparent" }}
            title={isCollapsed && !isMobileOpen ? "Sign Out" : undefined}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            {(!isCollapsed || isMobileOpen) && <span>sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        ref={mainRef}
        style={{
          flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden",
          position: "relative", zIndex: 5,
        }}
      >
        <div style={{
          padding: "24px 28px", maxWidth: "1440px",
          margin: "0 auto", minHeight: "100%", paddingBottom: "80px",
        }} className="px-4 sm:px-[28px]">
          {children}
        </div>
      </main>
    </div>
  )
}
