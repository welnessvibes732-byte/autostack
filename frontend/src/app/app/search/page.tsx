"use client"
import { useState, useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Search, Sparkles, FileText, Database } from "lucide-react"

gsap.registerPlugin(useGSAP)

const SUGGESTIONS = [
  "Which leases expire next month?",
  "Show maintenance costs for 2025",
  "What is the pet policy for Unit 4A?",
  "List all overdue rent payments",
]

export default function AISearch() {
  const ref     = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [answered, setAnswered] = useState(false)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".search-header", { opacity: 0, y: -24, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.3)" })
      .fromTo(".search-box",    { opacity: 0, y: 20  }, { opacity: 1, y: 0, duration: 0.45 }, "-=0.2")
      .fromTo(".search-chip",   { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.06, ease: "back.out(1.5)" }, "-=0.1")
      .fromTo(".search-result", { opacity: 0, y: 16  }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.05")
  }, { scope: ref })

  const handleSearch = (q = query) => {
    if (!q.trim()) return
    setQuery(q)
    gsap.to(".search-result", { opacity: 0, y: 8, duration: 0.2, onComplete: () => {
      setAnswered(true)
      gsap.fromTo(".search-result", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" })
      gsap.fromTo(".result-source", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.07, delay: 0.2 })
    }})
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "780px", margin: "0 auto", paddingTop: "24px" }}>
      {/* Header */}
      <header className="search-header" style={{ textAlign: "center" }}>
        <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg,#3b82f6,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 40px rgba(59,130,246,0.35)" }}>
          <Sparkles size={22} color="#fff" />
        </div>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "28px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: "0 0 6px" }}>AI Portfolio Search</h1>
        <p style={{ color: "var(--text-2)", fontSize: "14px" }}>Query your entire portfolio, documents, leases & ops data in plain English.</p>
      </header>

      {/* Search box */}
      <div className="search-box" style={{ padding: "24px", borderRadius: "18px", background: "var(--surface)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "5%", right: "5%", height: "1px", background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.4),transparent)" }} />
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} color="var(--text-3)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Ask anything about your portfolio…"
              style={{ display: "block", width: "100%", height: "48px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", padding: "0 14px 0 40px", fontSize: "14px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s, box-shadow 0.2s" }}
              onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)" }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none" }}
            />
          </div>
          <button onClick={() => handleSearch()} style={{ padding: "0 24px", borderRadius: "12px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", border: "none", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.35)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -1, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1,    y: 0,  duration: 0.3, ease: "back.out(1.5)" })}
          >Search</button>
        </div>

        <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 500, letterSpacing: "0.04em" }}>TRY:</span>
          {SUGGESTIONS.map(s => (
            <button key={s} className="search-chip" onClick={() => { setQuery(s); handleSearch(s) }}
              style={{ padding: "5px 12px", borderRadius: "99px", fontSize: "12px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-2)", color: "var(--text-2)", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.color = "#93c5fd"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)" }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--border-2)" }}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="search-result" style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", minHeight: "240px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: answered ? "#10b981" : "var(--surface-3)", boxShadow: answered ? "0 0 8px #10b981" : "none", transition: "all 0.3s" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff", fontFamily: "'Sora',sans-serif" }}>Results</span>
        </div>
        <div style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "180px" }}>
          {!answered ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Search size={16} color="var(--text-3)" />
              </div>
              <p style={{ color: "var(--text-3)", fontSize: "14px" }}>Ask a question above to get started.</p>
            </div>
          ) : (
            <div style={{ width: "100%" }}>
              <div style={{ padding: "16px 20px", borderRadius: "10px", background: "rgba(59,130,246,0.06)", borderLeft: "3px solid #3b82f6", marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>AI Response:</div>
                <p style={{ color: "var(--text-2)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                  Based on your portfolio data, the leases expiring next month are <strong style={{color:"#fff"}}>Unit 14B</strong> (Jane Smith, ₹45,000/mo) and <strong style={{color:"#fff"}}>Unit 2A</strong> (Rahul Kumar, ₹38,000/mo). Both require renewal action within 30 days.
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[{ icon: FileText, label: "lease_agreement_14B.pdf", sub: "Page 1 · Binding" }, { icon: Database, label: "leases table", sub: "Direct query · 2 rows" }].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="result-source" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-2)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <Icon size={12} color="var(--text-3)" />
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)" }}>{label}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-3)" }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
