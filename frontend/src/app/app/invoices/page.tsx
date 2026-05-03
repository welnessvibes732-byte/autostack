"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Receipt, Plus, FileText, AlertTriangle, CheckCircle2, X, Loader2, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

export default function Invoices() {
  const ref = useRef<HTMLDivElement>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ vendor_name: "", amount: "", unit_id: "", invoice_date: new Date().toISOString().split("T")[0] })
  const [unitsList, setUnitsList] = useState<any[]>([])

  // Upload states
  const [uploadStatus, setUploadStatus] = useState<'idle'|'uploading'|'processing'|'success'>('idle')

  const STATUS_COLOR: Record<string, string> = {
    pending:  "#f59e0b",
    approved: "#10b981",
    rejected: "#f43f5e",
    anomaly:  "#f43f5e",
    paid:     "#3b82f6",
  }

  useEffect(() => { fetchInvoices() }, [])

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, unit:units(unit_number, property:properties(name))")
        .order("created_at", { ascending: false })
      if (error) throw error
      setInvoices(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function openModal() {
    const { data } = await supabase.from("units").select("id, unit_number, property:properties(name)")
    if (data) setUnitsList(data)
    setShowModal(true)
  }

  async function submitInvoice() {
    if (!form.vendor_name || !form.amount) { alert("Please enter vendor name and amount."); return }
    setIsSubmitting(true)
    try {
      const organization_id = await getOrCreateOrg()
      const { error } = await supabase.from("invoices").insert({
        organization_id,
        vendor_name: form.vendor_name,
        amount: parseFloat(form.amount),
        unit_id: form.unit_id || null,
        invoice_date: form.invoice_date,
        status: "pending",
      })
      if (error) throw error
      setShowModal(false)
      setForm({ vendor_name: "", amount: "", unit_id: "", invoice_date: new Date().toISOString().split("T")[0] })
      fetchInvoices()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally { setIsSubmitting(false) }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadStatus('uploading');

    try {
      const organization_id = await getOrCreateOrg();
      const filePath = `${organization_id}/${Date.now()}_${file.name}`;
      
      const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadErr) throw new Error("Storage Upload Error: " + uploadErr.message);

      setUploadStatus('processing');

      const { error: dbErr } = await supabase.from('documents').insert({
        organization_id,
        lease_id: null,
        file_path: filePath,
        file_name: file.name,
        doc_type: 'invoice',
        authority_level: 4,
        index_status: 'pending'
      });
      if (dbErr) throw new Error("Database Insert Error: " + dbErr.message);

      try {
        await fetch('http://localhost:5678/webhook-test/d093c250-b1dc-4575-a910-4f87312fb238', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'document_uploaded', file_path: filePath, organization_id: organization_id, file_name: file.name })
        });
      } catch(webhookErr) {
        console.warn("Webhook failed:", webhookErr);
      }

      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
      setUploadStatus('idle');
    }
  }

  const pendingCount  = invoices.filter(i => i.status === "pending").length
  const anomalyCount  = invoices.filter(i => i.status === "anomaly" || i.status === "rejected").length
  const totalAmount   = invoices.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalStr      = totalAmount >= 100000 ? `₹${(totalAmount / 100000).toFixed(1)}L` : `₹${(totalAmount / 1000).toFixed(1)}K`

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-stat",   { opacity: 0, y: 20, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-row",    { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.09 }, "-=0.1")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>FINANCE</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Receipt size={22} color="var(--text-2)" /> Invoices
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Vendor invoices and payment tracking.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)", color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
            onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0, duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
          >
            <input type="file" hidden onChange={(e) => { if(e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]) }} />
            <Upload size={14} /> Upload Invoice PDF
          </label>
          <button onClick={openModal} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
          ><Plus size={14} /> Add Invoice</button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "14px" }}>
        {[
          { label: "Pending Approval", value: pendingCount, color: "#f59e0b", icon: Receipt },
          { label: "Anomalies Found",  value: anomalyCount, color: "#f43f5e", icon: AlertTriangle },
          { label: "Total (All Time)", value: totalStr,     color: "#10b981", icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="anim-stat" style={{ padding: "18px 20px", borderRadius: "14px", background: "#0D0D0D", border: "1px solid #1E1E1E", display: "flex", alignItems: "center", gap: "14px", cursor: "default" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -3, boxShadow: `0 12px 30px ${color}25`, duration: 0.25 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { y: 0, boxShadow: "none", duration: 0.35, ease: "back.out(1.5)" })}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #333", flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "22px", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "3px" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: "10px" }}>
        {["All", "Pending", "Approved", "Anomaly"].map((f, i) => (
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
              {["Vendor","Unit","Amount","Date","Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {[1,2,3,4,5,6].map(j => <td key={j} style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "80px" }} /></td>)}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-3)", fontSize: "14px" }}>No invoices yet. Add your first vendor invoice.</td></tr>
            ) : invoices.map((inv, i) => {
              const sColor = STATUS_COLOR[inv.status] || "#A1A1AA"
              const unitLabel = inv.unit ? `${inv.unit.property?.name ? inv.unit.property.name + " – " : ""}${inv.unit.unit_number}` : "—"
              const amount = Number(inv.amount || 0)
              const amountStr = amount >= 100000 ? `₹${(amount/100000).toFixed(1)}L` : `₹${amount.toLocaleString("en-IN")}`
              const date = new Date(inv.invoice_date || inv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              return (
                <tr key={inv.id} className="anim-row" style={{ borderBottom: i < invoices.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 600, color: "#fff" }}>{inv.vendor_name || "—"}</td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{unitLabel}</td>
                  <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>{amountStr}</td>
                  <td style={{ padding: "14px 18px", fontSize: "12px", color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{date}</td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${sColor}15`, color: sColor, border: `1px solid ${sColor}30`, textTransform: "capitalize" }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button style={{ fontSize: "12px", fontWeight: 500, color: "#93c5fd", background: "none", border: "none", cursor: "pointer" }}>View →</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Invoice Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "460px", maxWidth: "95%", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><Receipt size={18} color="#ec4899" /> Add Invoice</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Vendor Name</label>
                <input type="text" placeholder="e.g. SparkFix Electrical" value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Amount (₹)</label>
                  <input type="number" placeholder="e.g. 12500" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Invoice Date</label>
                  <input type="date" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Related Unit (optional)</label>
                <select value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", cursor: "pointer" }}>
                  <option value="">Not unit-specific</option>
                  {unitsList.map(u => <option key={u.id} value={u.id}>{u.property?.name ? `${u.property.name} – ` : ""}{u.unit_number}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={submitInvoice} disabled={isSubmitting} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              {uploadStatus === 'uploading' ? 'Saving to secure storage' : uploadStatus === 'processing' ? 'Extracting details' : 'Document has been queued for review'}
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
