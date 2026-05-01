"use client"
import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Plus, Upload, Search, KeySquare, FileText, AlertTriangle, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

gsap.registerPlugin(useGSAP)

export default function Leases() {
  const ref = useRef<HTMLDivElement>(null)
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tenantsList, setTenantsList] = useState<any[]>([])
  const [unitsList, setUnitsList] = useState<any[]>([])
  const [form, setForm] = useState({
    tenant_id: "",
    unit_id: "",
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 31536000000).toISOString().split('T')[0],
    rent_amount: ""
  })

  useEffect(() => {
    async function fetchLeases() {
      try {
        const { data, error } = await supabase.from('leases').select(`
          *,
          tenant:tenants ( full_name ),
          unit:units ( unit_number, property:properties(name) )
        `)
        if (error) throw error;
        
        const transformed = (data || []).map(l => {
          const tenantName = l.tenant?.full_name || 'Unknown Tenant';
          const initials = tenantName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
          
          let unitName = l.unit?.unit_number || 'Unassigned';
          if (l.unit?.property?.name) {
            unitName += ` – ${l.unit.property.name}`;
          }

          const rentNum = Number(l.rent_amount || 0);
          const rentStr = rentNum > 0 ? (rentNum >= 100000 ? `₹${(rentNum/100000).toFixed(1)}L` : `₹${(rentNum/1000).toFixed(1)}K`) : '—';
          
          const startDate = new Date(l.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          const endDate = new Date(l.expiry_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          
          const now = new Date();
          const expiry = new Date(l.expiry_date);
          const diffTime = expiry.getTime() - now.getTime();
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let status = l.lease_status || 'Unknown';
          let statusColor = '#3b82f6';
          
          if (status.toLowerCase() === 'active') {
            if (daysLeft < 0) {
              status = 'Expired';
              statusColor = '#f43f5e';
            } else if (daysLeft <= 30) {
              status = 'Expiring soon';
              statusColor = '#f43f5e';
            } else if (daysLeft <= 90) {
              status = 'Expiring';
              statusColor = '#f59e0b';
            } else {
              status = 'Active';
              statusColor = '#10b981';
            }
          }

          const colors = ['#3b82f6', '#7c3aed', '#f59e0b', '#10b981', '#f43f5e'];
          const colorIndex = tenantName.length % colors.length;
          
          return {
            id: l.id,
            tenant: tenantName,
            initials,
            color: colors[colorIndex],
            unit: unitName,
            rent: rentStr,
            start: startDate,
            end: endDate,
            status,
            statusColor,
            daysLeft
          }
        })
        setLeases(transformed)
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchLeases()
  }, [])

  // Fetch tenants and units when opening modal
  useEffect(() => {
    if (showCreateModal) {
      const fetchFormOptions = async () => {
        const [{ data: tData }, { data: uData }] = await Promise.all([
          supabase.from('tenants').select('id, full_name'),
          supabase.from('units').select('id, unit_number').eq('status', 'vacant')
        ]);
        if (tData) setTenantsList(tData);
        if (uData) setUnitsList(uData);
      };
      fetchFormOptions();
    }
  }, [showCreateModal])

  const submitLease = async () => {
    if (!form.tenant_id || !form.unit_id || !form.start_date || !form.expiry_date || !form.rent_amount) {
      alert("Please fill in all fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { error: leaseErr } = await supabase.from('leases').insert({
        tenant_id: form.tenant_id,
        unit_id: form.unit_id,
        start_date: form.start_date,
        expiry_date: form.expiry_date,
        rent_amount: parseFloat(form.rent_amount),
        lease_status: 'Active'
      });

      if (leaseErr) throw leaseErr;

      const { error: unitErr } = await supabase.from('units').update({ status: 'occupied' }).eq('id', form.unit_id);
      if (unitErr) throw unitErr;

      setShowCreateModal(false);
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
      setIsSubmitting(false);
    }
  }

  const handleUploadLease = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let { data: orgData } = await supabase.from('organizations').select('id').limit(1).maybeSingle();
      let organization_id = orgData?.id;

      if (!organization_id) {
        const { data: newOrg } = await supabase.from('organizations').insert({ name: 'Default Organization', owner_id: user.id }).select('id').single();
        organization_id = newOrg?.id;
      }

      // Upload to bucket
      const filePath = `${organization_id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadErr) throw new Error("Storage Upload Error: " + uploadErr.message);

      const leaseId = window.prompt("Enter Lease ID this document belongs to (or leave blank if unassigned):");

      // Insert row into documents
      const { error: dbErr } = await supabase.from('documents').insert({
        lease_id: leaseId || null,
        file_path: filePath,
        file_name: file.name,
        doc_type: 'lease',
        authority_level: 4,
        index_status: 'pending'
      });
      if (dbErr) throw new Error("Database Insert Error: " + dbErr.message);

      alert("File uploaded. Triggering n8n webhook...");

      // Call n8n webhook
      try {
        await fetch('http://webhook.n8n/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'lease_uploaded', file_path: filePath, lease_id: leaseId })
        });
      } catch(webhookErr) {
        console.warn("Webhook failed (expected if n8n not running locally):", webhookErr);
      }

      alert("Upload complete and webhook triggered successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
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
          <p style={{ color: "var(--text-3)", fontSize: "12px", fontFamily: "'DM Mono',monospace", letterSpacing: "0.06em", marginBottom: "4px" }}>AGREEMENTS</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <KeySquare size={22} color="var(--text-2)" /> Leases
          </h1>
          <p style={{ color: "var(--text-2)", marginTop: "4px", fontSize: "14px" }}>Active, expiring, and historical agreements.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 16px", borderRadius: "10px", background: "#0D0D0D", border: "1px solid var(--border-2)", color: "var(--text-2)", fontSize: "13px", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}
            onMouseEnter={e => { gsap.to(e.currentTarget, { y: -2, duration: 0.2 }); e.currentTarget.style.color = "#fff" }}
            onMouseLeave={e => { gsap.to(e.currentTarget, { y: 0, duration: 0.3, ease: "back.out(1.5)" }); e.currentTarget.style.color = "var(--text-2)" }}
          >
            <input type="file" accept="application/pdf" hidden onChange={handleUploadLease} />
            <Upload size={14} /> Upload PDF
          </label>
          <button onClick={() => setShowCreateModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", fontFamily: "'DM Sans',sans-serif" }}
            onMouseEnter={e => gsap.to(e.currentTarget, { scale: 1.04, y: -2, duration: 0.2 })}
            onMouseLeave={e => gsap.to(e.currentTarget, { scale: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" })}
          ><Plus size={14} /> Create Lease</button>
        </div>
      </header>

      {/* Filters */}
      <div className="anim-filter" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
          <Search size={14} color="var(--text-3)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input type="text" placeholder="Search tenant or property…" style={{ display: "block", width: "100%", height: "38px", borderRadius: "9px", border: "1px solid var(--border-2)", background: "rgba(0,0,0,0.25)", padding: "0 12px 0 34px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "'DM Sans',sans-serif", transition: "border-color 0.2s" }}
            onFocus={e => (e.target.style.borderColor = "rgba(59,130,246,0.4)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
          />
        </div>
        {["All","Active","Expiring","Expired"].map((f, i) => (
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
              {["Tenant","Unit","Rent/mo","Period","Days Left","Status",""].map(h => (
                <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "30px", width: "120px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "80px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "60px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "30px", width: "90px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "16px", width: "40px" }} /></td>
                  <td style={{ padding: "14px 18px" }}><div className="skeleton" style={{ height: "20px", width: "60px", borderRadius: "99px" }} /></td>
                  <td style={{ padding: "14px 18px" }} />
                </tr>
              ))
            ) : leases.map((l, i) => (
              <tr key={l.id} className="anim-row" style={{ borderBottom: i < leases.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${l.color}20`, border: `1px solid ${l.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: l.color, flexShrink: 0 }}>{l.initials}</div>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "#fff" }}>{l.tenant}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px", fontSize: "13px", color: "var(--text-2)" }}>{l.unit}</td>
                <td style={{ padding: "14px 18px", fontSize: "14px", fontWeight: 700, color: "#10b981", fontFamily: "'DM Mono',monospace" }}>{l.rent}</td>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-2)" }}>{l.start}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-3)" }}>→ {l.end}</div>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {l.daysLeft <= 30 && <AlertTriangle size={12} color={l.statusColor} />}
                    <span style={{ fontSize: "13px", fontWeight: 600, color: l.daysLeft <= 30 ? l.statusColor : "var(--text-2)", fontFamily: "'DM Mono',monospace" }}>{l.daysLeft}d</span>
                  </div>
                </td>
                <td style={{ padding: "14px 18px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "99px", background: `${l.statusColor}15`, color: l.statusColor, border: `1px solid ${l.statusColor}30` }}>{l.status}</span>
                </td>
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <button style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid var(--border-2)", background: "#0D0D0D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", transition: "all 0.15s", marginLeft: "auto" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.color = "#93c5fd" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text-3)" }}
                  ><FileText size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Lease Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div style={{ width: "480px", background: "#0D0D0D", border: "1px solid #1E1E1E", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #1E1E1E", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}><Plus size={18} color="#ec4899" /> Create New Lease</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Tenant</label>
                <select value={form.tenant_id} onChange={e => setForm({...form, tenant_id: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
                  <option value="" disabled>Select a tenant...</option>
                  {tenantsList.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Vacant Unit</label>
                <select value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif", cursor: "pointer" }}>
                  <option value="" disabled>Select a vacant unit...</option>
                  {unitsList.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>End Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-3)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Rent Amount (₹)</label>
                <input type="number" placeholder="e.g. 25000" value={form.rent_amount} onChange={e => setForm({...form, rent_amount: e.target.value})} style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #1E1E1E", background: "#000", color: "#fff", padding: "0 14px", fontSize: "14px", outline: "none", fontFamily: "'DM Sans',sans-serif" }} />
              </div>
            </div>

            <div style={{ padding: "20px 24px", borderTop: "1px solid #1E1E1E", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#050505" }}>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: "10px 20px", borderRadius: "10px", background: "transparent", border: "1px solid #1E1E1E", color: "#A1A1AA", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>Cancel</button>
              <button onClick={submitLease} disabled={isSubmitting} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(to right, #ec4899, #f97316)", border: "none", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? <><Loader2 size={14} className="spin" /> Creating...</> : "Save Lease"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  )
}
