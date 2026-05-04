"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Wrench, Plus, Users, AlertCircle, Clock, CheckCircle2, X, Loader2, Upload, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

export default function Maintenance() {
  const ref = useRef<HTMLDivElement>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ issue: "", priority: "medium", unit_id: "" })
  const [unitsList, setUnitsList] = useState<any[]>([])
  const [uploadPhoto, setUploadPhoto] = useState<File | null>(null)

  // Vendor Modal States
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false)
  const [vendorForm, setVendorForm] = useState({ name: "", category: "", phone: "", email: "", pincodes: "" })

  const PRIORITY_COLOR: Record<string, string> = { high: "#f43f5e", medium: "#f59e0b", low: "#10b981", urgent: "#f43f5e" }
  const STATUS_COLOR:   Record<string, string> = { open: "#f59e0b", in_progress: "#3b82f6", closed: "#10b981", resolved: "#10b981" }

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    try {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("*, unit:units(unit_number, property:properties(name)), vendor:vendors(name)")
        .order("created_at", { ascending: false })
      if (error) throw error
      setTickets(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function openModal() {
    const { data } = await supabase.from("units").select("id, unit_number, property:properties(name)")
    if (data) setUnitsList(data)
    setShowModal(true)
  }

  async function submitTicket() {
    if (!form.issue) { alert("Please enter the issue description."); return }
    setIsSubmitting(true)
    try {
      const organization_id = await getOrCreateOrg()
      
      let photoPaths: string[] = []
      if (uploadPhoto) {
        const filePath = `${organization_id}/${Date.now()}_${uploadPhoto.name}`
        const { error: uploadErr } = await supabase.storage.from("maintenance_photos").upload(filePath, uploadPhoto)
        if (uploadErr) throw new Error("Photo upload failed: " + uploadErr.message)
        photoPaths.push(filePath)
      }

      const { data: newTicket, error } = await supabase.from("maintenance_tickets").insert({
        organization_id,
        unit_id: form.unit_id || null,
        title: form.issue.substring(0, 50),
        description: form.issue,
        priority: form.priority,
        status: "open",
        photos: photoPaths
      }).select('id').single()
      if (error) throw error

      // Attempt Auto-Assignment
      if (newTicket) {
        try {
          const res = await fetch('/api/maintenance/auto-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket_id: newTicket.id })
          });
          const resData = await res.json();
          if (resData.success) {
            alert(`Auto-assigned to: ${resData.vendor.name}`);
          }
        } catch (assignErr) {
          console.error("Auto-assign failed", assignErr);
        }
      }

      setShowModal(false)
      setForm({ issue: "", priority: "medium", unit_id: "" })
      setUploadPhoto(null)
      fetchTickets()
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally { setIsSubmitting(false) }
  }

  async function completeTicket(id: string) {
    try {
      const { error } = await supabase.from("maintenance_tickets").update({ status: "completed" }).eq("id", id)
      if (error) throw error
      fetchTickets()
    } catch (err: any) { alert("Error completing ticket: " + err.message) }
  }

  async function submitVendor() {
    if (!vendorForm.name) { alert("Please enter the vendor name."); return }
    setIsSubmittingVendor(true)
    try {
      const organization_id = await getOrCreateOrg()
      const { error } = await supabase.from("vendors").insert({
        organization_id,
        name: vendorForm.name,
        category: vendorForm.category ? [vendorForm.category] : [],
        phone: vendorForm.phone,
        email: vendorForm.email,
        service_pincodes: vendorForm.pincodes ? vendorForm.pincodes.split(',').map(s => s.trim()) : []
      })
      if (error) throw error
      setShowVendorModal(false)
      setVendorForm({ name: "", category: "", phone: "", email: "", pincodes: "" })
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally { setIsSubmittingVendor(false) }
  }

  const openCount      = tickets.filter(t => t.status === "open").length
  const inProgCount    = tickets.filter(t => t.status === "in_progress").length
  const resolvedCount  = tickets.filter(t => ["closed","resolved"].includes(t.status)).length

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-stat",   { opacity: 0, y: 20, scale: 0.93 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.07, ease: "back.out(1.3)" }, "-=0.2")
      .fromTo(".anim-row",    { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08 }, "-=0.1")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>OPERATIONS</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Wrench size={22} color="var(--text-2)" /> Maintenance
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Ticket tracking, vendor assignment, and issue resolution.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowVendorModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)", color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
            onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0, duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
          >
            <UserPlus size={14} /> Add Vendor
          </button>
          <button onClick={openModal} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 16px rgba(255,86,86,0.25)" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.03, y: -2, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
          ><Plus size={14} /> New Ticket</button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "14px" }}>
        {[
          { label: "Open Tickets",   value: openCount,     icon: AlertCircle,  color: "#f43f5e" },
          { label: "In Progress",    value: inProgCount,   icon: Clock,        color: "#f59e0b" },
          { label: "Resolved",       value: resolvedCount, icon: CheckCircle2, color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="anim-stat" style={{ padding: "18px 20px", borderRadius: "14px", background: "#0D0D0D", border: "1px solid #1E1E1E", display: "flex", alignItems: "center", gap: "14px" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { y: -3, boxShadow: `0 12px 32px ${color}25`, duration: 0.25 })}
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

      {/* Table */}
      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Unit","Issue","Priority","Status","Vendor","Date",""].map(h => (
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
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-3)", fontSize: "14px" }}>No maintenance tickets. Great job! 🎉</td></tr>
            ) : tickets.map((t, i) => {
              const pColor = PRIORITY_COLOR[t.priority] || "#A1A1AA"
              const sColor = STATUS_COLOR[t.status] || "#A1A1AA"
              const unitLabel = t.unit ? `${t.unit.property?.name ? t.unit.property.name + " – " : ""}${t.unit.unit_number}` : "—"
              const date = new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
              return (
                <tr key={t.id} className="anim-row" style={{ borderBottom: i < tickets.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 18px", fontSize: "13px", fontWeight: 600, color: "#fff" }}>{unitLabel}</td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)", maxWidth: "200px" }}>{t.issue_description}</td>
                  <td style={{ padding: "14px 18px" }}><span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${pColor}15`, color: pColor, border: `1px solid ${pColor}30`, textTransform: "capitalize" }}>{t.priority}</span></td>
                  <td style={{ padding: "14px 18px" }}><span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${sColor}15`, color: sColor, border: `1px solid ${sColor}30`, textTransform: "capitalize" }}>{t.status?.replace("_"," ")}</span></td>
                  <td style={{ padding: "14px 18px", fontSize: "13px", color: t.vendor?.name ? "#e2e8f0" : "var(--text-3)", fontWeight: t.vendor?.name ? 500 : 400 }}>{t.vendor?.name || 'Unassigned'}</td>
                  <td style={{ padding: "14px 18px", fontSize: "12px", color: "var(--text-3)", fontFamily: "'DM Mono',monospace" }}>{date}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                      {["open", "in_progress"].includes(t.status) && (
                        <button onClick={() => completeTicket(t.id)} style={{ padding: "6px 12px", borderRadius: "6px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                          <CheckCircle2 size={12} /> Complete
                        </button>
                      )}
                      <button style={{ fontSize: "12px", fontWeight: 500, color: "#93c5fd", background: "none", border: "none", cursor: "pointer" }}>View →</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "460px", maxWidth: "95%", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><Wrench size={18} color="#ec4899" /> New Ticket</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Unit (optional)</label>
                <select value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", cursor: "pointer" }}>
                  <option value="">Common area / unspecified</option>
                  {unitsList.map(u => <option key={u.id} value={u.id}>{u.property?.name ? `${u.property.name} – ` : ""}{u.unit_number}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Issue Description</label>
                <textarea value={form.issue} onChange={e => setForm({...form, issue: e.target.value})} placeholder="e.g. Leaking pipe in bathroom..." rows={3} style={{ width: "100%", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "12px 14px", fontSize: "14px", outline: "none", resize: "none", fontFamily: "'DM Sans',sans-serif" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", cursor: "pointer" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Upload Photo (Optional)</label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "80px", border: "1px dashed #333", borderRadius: "10px", background: "rgba(255,255,255,0.02)", cursor: "pointer", position: "relative" }}>
                  <input type="file" accept="image/*" onChange={e => setUploadPhoto(e.target.files?.[0] || null)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  {uploadPhoto ? (
                    <span style={{ fontSize: "13px", color: "#3b82f6", fontWeight: 500 }}>{uploadPhoto.name}</span>
                  ) : (
                    <span style={{ fontSize: "13px", color: "var(--text-3)", display: "flex", alignItems: "center", gap: "6px" }}><Upload size={14} /> Click to upload image</span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={submitTicket} disabled={isSubmitting} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showVendorModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "460px", maxWidth: "95%", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><UserPlus size={18} color="#ec4899" /> New Vendor</h2>
              <button onClick={() => setShowVendorModal(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Vendor Name</label>
                <input type="text" value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} placeholder="e.g. SparkFix Electrical" style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Category</label>
                  <input type="text" value={vendorForm.category} onChange={e => setVendorForm({...vendorForm, category: e.target.value})} placeholder="e.g. Plumbing" style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Phone</label>
                  <input type="text" value={vendorForm.phone} onChange={e => setVendorForm({...vendorForm, phone: e.target.value})} placeholder="+91..." style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Email</label>
                  <input type="email" value={vendorForm.email} onChange={e => setVendorForm({...vendorForm, email: e.target.value})} placeholder="contact@sparkfix.com" style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Service Pincodes</label>
                  <input type="text" value={vendorForm.pincodes} onChange={e => setVendorForm({...vendorForm, pincodes: e.target.value})} placeholder="110001, 110002" style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>
            </div>
            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505" }}>
              <button onClick={() => setShowVendorModal(false)} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={submitVendor} disabled={isSubmittingVendor} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSubmittingVendor ? "not-allowed" : "pointer", opacity: isSubmittingVendor ? 0.7 : 1 }}>
                {isSubmittingVendor ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
    </div>
  )
}
