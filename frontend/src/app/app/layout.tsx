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
  ChevronLeft, Menu
} from "lucide-react"

gsap.registerPlugin(useGSAP)

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4"

const navItems = [
  { name: "Dashboard",    href: "/app/dashboard",    icon: LayoutDashboard },
  { name: "Properties",   href: "/app/properties",   icon: Building2 },
  { name: "Leases",       href: "/app/leases",       icon: KeySquare },
  { name: "Tenants",      href: "/app/tenants",      icon: Users },
  { name: "Leads",        href: "/app/leads",        icon: UserPlus },
  { name: "Maintenance",  href: "/app/maintenance",  icon: Wrench },
  { name: "Documents",    href: "/app/documents",    icon: FileText },
  { name: "AI Search",    href: "/app/search",       icon: Search },
  { name: "Analytics",    href: "/app/analytics",    icon: BarChart3 },
  { name: "Invoices",     href: "/app/invoices",     icon: Receipt },
  { name: "Alerts",       href: "/app/alerts",       icon: BellRing },
  { name: "Integrations", href: "/app/integrations", icon: Link2 },
  { name: "Settings",     href: "/app/settings",     icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loading,     setLoading]     = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const mainRef    = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login")
      else setLoading(false)
    })
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
      <video autoPlay loop muted playsInline src={VIDEO_SRC}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45, zIndex: 0 }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div className="float-anim" style={{ fontSize: "40px" }}>🌿</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "rgba(255,255,255,0.6)",
              animation: "pulse-dot 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{
      display: "flex", height: "100dvh", overflow: "hidden",
      background: "#000", color: "#fff",
      fontFamily: "'Poppins', system-ui, sans-serif",
      position: "relative",
    }}>

      {/* ── Full-screen video background ── */}
      <video
        autoPlay loop muted playsInline
        src={VIDEO_SRC}
        style={{
          position: "fixed", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: 0.4, zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {/* Dark overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.6) 100%)",
      }} />

      {/* ── Sidebar ── */}
      <aside
        ref={sidebarRef}
        className="liquid-glass-strong"
        style={{
          width: isCollapsed ? "64px" : "220px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
          margin: "12px 0 12px 12px",
          borderRadius: "24px",
          overflow: "hidden",
        }}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(v => !v)}
          style={{
            position: "absolute", right: "-13px", top: "28px",
            width: "26px", height: "26px", borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 20, color: "rgba(255,255,255,0.5)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color = "#fff" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)" }}
        >
          {isCollapsed ? <Menu size={11} /> : <ChevronLeft size={11} />}
        </button>

        {/* Logo */}
        <div style={{
          height: "64px", display: "flex", alignItems: "center",
          padding: "0 18px", gap: "10px", overflow: "hidden", flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px",
          }}>🌿</div>
          {!isCollapsed && (
            <span style={{
              fontFamily: "'Poppins', system-ui, sans-serif",
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
                className={`nav-link-item${isActive ? " liquid-glass" : ""}`}
                title={isCollapsed ? item.name : undefined}
                style={{
                  display: "flex", alignItems: "center",
                  gap: isCollapsed ? 0 : "10px",
                  padding: isCollapsed ? "10px" : "8px 14px",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontFamily: "'Poppins', system-ui, sans-serif",
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
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>

        {/* Sign Out */}
        <div style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center",
              gap: isCollapsed ? 0 : "10px",
              justifyContent: isCollapsed ? "center" : "flex-start",
              width: "100%", padding: isCollapsed ? "10px" : "8px 14px",
              borderRadius: "9999px", cursor: "pointer",
              border: "none", background: "transparent",
              color: "rgba(255,255,255,0.3)",
              fontSize: "13px",
              fontFamily: "'Poppins', system-ui, sans-serif",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "#fff"; el.style.background = "rgba(255,255,255,0.06)" }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.color = "rgba(255,255,255,0.3)"; el.style.background = "transparent" }}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            {!isCollapsed && <span>sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        ref={mainRef}
        style={{
          flex: 1, minWidth: 0, overflowY: "auto",
          position: "relative", zIndex: 5,
        }}
      >
        <div style={{
          padding: "24px 28px", maxWidth: "1440px",
          margin: "0 auto", minHeight: "100%", paddingBottom: "80px",
        }}>
          {children}
        </div>
      </main>
    </div>
  )
}
