"use client"
import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { FileText, Upload, UploadCloud, Search, Brain } from "lucide-react"

gsap.registerPlugin(useGSAP)

const DOCS = [
  { id: "doc-001", name: "lease_agreement_14B.pdf", type: "Lease", unit: "Unit 14B", date: "2026-04-28", status: "Indexed", statusColor: "#10b981" },
  { id: "doc-002", name: "maintenance_quote_4A.pdf", type: "Invoice", unit: "Unit 4A", date: "2026-04-25", status: "Indexed", statusColor: "#10b981" },
  { id: "doc-003", name: "noc_building_A.docx", type: "NOC", unit: "Building A", date: "2026-04-20", status: "Processing", statusColor: "#f59e0b" },
]

export default function Documents() {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header",  { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".upload-zone",  { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-filter",  { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".anim-row",     { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08 }, "-=0.1")
  }, { scope: ref })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>VAULT</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={22} color="var(--text-2)" /> Documents
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>All files are vectorised and indexed for AI Search.</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
        ><input type="file" hidden onChange={(e) => { if(e.target.files) alert("Document upload triggered for " + e.target.files[0].name) }} /><Upload size={14} /> Upload Document</label>
      </header>

      {/* Drop zone */}
      <div className="upload-zone" style={{ borderRadius: "16px", border: "2px dashed rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.03)", padding: "36px", textAlign: "center", cursor: "pointer", transition: "all 0.25s", position: "relative", overflow: "hidden" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; e.currentTarget.style.background = "rgba(59,130,246,0.06)"; gsap.to(".upload-icon", { y: -6, duration: 0.3, ease: "power2.out" }) }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)"; e.currentTarget.style.background = "rgba(59,130,246,0.03)"; gsap.to(".upload-icon", { y: 0, duration: 0.4, ease: "back.out(1.5)" }) }}
      >
        <UploadCloud className="upload-icon" size={36} color="#3b82f6" style={{ margin: "0 auto 12px", display: "block" }} />
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: "15px", color: "#fff", marginBottom: "4px" }}>Drag & drop documents here</div>
        <div style={{ fontSize: "12px", color: "var(--text-3)" }}>Supports PDF, DOCX, XLSX, CSV · Auto-vectorised on upload</div>
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "#93c5fd" }}>
          <Brain size={12} /> AI-powered indexing enabled
        </div>
      </div>

      {/* Filters */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "280px" }}>
          <Search size={14} color="var(--text-3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input type="text" placeholder="Search filename…" style={{ display: "block", width: "100%", height: "38px", borderRadius: "9px", border: "1px solid var(--border-2)", background: "rgba(0,0,0,0.25)", padding: "0 12px 0 34px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
            onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
          />
        </div>
        {["All Types","Lease","Invoice","NOC"].map((f, i) => (
          <button key={f} style={{ padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent", border: i === 0 ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)", color: i === 0 ? "#fff" : "var(--text-3)", transition: "all 0.2s" }}
            onMouseEnter={e => { if(i!==0){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.05)"} }}
            onMouseLeave={e => { if(i!==0){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent"} }}
          >{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Filename","Type","Property","Uploaded","AI Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOCS.map((doc, i) => (
              <tr key={doc.id} className="anim-row" style={{ borderBottom: i < DOCS.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={13} color="#3b82f6" />
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>{doc.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}>{doc.type}</span>
                </td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{doc.unit}</td>
                <td style={{ padding: "14px 18px", fontSize: "12px", color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{doc.date}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${doc.statusColor}15`, color: doc.statusColor, border: `1px solid ${doc.statusColor}30` }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: doc.statusColor, boxShadow: `0 0 5px ${doc.statusColor}` }} />
                    {doc.status}
                  </span>
                </td>
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <button style={{ fontSize: "12px", fontWeight: 500, color: "#93c5fd", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#93c5fd")}
                  >View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
