"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import { 
  FileText, Upload, Plus, CheckCircle2, AlertTriangle, Eye, Loader2, KeySquare, Calendar, Building2, User
} from "lucide-react"
import toast from "react-hot-toast"

export default function LeasesPage() {
  const [activeTab, setActiveTab] = useState("active")
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [leases, setLeases] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Property & Tenant lists for dropdowns
  const [properties, setProperties] = useState<any[]>([])
  const [tenantsList, setTenantsList] = useState<any[]>([])

  // Create Lease Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLease, setSelectedLease] = useState<any>(null)
  const [newLease, setNewLease] = useState({
    tenant_id: "", property_id: "", unit_id: "",
    rent_amount: "", deposit_amount: "", payment_due_day: "1", lease_type: "residential",
    start_date: "", expiry_date: "", notice_period_days: "30", notes: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [availableProperties, setAvailableProperties] = useState<any[]>([])
  const [availableTenants, setAvailableTenants] = useState<any[]>([])

  // Derived: units for selected property
  const unitsForSelectedProperty = useMemo(() => {
    if (!newLease.property_id) return []
    const prop = availableProperties.find((p: any) => p.id === newLease.property_id)
    return prop?.units ?? []
  }, [newLease.property_id, availableProperties])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      const org = await getOrCreateOrg()
      setOrgId(org)
      
      await fetchLeases(org)
      await fetchDropdownData(org)
      
      const channelId = `leases-page-${Math.random()}`
      const channel = supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leases', filter: `organization_id=eq.${org}` }, () => fetchLeases(org))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeases = async (org: string) => {
    const { data } = await supabase.from('leases').select(`
      *, 
      units(unit_number, properties(name, city)),
      tenants(full_name, email, phone)
    `).eq('organization_id', org).order('expiry_date', { ascending: true })
    
    if (data) {
      const mapped = data.map((l: any) => ({
        ...l,
        tenant_name: l.tenant_name || l.tenants?.full_name || '',
        tenant_email: l.tenant_email || l.tenants?.email || '',
        tenant_phone: l.tenant_phone || l.tenants?.phone || ''
      }))
      setLeases(mapped)
    }
  }

  const fetchDropdownData = async (org: string) => {
    const [propsRes, tenantsRes] = await Promise.all([
      supabase.from('properties').select('id, name, units(id, unit_number, status)').eq('organization_id', org),
      supabase.from('tenants').select('id, full_name, phone').eq('organization_id', org)
    ])
    if (propsRes.data) setAvailableProperties(propsRes.data)
    if (tenantsRes.data) setAvailableTenants(tenantsRes.data)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const toastId = toast.loading("Uploading lease...")
    try {
      const filePath = `${orgId}/${Date.now()}_${file.name}`
      
      const { error: uploadError } = await supabase.storage.from('leases').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: inserted, error: dbError } = await supabase.from('documents').insert({
        organization_id: orgId,
        file_name: file.name,
        file_path: filePath,
        doc_type: 'lease',
        index_status: 'pending'
      }).select().single()
      if (dbError) throw dbError

      if (process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'document_uploaded', file_path: filePath, organization_id: orgId, file_name: file.name, type: 'lease' })
        }).catch(console.error)
      }

      toast.success("Lease uploaded! AI is processing data.", { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Upload failed", { id: toastId })
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ""
    }
  }

  const resetLeaseForm = () => {
    setNewLease({
      tenant_id: "", property_id: "", unit_id: "",
      rent_amount: "", deposit_amount: "", payment_due_day: "1",
      lease_type: "residential", notice_period_days: "30", notes: "",
      start_date: "", expiry_date: ""
    })
  }

  const handleCreateLease = async () => {
    if (!newLease.tenant_id || !newLease.unit_id || !newLease.rent_amount || !newLease.start_date || !newLease.expiry_date) {
      return toast.error("Please fill all required fields (Tenant, Unit, Rent, Dates)")
    }
    setIsSubmitting(true)
    try {
      if (!orgId) throw new Error("Organization ID missing. Please refresh.")

      const { data: insertedLease, error: leaseError } = await supabase.from('leases').insert({
        organization_id: orgId,
        tenant_id: newLease.tenant_id,
        unit_id: newLease.unit_id,
        rent_amount: Number(newLease.rent_amount),
        deposit_amount: newLease.deposit_amount ? Number(newLease.deposit_amount) : null,
        payment_due_day: Number(newLease.payment_due_day) || 1,
        lease_type: newLease.lease_type,
        notice_period_days: Number(newLease.notice_period_days) || 30,
        notes: newLease.notes || null,
        start_date: newLease.start_date,
        expiry_date: newLease.expiry_date,
        lease_status: 'active',
        renewal_status: 'pending'
      }).select().single()
      
      if (leaseError) throw leaseError

      // Update unit status to occupied
      await supabase.from('units').update({ status: 'occupied' }).eq('id', newLease.unit_id)

      // Auto-generate Security Deposit record if applicable
      if (newLease.deposit_amount && Number(newLease.deposit_amount) > 0) {
        await supabase.from('security_deposits').insert({
          organization_id: orgId,
          lease_id: insertedLease.id,
          tenant_id: newLease.tenant_id,
          unit_id: newLease.unit_id,
          property_id: newLease.property_id,
          deposit_amount: Number(newLease.deposit_amount),
          status: 'received',
          received_date: new Date().toISOString().split('T')[0]
        })
      }

      // Auto-generate rent payments for every month of the lease
      const paymentsToInsert = [];
      const start = new Date(newLease.start_date);
      const end = new Date(newLease.expiry_date);
      const dueDay = Number(newLease.payment_due_day) || 1;
      
      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      
      for (let i = 0; i <= monthsDiff; i++) {
        let dueDate = new Date(start.getFullYear(), start.getMonth() + i, dueDay);
        // Ensure first payment isn't before start date
        if (i === 0 && dueDate < start) dueDate = new Date(start);
        // Ensure last payment isn't after end date
        if (dueDate > end) break;
        
        // Use local format carefully to avoid timezone shift causing previous day string
        // We use string manipulation to ensure the exact local YYYY-MM-DD
        const yearStr = dueDate.getFullYear();
        const monthStr = String(dueDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dueDate.getDate()).padStart(2, '0');
        const formattedDate = `${yearStr}-${monthStr}-${dayStr}`;

        paymentsToInsert.push({
          organization_id: orgId,
          lease_id: insertedLease.id,
          tenant_id: newLease.tenant_id,
          unit_id: newLease.unit_id,
          amount_due: Number(newLease.rent_amount),
          due_date: formattedDate,
          status: 'pending'
        });
      }
      
      if (paymentsToInsert.length > 0) {
        await supabase.from('rent_payments').insert(paymentsToInsert);
      }

      toast.success("Lease created successfully")
      setShowCreateModal(false)
      setNewLease({ 
        tenant_id: "", property_id: "", unit_id: "",
        rent_amount: "", deposit_amount: "", payment_due_day: "1", lease_type: "residential",
        start_date: "", expiry_date: "", notice_period_days: "30", notes: "" 
      })
      await fetchLeases(orgId)
      await fetchDropdownData(orgId) // Refresh units status
    } catch (e: any) {
      console.error("Create lease error:", e)
      toast.error(e.message || "Failed to create lease")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendRenewal = async (lease: any) => {
    setProcessingId(lease.id)
    try {
      const { error } = await supabase
        .from('leases')
        .update({ renewal_status: 'offered' })
        .eq('id', lease.id)
        .eq('organization_id', orgId)
      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/emails/lease-renewal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ action: "send_renewal_offer", lease_id: lease.id, tenant_name: lease.tenant_name, tenant_email: lease.tenant_email, unit_id: lease.unit_id, expiry_date: lease.expiry_date, current_rent: lease.rent_amount, organization_id: orgId })
      }).catch(console.error)
      
      setLeases(prev => prev.map(l => l.id === lease.id ? { ...l, renewal_status: 'offered' } : l))
      toast.success("Renewal offer sent to tenant")
    } catch (e: any) {
      toast.error("Failed to send offer")
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkRenewed = async (leaseId: string) => {
    setProcessingId(leaseId)
    try {
      const { error } = await supabase
        .from('leases')
        .update({ renewal_status: 'renewed' })
        .eq('id', leaseId)
        .eq('organization_id', orgId)
      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/emails/lease-renewal', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ action: "mark_renewed", lease_id: leaseId, organization_id: orgId })
      }).catch(console.error)
      
      setLeases(prev => prev.map(l => l.id === leaseId ? { ...l, renewal_status: 'renewed' } : l))
      toast.success("Lease marked as renewed")
    } catch (e: any) {
      toast.error("Update failed")
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (val: number) => val ? `₹${val.toLocaleString('en-IN')}` : '-'
  
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).getTime()
  
  const activeLeases = leases.filter(l => l.lease_status === 'active')
  const renewalsDue = leases.filter(l => l.lease_status === 'active' && new Date(l.expiry_date).getTime() <= in90Days && (!l.renewal_status || l.renewal_status === 'pending'))
  const offersPending = leases.filter(l => l.lease_status === 'active' && l.renewal_status === 'offered')
  const pastLeases = leases.filter(l => l.lease_status !== 'active')

  const renderLeaseCard = (lease: any, viewContext: "active" | "renewal" | "offer" | "past") => {
    const daysLeft = lease.expiry_date ? Math.ceil((new Date(lease.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
    const isExpired = daysLeft !== null && daysLeft < 0
    const urgencyColor = isExpired ? "text-[#A1A1AA] border-[#1E1E1E] bg-[#1E1E1E]" : daysLeft !== null && daysLeft < 30 ? "text-red-400 border-red-500/20 bg-red-500/10" : daysLeft !== null && daysLeft < 60 ? "text-amber-400 border-amber-500/20 bg-amber-500/10" : "text-green-400 border-green-500/20 bg-green-500/10"

    return (
      <div key={lease.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1 space-y-2 cursor-pointer group" onClick={() => setSelectedLease(lease)}>
            <div className="flex items-center gap-3 group-hover:underline decoration-white/30 underline-offset-4">
              <span className="font-semibold text-white text-lg">{lease.tenant_name || 'Draft / Processing...'}</span>
              {daysLeft !== null && (
                <span className={`px-2 py-0.5 rounded text-xs border ${urgencyColor}`}>
                  {isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days remaining`}
                </span>
              )}
            </div>
            
            <div className="text-sm text-[#A1A1AA] flex items-center gap-4 flex-wrap">
              <span>{lease.units?.properties?.name || 'Unassigned Property'} — Unit {lease.units?.unit_number}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Calendar size={12}/> Expires: {lease.expiry_date ? new Date(lease.expiry_date).toLocaleDateString() : '---'}</span>
            </div>

            <div className="text-sm text-[#A1A1AA] mt-1">Current Rent: {formatCurrency(lease.rent_amount)}/mo</div>
          </div>

          <div className="flex flex-col items-end justify-between gap-3 min-w-[150px]">
            <div className="flex items-center gap-2">
              {lease.file_path && (
                <button className="p-2 text-[#A1A1AA] hover:text-white bg-[#1E1E1E] hover:bg-white/20 rounded-md transition-colors"
                  onClick={() => window.open(supabase.storage.from('leases').getPublicUrl(lease.file_path).data.publicUrl, '_blank')}
                  title="View Document"
                ><Eye size={16}/></button>
              )}
              
              {viewContext === "renewal" && (
                <button onClick={() => handleSendRenewal(lease)} disabled={processingId === lease.id} className="px-4 py-1.5 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                  {processingId === lease.id && <Loader2 size={14} className="animate-spin"/>} Send Renewal Offer
                </button>
              )}
              
              {viewContext === "offer" && (
                <button onClick={() => handleMarkRenewed(lease.id)} disabled={processingId === lease.id} className="px-4 py-1.5 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                  {processingId === lease.id && <Loader2 size={14} className="animate-spin"/>} Mark Renewed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Leases</h1>
          <p className="text-[#A1A1AA]">Manage active leases and automate renewals</p>
        </div>
        
        <div className="flex gap-3">
          <label className="px-4 py-2 bg-[#1E1E1E] text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:bg-white/20 cursor-pointer transition-colors">
            {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
            {isUploading ? "Uploading..." : "Upload Lease PDF"}
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
            <Plus size={16}/> Add Lease
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Leases", val: activeLeases.length },
          { label: "Renewals Due (<90d)", val: renewalsDue.length, alert: renewalsDue.length > 0 },
          { label: "Offers Sent", val: offersPending.length },
          { label: "Archived", val: pastLeases.length }
        ].map((kpi, i) => (
          <div key={i} className={`bg-[#0D0D0D] border rounded-lg p-4 ${kpi.alert ? 'border-amber-500/50' : 'border-[#1E1E1E]'}`}>
            <div className="text-2xl font-bold text-white mb-1">{kpi.val}</div>
            <div className={`text-xs ${kpi.alert ? 'text-amber-400' : 'text-[#A1A1AA]'}`}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="flex space-x-1 bg-[#0D0D0D] p-1 rounded-lg border border-[#1E1E1E] w-fit mb-6 overflow-x-auto">
        {[
          { id: "active", label: "All Active", count: activeLeases.length },
          { id: "renewals", label: "Renewals Due", count: renewalsDue.length },
          { id: "offers", label: "Offers Pending", count: offersPending.length },
          { id: "past", label: "Past / Archived", count: pastLeases.length }
        ].map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-[#1E1E1E] text-white' : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E1E]/50'}`}
          >
            {t.label}
            {t.count > 0 && <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-white/10' : 'bg-[#1E1E1E]'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "active" && (
            activeLeases.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><KeySquare className="mx-auto mb-2 opacity-50" size={32}/>No active leases found.</div>
            : activeLeases.map(l => renderLeaseCard(l, "active"))
          )}
          
          {activeTab === "renewals" && (
            renewalsDue.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>No renewals due within 90 days.</div>
            : renewalsDue.map(l => renderLeaseCard(l, "renewal"))
          )}

          {activeTab === "offers" && (
            offersPending.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>No pending renewal offers.</div>
            : offersPending.map(l => renderLeaseCard(l, "offer"))
          )}

          {activeTab === "past" && (
            pastLeases.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><FileText className="mx-auto mb-2 opacity-50" size={32}/>No archived leases.</div>
            : pastLeases.map(l => renderLeaseCard(l, "past"))
          )}
        </div>
      )}
      
      {/* Create Lease Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add New Lease</h2>
              <button onClick={() => { setShowCreateModal(false); resetLeaseForm() }} className="text-[#A1A1AA] hover:text-white"><Plus className="rotate-45" size={20}/></button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Property *</label>
                  <select value={newLease.property_id} onChange={e=>setNewLease({...newLease, property_id: e.target.value, unit_id: ""})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                    <option value="">Select Property...</option>
                    {availableProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Unit *</label>
                  <select value={newLease.unit_id} onChange={e=>setNewLease({...newLease, unit_id: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" disabled={!newLease.property_id}>
                    <option value="">Select Unit...</option>
                    {newLease.property_id && availableProperties.find(p => p.id === newLease.property_id)?.units?.map((u: any) => (
                      <option key={u.id} value={u.id}>Unit {u.unit_number} ({u.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Tenant *</label>
                <select value={newLease.tenant_id} onChange={e=>setNewLease({...newLease, tenant_id: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                  <option value="">Select Tenant...</option>
                  {availableTenants.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.phone})</option>)}
                </select>
                <p className="text-[10px] text-[#A1A1AA] mt-1">If the tenant isn't listed, please add them in the Tenants section first.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Monthly Rent *</label>
                  <input type="number" value={newLease.rent_amount} onChange={e=>setNewLease({...newLease, rent_amount: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. 15000" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Security Deposit</label>
                  <input type="number" value={newLease.deposit_amount} onChange={e=>setNewLease({...newLease, deposit_amount: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. 50000" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Payment Due Day</label>
                  <input type="number" min="1" max="28" value={newLease.payment_due_day} onChange={e=>setNewLease({...newLease, payment_due_day: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="1-28" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Notice Period (Days)</label>
                  <input type="number" value={newLease.notice_period_days} onChange={e=>setNewLease({...newLease, notice_period_days: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. 30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Start Date *</label>
                  <input type="date" value={newLease.start_date} onChange={e=>setNewLease({...newLease, start_date: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Expiry Date *</label>
                  <input type="date" value={newLease.expiry_date} onChange={e=>setNewLease({...newLease, expiry_date: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Lease Type</label>
                  <select value={newLease.lease_type} onChange={e=>setNewLease({...newLease, lease_type: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Notes</label>
                  <textarea value={newLease.notes} onChange={e=>setNewLease({...newLease, notes: e.target.value})} rows={1} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 resize-none" placeholder="Optional notes about this lease..." />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowCreateModal(false); resetLeaseForm() }} className="flex-1 px-4 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleCreateLease} disabled={isSubmitting} className="flex-1 px-4 py-2 text-white font-medium text-sm rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : "Create Lease"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Lease Details Modal */}
      {selectedLease && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]" onClick={(e) => { if (e.target === e.currentTarget) setSelectedLease(null) }}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-[#1E1E1E]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-pink-500" size={20} />
                Lease Details
              </h2>
              <button onClick={() => setSelectedLease(null)} className="text-[#A1A1AA] hover:text-white transition-colors">
                <Plus className="rotate-45" size={24}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Tenant Info */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#1E1E1E]">
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-3 font-semibold flex items-center gap-2"><User size={14}/> Tenant</h3>
                  <p className="text-white font-medium text-lg mb-1">{selectedLease.tenant_name}</p>
                  <p className="text-sm text-[#A1A1AA] mb-1">{selectedLease.tenant_email}</p>
                  <p className="text-sm text-[#A1A1AA]">{selectedLease.tenant_phone}</p>
                </div>

                {/* Property Info */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#1E1E1E]">
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-3 font-semibold flex items-center gap-2"><Building2 size={14}/> Property & Unit</h3>
                  <p className="text-white font-medium text-lg mb-1">{selectedLease.units?.properties?.name || 'Unassigned'}</p>
                  <p className="text-sm text-[#A1A1AA] mb-1">{selectedLease.units?.properties?.city || 'No City'}, {selectedLease.units?.properties?.state || ''}</p>
                  <p className="text-sm text-white bg-white/5 w-fit px-2 py-0.5 rounded border border-white/10 mt-2">Unit: {selectedLease.units?.unit_number || 'N/A'}</p>
                </div>

                {/* Financials */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#1E1E1E]">
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-3 font-semibold flex items-center gap-2"><span className="text-green-500 font-bold">₹</span> Financials</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><span className="text-[#A1A1AA] text-sm">Rent Amount</span><span className="text-white font-medium">{formatCurrency(selectedLease.rent_amount)}/mo</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#A1A1AA] text-sm">Security Deposit</span><span className="text-white font-medium">{formatCurrency(selectedLease.deposit_amount)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#A1A1AA] text-sm">Due Day</span><span className="text-white font-medium">{selectedLease.payment_due_day ? `${selectedLease.payment_due_day} of month` : 'N/A'}</span></div>
                  </div>
                </div>

                {/* Terms */}
                <div className="bg-[#141414] rounded-lg p-4 border border-[#1E1E1E]">
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-3 font-semibold flex items-center gap-2"><Calendar size={14}/> Terms</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><span className="text-[#A1A1AA] text-sm">Start Date</span><span className="text-white font-medium">{selectedLease.start_date ? new Date(selectedLease.start_date).toLocaleDateString() : 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#A1A1AA] text-sm">Expiry Date</span><span className="text-white font-medium">{selectedLease.expiry_date ? new Date(selectedLease.expiry_date).toLocaleDateString() : 'N/A'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#A1A1AA] text-sm">Status</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${selectedLease.lease_status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {selectedLease.lease_status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                
              </div>

              {selectedLease.notes && (
                <div className="bg-[#141414] rounded-lg p-4 border border-[#1E1E1E]">
                  <h3 className="text-xs uppercase tracking-wider text-[#A1A1AA] mb-2 font-semibold">Notes</h3>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{selectedLease.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#1E1E1E] flex justify-end">
              <button onClick={() => setSelectedLease(null)} className="px-5 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors font-medium text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
