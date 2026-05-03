"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { FileText, Upload, UploadCloud, Search, Brain, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

export default function Documents() {
  const ref = useRef<HTMLDivElement>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Upload states
  const [uploadStatus, setUploadStatus] = useState<'idle'|'uploading'|'processing'|'success'>('idle')

  useEffect(() => {
    fetchDocs()
  }, [])

  async function fetchDocs() {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          lease:leases(unit:units(unit_number, property:properties(name)))
        `)
        .order('created_at', { ascending: false })
      if (error) throw error

      const transformed = (data || []).map(d => {
        let typeStr = d.doc_type || 'Unknown'
        typeStr = typeStr.charAt(0).toUpperCase() + typeStr.slice(1)

        let unitStr = '—'
        if (d.lease?.unit) {
          unitStr = `${d.lease.unit.property?.name ? d.lease.unit.property.name + ' – ' : ''}${d.lease.unit.unit_number}`
        }

        const dateStr = new Date(d.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        
        let statusStr = d.index_status || 'Pending'
        statusStr = statusStr.charAt(0).toUpperCase() + statusStr.slice(1)
        
        let color = '#f59e0b'
        if (statusStr.toLowerCase() === 'indexed' || statusStr.toLowerCase() === 'completed') { statusStr = 'Indexed'; color = '#10b981' }
        if (statusStr.toLowerCase() === 'pending') { statusStr = 'Processing'; color = '#f59e0b' }
        if (statusStr.toLowerCase() === 'failed') color = '#f43f5e'

        return {
          id: d.id,
          name: d.file_name,
          type: typeStr,
          unit: unitStr,
          date: dateStr,
          status: statusStr,
          statusColor: color
        }
      })
      setDocs(transformed)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploadStatus('uploading')

    try {
      const organization_id = await getOrCreateOrg()

      // Upload to bucket
      const filePath = `${organization_id}/${Date.now()}_${file.name}`
      const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file)
      if (uploadErr) throw new Error("Storage Upload Error: " + uploadErr.message)

      setUploadStatus('processing')

      // Insert row into documents
      const { error: dbErr } = await supabase.from('documents').insert({
        organization_id,
        lease_id: null,
        file_path: filePath,
        file_name: file.name,
        doc_type: 'general',
        authority_level: 4,
        index_status: 'pending'
      })
      if (dbErr) throw new Error("Database Insert Error: " + dbErr.message)

      // Call n8n webhook
      try {
        await fetch('http://localhost:5678/webhook-test/02169021-3bd5-4731-9232-18ee8906ce05', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            event: 'document_uploaded', 
            file_path: filePath, 
            organization_id: organization_id,
            file_name: file.name
          })
        })
      } catch(webhookErr) {
        console.warn("Webhook failed (expected if n8n not running locally):", webhookErr)
      }

      setUploadStatus('success')
      fetchDocs() // refresh list
      setTimeout(() => setUploadStatus('idle'), 4000)
    } catch (err: any) {
      alert("Error: " + err.message)
      setUploadStatus('idle')
    }
  }

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header",  { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".upload-zone",  { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-filter",  { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".anim-row",     { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08 }, "-=0.1")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)"  }}>
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
        >
          <input type="file" hidden onChange={(e) => { if(e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]) }} />
          <Upload size={14} /> Upload Document
        </label>
      </header>

      {/* Drop zone */}
      <label className="upload-zone" style={{ borderRadius: "16px", border: "2px dashed rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.03)", padding: "36px", textAlign: "center", cursor: "pointer", transition: "all 0.25s", position: "relative", overflow: "hidden", display: "block" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; e.currentTarget.style.background = "rgba(59,130,246,0.06)"; gsap.to(".upload-icon", { y: -6, duration: 0.3, ease: "power2.out" }) }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.25)"; e.currentTarget.style.background = "rgba(59,130,246,0.03)"; gsap.to(".upload-icon", { y: 0, duration: 0.4, ease: "back.out(1.5)" }) }}
      >
        <input type="file" hidden onChange={(e) => { if(e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]) }} />
        <UploadCloud className="upload-icon" size={36} color="#3b82f6" style={{ margin: "0 auto 12px", display: "block" }} />
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: "15px", color: "#fff", marginBottom: "4px" }}>Drag & drop documents here</div>
        <div style={{ fontSize: "12px", color: "var(--text-3)" }}>Supports PDF, DOCX, XLSX, CSV · Auto-vectorised on upload</div>
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "#93c5fd" }}>
          <Brain size={12} /> AI-powered indexing enabled
        </div>
      </label>

      {/* Filters */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "280px" }}>
          <Search size={14} color="var(--text-3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input type="text" placeholder="Search filename…" style={{ display: "block", width: "100%", height: "38px", borderRadius: "9px", border: "1px solid var(--border-2)", background: "rgba(0,0,0,0.25)", padding: "0 12px 0 34px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
            onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
          />
        </div>
        {["All Types","Lease","Invoice","Property","General"].map((f, i) => (
          <button key={f} style={{ padding: "6px 14px", borderRadius: "99px", fontSize: "13px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", background: i === 0 ? "rgba(255,255,255,0.08)" : "transparent", border: i === 0 ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)", color: i === 0 ? "#fff" : "var(--text-3)", transition: "all 0.2s" }}
            onMouseEnter={e => { if(i!==0){e.currentTarget.style.color="#fff";e.currentTarget.style.background="rgba(255,255,255,0.05)"} }}
            onMouseLeave={e => { if(i!==0){e.currentTarget.style.color="var(--text-3)";e.currentTarget.style.background="transparent"} }}
          >{f}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Filename","Type","Property","Uploaded","AI Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "150px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "60px", borderRadius: "99px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "100px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "80px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "70px", borderRadius: "99px" }} /></td>
                  <td style={{ padding: "14px 18px" }} />
                </tr>
              ))
            ) : docs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-3)", fontSize: "14px" }}>No documents uploaded yet.</td></tr>
            ) : docs.map((doc, i) => (
              <tr key={doc.id} className="anim-row" style={{ borderBottom: i < docs.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "7px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={13} color="#3b82f6" />
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }} title={doc.name}>{doc.name}</span>
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

      {/* Upload Status Toast */}
      {uploadStatus !== 'idle' && (
        <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000, background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", animation: "slideUp 0.3s ease-out forwards" }}>
          {uploadStatus === 'uploading' && <Loader2 size={18} color="#3b82f6" className="spin" />}
          {uploadStatus === 'processing' && <Loader2 size={18} color="#f59e0b" className="spin" />}
          {uploadStatus === 'success' && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={12} color="#fff" /></div>}
          
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>
              {uploadStatus === 'uploading' ? 'Uploading document...' : uploadStatus === 'processing' ? 'Processing with AI...' : 'Upload complete!'}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
              {uploadStatus === 'uploading' ? 'Saving to secure storage' : uploadStatus === 'processing' ? 'Extracting document details' : 'Document has been queued for review'}
            </span>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0, transform: translateY(20px); } to { opacity: 1, transform: translateY(0); } }
      `}} />
    </div>
  )
}
