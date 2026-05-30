"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import { 
  FileText, Upload, Plus, CheckCircle2, AlertTriangle, Eye, Loader2, KeySquare, Calendar
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

  // Create Lease Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLease, setNewLease] = useState({
    tenant_name: "", tenant_email: "", tenant_phone: "", rent_amount: "", start_date: "", expiry_date: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      *, units(unit_number, properties(name, city))
    `).eq('organization_id', org).order('expiry_date', { ascending: true })
    if (data) setLeases(data)
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

      const { data: inserted, error: dbError } = await supabase.from('leases').insert({
        organization_id: orgId,
        file_name: file.name,
        file_path: filePath,
        lease_status: 'draft',
        rent_amount: 0
      }).select().single()
      if (dbError) throw dbError

      if (process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'document_uploaded', file_path: filePath, organization_id: orgId, file_name: file.name, type: 'lease', lease_id: inserted.id })
        }).catch(console.error)
      }

      toast.success("Lease uploaded! AI is processing data.", { id: toastId })
    } catch (err) {
      toast.error("Upload failed", { id: toastId })
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ""
    }
  }

  const handleCreateLease = async () => {
    if (!newLease.tenant_name || !newLease.rent_amount || !newLease.start_date || !newLease.expiry_date) {
      return toast.error("Please fill all required fields")
    }
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('leases').insert({
        organization_id: orgId,
        tenant_name: newLease.tenant_name,
        tenant_email: newLease.tenant_email,
        tenant_phone: newLease.tenant_phone,
        rent_amount: Number(newLease.rent_amount),
        start_date: newLease.start_date,
        expiry_date: newLease.expiry_date,
        lease_status: 'active',
        renewal_status: 'pending'
      })
      if (error) throw error
      toast.success("Lease created successfully")
      setShowCreateModal(false)
      setNewLease({ tenant_name: "", tenant_email: "", tenant_phone: "", rent_amount: "", start_date: "", expiry_date: "" })
      fetchLeases(orgId)
    } catch (e: any) {
      toast.error("Failed to create lease")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendRenewal = async (lease: any) => {
    setProcessingId(lease.id)
    try {
      if (!process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK) throw new Error("Webhook not configured")
      const res = await fetch(process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "send_renewal_offer", lease_id: lease.id, tenant_name: lease.tenant_name, tenant_email: lease.tenant_email, unit_id: lease.unit_id, expiry_date: lease.expiry_date, current_rent: lease.rent_amount, organization_id: orgId })
      })
      if (!res.ok) throw new Error("Webhook failed")
      
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
      if (!process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK) throw new Error("Webhook not configured")
      const res = await fetch(process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "mark_renewed", lease_id: leaseId, organization_id: orgId })
      })
      if (!res.ok) throw new Error("Webhook failed")
      
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
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
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
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add New Lease</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#A1A1AA] hover:text-white"><Plus className="rotate-45" size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Tenant Name *</label>
                <input value={newLease.tenant_name} onChange={e=>setNewLease({...newLease, tenant_name: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Email</label>
                  <input type="email" value={newLease.tenant_email} onChange={e=>setNewLease({...newLease, tenant_email: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="jane@example.com" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Phone</label>
                  <input type="tel" value={newLease.tenant_phone} onChange={e=>setNewLease({...newLease, tenant_phone: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="+1 234 567 890" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Monthly Rent *</label>
                <input type="number" value={newLease.rent_amount} onChange={e=>setNewLease({...newLease, rent_amount: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. 15000" />
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
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleCreateLease} disabled={isSubmitting} className="flex-1 px-4 py-2 text-white font-medium text-sm rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : "Create Lease"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
