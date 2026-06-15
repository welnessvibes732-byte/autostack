"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import { 
  Wrench, Plus, CheckCircle2, AlertTriangle, Clock, Loader2, Link as LinkIcon, Filter, Camera
} from "lucide-react"
import toast from "react-hot-toast"

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState("action_required")
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [tickets, setTickets] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // Create Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newReq, setNewReq] = useState({ title: "", description: "", priority: "routine", category: "general", lease_id: "" })
  const [activeLeases, setActiveLeases] = useState<any[]>([])

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
      
      await fetchTickets(org)
      await fetchLeases(org)
      
      const channelId = `maintenance-page-${Math.random()}`
      const channel = supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tickets', filter: `organization_id=eq.${org}` }, () => fetchTickets(org))
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
      id,
      units(id, unit_number, properties(name)),
      tenants(id, full_name)
    `).eq('organization_id', org)
    if (data) setActiveLeases(data)
  }

  const fetchTickets = async (org: string) => {
    const { data } = await supabase.from('maintenance_tickets').select(`
      *, units(unit_number, properties(name)), vendors(name, phone)
    `).eq('organization_id', org).order('created_at', { ascending: false })
    if (data) setTickets(data)
  }

  const handleApproveQuote = async (ticket: any) => {
    window.dispatchEvent(new CustomEvent('showPaywall', { detail: { source: 'Maintenance Approval Workflow' } })); return;
    setProcessingId(ticket.id)
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ status: 'in_progress', assigned_at: new Date().toISOString() })
        .eq('id', ticket.id)
        .eq('organization_id', orgId)
      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/emails/maintenance-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ action: "notify_approved", ticket_id: ticket.id, vendor_id: ticket.vendor_id, approved_cost: ticket.actual_cost, organization_id: orgId, approved_by: currentUser?.id })
      }).catch(console.error)
      
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: 'in_progress' } : t))
      toast.success("Quote approved. Vendor notified.")
    } catch (e: any) {
      toast.error("Approval failed")
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkCompleted = async (ticket: any) => {
    window.dispatchEvent(new CustomEvent('showPaywall', { detail: { source: 'Maintenance Completion & Auto-Invoicing' } })); return;
    setProcessingId(ticket.id)
    const toastId = toast.loading("Marking completed & generating invoice...")
    try {
      // 1. Update ticket status
      const { error: ticketError } = await supabase.from('maintenance_tickets').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', ticket.id)
      if (ticketError) throw ticketError

      // 2. Generate Invoice
      if (ticket.actual_cost && ticket.vendor_id) {
        await supabase.from('invoices').insert({
          organization_id: orgId,
          vendor_id: ticket.vendor_id,
          maintenance_id: ticket.id,
          property_id: ticket.property_id || ticket.units?.property_id,
          total_amount: ticket.actual_cost,
          status: 'received', // Starts as received so it shows up in "Pending" on Invoices page
          invoice_date: new Date().toISOString().split('T')[0],
          invoice_number: `INV-MT-${ticket.id.slice(0, 6).toUpperCase()}`,
        })
      }

      toast.success("Job completed! Invoice generated → Go to Invoices tab to approve & pay.", { id: toastId, duration: 5000 })
      await fetchTickets(orgId)
    } catch (e: any) {
      toast.error(`Error: ${e.message}`, { id: toastId })
    } finally {
      setProcessingId(null)
    }
  }

  const handleCreateRequest = async () => {
    window.dispatchEvent(new CustomEvent('showPaywall', { detail: { source: 'Maintenance Automation' } })); return;
    if (!newReq.title) return toast.error("Title required")
    if (!newReq.lease_id) return toast.error("Please select a tenant/unit")
    
    const selectedLease = activeLeases.find(l => l.id === newReq.lease_id)
    if (!selectedLease) return toast.error("Invalid lease selected")

    setProcessingId("create")
    try {
      console.log("Attempting to create ticket...", newReq);
      
      const unitId = Array.isArray(selectedLease.units) ? selectedLease.units[0]?.id : selectedLease.units?.id
      const tenantId = Array.isArray(selectedLease.tenants) ? selectedLease.tenants[0]?.id : selectedLease.tenants?.id

      // Wrap the insert in a manual timeout just in case it hangs forever
      const insertPromise = supabase.from('maintenance_tickets').insert({
        organization_id: orgId,
        title: newReq.title,
        description: newReq.description,
        priority: newReq.priority,
        category: newReq.category,
        status: 'open',
        unit_id: unitId || null,
        tenant_id: tenantId || null,
      }).select('*').single();

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 10 seconds")), 10000));
      
      const { data: newTicket, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

      if (error) throw error
      
      console.log("Ticket created successfully:", newTicket);
      
      // Fire off the email notification instantly
      if (newTicket) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error("Session expired. Please sign in again.")

        fetch('/api/maintenance/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`
          },
          body: JSON.stringify({ ticket_id: newTicket.id })
        }).catch(console.error)
      }
      
      toast.success("Ticket submitted successfully!")
      setShowCreateModal(false)
      setNewReq({ title: "", description: "", priority: "routine", category: "general", lease_id: "" })
      fetchTickets(orgId)
    } catch (e: any) {
      console.error("Create request error:", e)
      toast.error(`Error: ${e.message || "Failed to create ticket"}`)
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (val: number) => val ? `₹${val.toLocaleString('en-IN')}` : '-'
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours/24)}d ago`
  }

  const actionRequired = tickets.filter(t => t.status === 'open' || t.status === 'quoted')
  const inProgress = tickets.filter(t => t.status === 'assigned' || t.status === 'in_progress')
  const completed = tickets.filter(t => t.status === 'completed')

  const renderTicketCard = (ticket: any) => {
    const isOverBudget = ticket.estimated_cost && ticket.actual_cost > ticket.estimated_cost * 1.2
    
    return (
      <div key={ticket.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white text-lg">{ticket.title}</span>
              <span className={`px-2 py-0.5 rounded text-xs border ${ticket.priority==='urgent'?'border-red-500/30 text-red-400 bg-red-500/10':ticket.priority==='high'?'border-amber-500/30 text-amber-400 bg-amber-500/10':'border-[#1E1E1E] text-[#A1A1AA] bg-black'}`}>
                {ticket.priority.toUpperCase()}
              </span>
              <span className="bg-white/10 text-white px-2 py-0.5 rounded text-xs border border-white/10 capitalize">
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="text-sm text-[#A1A1AA] flex items-center gap-4 flex-wrap">
              <span>{ticket.units?.properties?.name || 'Property'} — Unit {ticket.units?.unit_number || 'XX'}</span>
              <span>•</span>
              <span className="capitalize">{ticket.category}</span>
              <span>•</span>
              <span>Opened {getTimeAgo(ticket.created_at)}</span>
            </div>

            {ticket.description && (
              <div className="text-sm text-[#A1A1AA] mt-2 bg-black p-3 rounded border border-[#1E1E1E]">
                {ticket.description}
              </div>
            )}

            {ticket.status === 'quoted' && (
              <div className="flex gap-6 mt-3 bg-black p-3 rounded-lg border border-[#1E1E1E] w-fit">
                <div>
                  <div className="text-xs text-[#A1A1AA]">Estimated</div>
                  <div className="text-sm text-white">{formatCurrency(ticket.estimated_cost)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#A1A1AA]">Quoted</div>
                  <div className={`text-sm font-semibold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(ticket.actual_cost)}</div>
                </div>
                {isOverBudget && (
                  <div className="text-xs text-red-400 self-center flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                    <AlertTriangle size={12}/> Over Budget
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3 min-w-[150px]">
            {ticket.vendors && (
              <div className="text-right">
                <div className="text-sm text-white font-medium">{ticket.vendors.name}</div>
                <div className="text-xs text-[#A1A1AA]">{ticket.vendors.phone}</div>
              </div>
            )}

            <div className="flex flex-col gap-2 w-full mt-auto">
              {ticket.status === 'quoted' && (
                <button onClick={() => handleApproveQuote(ticket)} disabled={processingId === ticket.id} className="w-full px-4 py-2 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                  {processingId === ticket.id && <Loader2 size={14} className="animate-spin"/>} Approve Quote
                </button>
              )}
              {ticket.status === 'open' && (
                <div className="w-full px-4 py-2 text-sm bg-blue-600/50 text-white/70 rounded-md flex items-center justify-center gap-2 cursor-not-allowed" title="Vendor will be assigned automatically">
                  <Wrench size={14}/> Auto-Assigning...
                </div>
              )}
              {ticket.status === 'in_progress' && (
                <button onClick={() => handleMarkCompleted(ticket)} disabled={processingId === ticket.id} className="w-full px-4 py-2 bg-green-500/20 text-green-400 font-medium text-sm rounded-lg flex items-center justify-center gap-2 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50">
                  {processingId === ticket.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Mark Completed
                </button>
              )}
              {ticket.status === 'completed' && (
                <div className="w-full px-4 py-2 text-sm bg-green-500/10 text-green-500 rounded-md flex items-center justify-center gap-2 cursor-default border border-green-500/20">
                  <CheckCircle2 size={14}/> Job Done
                </div>
              )}
              {ticket.photo_url && (
                <button onClick={() => window.open(ticket.photo_url, '_blank')} className="w-full px-4 py-2 text-sm bg-[#1E1E1E] hover:bg-white/20 text-white rounded-md transition-colors flex items-center justify-center gap-2">
                  <Camera size={14}/> View Photo
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
          <h1 className="text-3xl font-bold text-white mb-1">Maintenance</h1>
          <p className="text-[#A1A1AA]">Manage requests, vendor assignments, and quotes</p>
        </div>
        
        <div className="flex gap-3">
          <button className="p-2 bg-[#1E1E1E] text-white rounded-lg hover:bg-white/20 transition-colors"><Filter size={20}/></button>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
            <Plus size={16}/> New Request
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open Tickets", val: tickets.filter(t=>t.status==='open').length, alert: false },
          { label: "Needs Approval", val: tickets.filter(t=>t.status==='quoted').length, alert: tickets.filter(t=>t.status==='quoted').length > 0 },
          { label: "In Progress", val: inProgress.length, alert: false },
          { label: "Completed (30d)", val: completed.length, alert: false }
        ].map((kpi, i) => (
          <div key={i} className={`bg-[#0D0D0D] border rounded-lg p-4 ${kpi.alert ? 'border-amber-500/50' : 'border-[#1E1E1E]'}`}>
            <div className="text-2xl font-bold text-white mb-1">{kpi.val}</div>
            <div className={`text-xs ${kpi.alert ? 'text-amber-400' : 'text-[#A1A1AA]'}`}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="flex space-x-1 bg-[#0D0D0D] p-1 rounded-lg border border-[#1E1E1E] w-fit mb-6 overflow-x-auto">
        {[
          { id: "action_required", label: "Action Required", count: actionRequired.length },
          { id: "in_progress", label: "In Progress", count: inProgress.length },
          { id: "completed", label: "Completed", count: completed.length },
          { id: "all", label: "All Tickets", count: tickets.length }
        ].map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-[#1E1E1E] text-white' : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E1E]/50'}`}
          >
            {t.label}
            {t.count > 0 && <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-red-500/20 text-red-400' : 'bg-[#1E1E1E] text-[#A1A1AA]'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === "action_required" && (
            actionRequired.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>All caught up!</div>
            : actionRequired.map(renderTicketCard)
          )}
          
          {activeTab === "in_progress" && (
            inProgress.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><Wrench className="mx-auto mb-2 opacity-50" size={32}/>No tickets in progress.</div>
            : inProgress.map(renderTicketCard)
          )}

          {activeTab === "completed" && (
            completed.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>No completed tickets.</div>
            : completed.map(renderTicketCard)
          )}

          {activeTab === "all" && (
            tickets.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl">No tickets found.</div>
            : tickets.map(renderTicketCard)
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">New Maintenance Request</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Title</label>
                <input value={newReq.title} onChange={e=>setNewReq({...newReq, title: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. Leaking faucet" />
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Select Property & Tenant</label>
                <select value={newReq.lease_id} onChange={e=>setNewReq({...newReq, lease_id: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                  <option value="">-- Select a Tenant --</option>
                  {activeLeases.map(lease => (
                    <option key={lease.id} value={lease.id}>
                      {lease.tenants?.full_name || 'Unknown Tenant'} - {lease.units?.properties?.name || 'Unknown Property'} (Unit {lease.units?.unit_number || '?'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Category</label>
                <select value={newReq.category} onChange={e=>setNewReq({...newReq, category: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="hvac">HVAC</option>
                  <option value="appliance">Appliance</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Priority</label>
                <select value={newReq.priority} onChange={e=>setNewReq({...newReq, priority: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                  <option value="routine">Routine</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Description</label>
                <textarea value={newReq.description} onChange={e=>setNewReq({...newReq, description: e.target.value})} rows={3} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 resize-none" placeholder="Provide details..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateRequest} disabled={processingId === 'create'} className="flex-1 px-4 py-2 text-white font-medium text-sm rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                {processingId === 'create' ? <Loader2 size={16} className="animate-spin"/> : "Submit Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
