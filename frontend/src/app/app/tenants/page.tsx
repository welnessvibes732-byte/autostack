"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Plus, Search, Mail, Phone, ExternalLink, Users, X, Loader2, ChevronDown, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"

gsap.registerPlugin(useGSAP)

/* ─── Toast Component ─── */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 200, padding: "12px 20px", borderRadius: "10px", background: "#1E1E1E", border: "1px solid #2A2A2A", color: "#fff", fontSize: "13px", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "toastIn 0.3s ease" }}>
      {message}
    </div>
  )
}

/* ─── Collapsible Section Component ─── */
function FormSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: "1px solid #1A1A1A" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.01em" }}
      >
        {title}
        <ChevronDown size={14} color="var(--text-3)" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <div style={{ paddingBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {children}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }
const inputStyle: React.CSSProperties = { width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }

export default function Tenants() {
  const ref = useRef<HTMLDivElement>(null)
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")

  // Toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    id_type: "" as "" | "aadhaar" | "pan" | "passport" | "driving_license",
    id_number: "",
    date_of_birth: "",
    employer_name: "",
    monthly_income: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: ""
  })

  const resetForm = () => setForm({
    full_name: "", email: "", phone: "", whatsapp_number: "",
    id_type: "", id_number: "", date_of_birth: "",
    employer_name: "", monthly_income: "",
    emergency_contact_name: "", emergency_contact_phone: "", notes: ""
  })

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const { data, error } = await supabase.from('tenants').select(`
        *,
        leases ( lease_status, unit:units ( unit_number, property:properties(name) ) )
      `)
      if (error) throw error;
      
      const transformed = (data || []).map(t => {
        const name = t.full_name || 'Unknown Tenant';
        const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
        
        const colors = ['#3b82f6', '#7c3aed', '#f59e0b', '#10b981', '#f43f5e'];
        const colorIndex = name.length % colors.length;
        
        const userLeases = t.leases || [];
        const numLeases = userLeases.length;
        
        let unitDisplay = 'None';
        let status = 'Inactive';
        let statusColor = '#f43f5e';
        
        if (numLeases > 0) {
          const activeLease = userLeases.find((l: any) => l.lease_status === 'active') || userLeases[0];
          if (activeLease) {
            if (activeLease.lease_status === 'active') {
              status = 'Active';
              statusColor = '#10b981';
            } else {
              status = 'Past';
              statusColor = '#f59e0b';
            }
            
            if (activeLease.unit) {
              unitDisplay = activeLease.unit.unit_number || 'Unassigned';
              if (activeLease.unit.property?.name) {
                unitDisplay += `, ${activeLease.unit.property.name}`;
              }
            }
          }
        }
        
        return {
          id: t.id,
          name,
          initials,
          color: colors[colorIndex],
          email: t.email || '—',
          phone: t.phone || '—',
          unit: unitDisplay,
          leases: numLeases,
          status,
          statusColor
        }
      })
      setTenants(transformed)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // ─── Filtered tenants based on search ───
  const filteredTenants = tenants.filter(t => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q)
    )
  })

  const submitTenant = async () => {
    window.dispatchEvent(new CustomEvent('showPaywall', { detail: { source: 'Tenant Management' } })); return;
    if (!form.full_name || !form.phone) {
      alert("Please enter at least the Full Name and Phone Number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const organization_id = await getOrCreateOrg();

      const insertPayload: Record<string, any> = {
        organization_id,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone,
      }

      // Only include optional fields if they have values
      if (form.whatsapp_number) insertPayload.whatsapp_number = form.whatsapp_number
      if (form.id_type) insertPayload.id_type = form.id_type
      if (form.id_number) insertPayload.id_number = form.id_number
      if (form.date_of_birth) insertPayload.date_of_birth = form.date_of_birth
      if (form.employer_name) insertPayload.employer_name = form.employer_name
      if (form.monthly_income) insertPayload.monthly_income = parseFloat(form.monthly_income)
      if (form.emergency_contact_name) insertPayload.emergency_contact_name = form.emergency_contact_name
      if (form.emergency_contact_phone) insertPayload.emergency_contact_phone = form.emergency_contact_phone
      if (form.notes) insertPayload.notes = form.notes

      const { error: insertErr } = await supabase.from('tenants').insert(insertPayload);

      if (insertErr) throw insertErr;

      setShowCreateModal(false);
      resetForm();
      setLoading(true);
      await fetchTenants();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Delete Tenant ───
  const deleteTenant = async (tenantId: string, tenantName: string) => {
    window.dispatchEvent(new CustomEvent('showPaywall', { detail: { source: 'Tenant Management' } })); return;
    if (!confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
      if (error) throw error;
      setTenants(prev => prev.filter(t => t.id !== tenantId));
      setToastMsg(`"${tenantName}" deleted successfully.`);
    } catch (err: any) {
      alert("Failed to delete tenant: " + err.message);
    }
  }

  useGSAP(() => {
    if (loading) return
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".page-header", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.45 })
      .fromTo(".anim-filter", { opacity: 0, y: 10  }, { opacity: 1, y: 0, duration: 0.3 }, "-=0.15")
      .fromTo(".anim-row",    { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.08 }, "-=0.1")
  }, { scope: ref, dependencies: [loading] })

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <header className="page-header flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4" style={{ paddingBottom: "20px", borderBottom: "1px solid var(--border)"  }}>
        <div>
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>REGISTRY</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={22} color="var(--text-2)" /> Tenants
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Client registry and communication hub.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif" }}
          onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
          onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
        ><Plus size={14} /> Add Tenant</button>
      </header>

      <div className="anim-filter" style={{ position: "relative", maxWidth: "320px" }}>
        <Search size={14} color="var(--text-3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input type="text" placeholder="Search name, email, phone…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ display: "block", width: "100%", height: "38px", borderRadius: "9px", border: "1px solid var(--border-2)", background: "rgba(0,0,0,0.25)", padding: "0 12px 0 34px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
          onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
        />
      </div>

      <div style={{ borderRadius: "16px", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border)" }}>
              {["Tenant","Contact","Unit","Leases","Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "36px", width: "140px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "28px", width: "120px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "100px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "30px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "60px", borderRadius: "99px" }} /></td>
                  <td style={{ padding: "14px 18px" }} />
                </tr>
              ))
            ) : filteredTenants.map((t, i) => (
              <tr key={t.id} className="anim-row" style={{ borderBottom: i < filteredTenants.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${t.color}20`, border: `1px solid ${t.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: t.color, flexShrink: 0 }}>{t.initials}</div>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#fff" }}>{t.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-2)" }}><Mail size={11} color="var(--text-3)" />{t.email}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-2)" }}><Phone size={11} color="var(--text-3)" />{t.phone}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{t.unit}</td>
                <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "'DM Mono',monospace" }}>{t.leases}</td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${t.statusColor}15`, color: t.statusColor, border: `1px solid ${t.statusColor}30` }}>{t.status}</span>
                </td>
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setToastMsg("Tenant details view coming soon")}
                      style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.color = "#93c5fd" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                    ><ExternalLink size={13} /></button>
                    <button
                      onClick={() => deleteTenant(t.id, t.name)}
                      style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(244,63,94,0.1)"; e.currentTarget.style.color = "#f43f5e" }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                    ><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Tenant Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "100%", maxWidth: "540px", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            {/* Modal Header */}
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><Plus size={18} color="#ec4899" /> Add Tenant</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm() }} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            {/* Scrollable Body */}
            <div style={{ padding: "8px 24px 24px", overflowY: "auto", flex: 1 }}>
              {/* Section 1: Basic Info */}
              <FormSection title="Basic Info" defaultOpen={true}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input type="text" placeholder="e.g. John Doe" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input type="email" placeholder="e.g. john@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Phone *</label>
                    <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>WhatsApp</label>
                    <input type="tel" placeholder="+91 98765 43210" value={form.whatsapp_number} onChange={e => setForm({...form, whatsapp_number: e.target.value})} style={inputStyle} />
                  </div>
                </div>
              </FormSection>

              {/* Section 2: KYC / Identity */}
              <FormSection title="KYC / Identity" defaultOpen={false}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>ID Type</label>
                    <select value={form.id_type} onChange={e => setForm({...form, id_type: e.target.value as any})} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                      <option value="">Select…</option>
                      <option value="aadhaar">Aadhaar</option>
                      <option value="pan">PAN</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>ID Number</label>
                    <input type="text" placeholder="e.g. ABCDE1234F" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>
              </FormSection>

              {/* Section 3: Employment */}
              <FormSection title="Employment" defaultOpen={false}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Employer Name</label>
                    <input type="text" placeholder="e.g. Acme Corp" value={form.employer_name} onChange={e => setForm({...form, employer_name: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Monthly Income</label>
                    <input type="number" placeholder="e.g. 50000" value={form.monthly_income} onChange={e => setForm({...form, monthly_income: e.target.value})} style={inputStyle} />
                  </div>
                </div>
              </FormSection>

              {/* Section 4: Emergency Contact */}
              <FormSection title="Emergency Contact" defaultOpen={false}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Contact Name</label>
                    <input type="text" placeholder="e.g. Jane Doe" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Phone</label>
                    <input type="tel" placeholder="+91 98765 43210" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} style={inputStyle} />
                  </div>
                </div>
              </FormSection>

              {/* Section 5: Notes */}
              <FormSection title="Notes" defaultOpen={false}>
                <div>
                  <textarea placeholder="Any additional notes about this tenant…" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={4} style={{ ...inputStyle, height: "auto", padding: "12px 14px", resize: "vertical" }} />
                </div>
              </FormSection>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505", flexShrink: 0 }}>
              <button onClick={() => { setShowCreateModal(false); resetForm() }} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={submitTenant} disabled={isSubmitting} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? <><Loader2 size={14} className="spin" /> Saving...</> : "Save Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  )
}
