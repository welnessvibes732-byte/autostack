"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import {
  FileText, KeySquare, Wrench, UserPlus,
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye, Loader2, Link as LinkIcon
} from "lucide-react"
import toast from "react-hot-toast"

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState("invoices")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Data states
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  
  // UI states
  const [showHistory, setShowHistory] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [orgId, setOrgId] = useState<string>("")

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        const currentOrgId = await getOrCreateOrg()
        setOrgId(currentOrgId)
        
        await fetchAllData(currentOrgId)
        
        // Realtime subscriptions
        const channelId = `approvals-realtime-${Math.random()}`
        const channel = supabase.channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${currentOrgId}` }, () => fetchInvoices(currentOrgId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_tickets', filter: `organization_id=eq.${currentOrgId}` }, () => fetchTickets(currentOrgId))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `organization_id=eq.${currentOrgId}` }, () => fetchLeads(currentOrgId))
          .subscribe()
          
        return () => { supabase.removeChannel(channel) }
      } catch (err) {
        console.error(err)
        setError("Unable to load approvals. Try refreshing.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const fetchAllData = async (org: string) => {
    await Promise.all([
      fetchInvoices(org),
      fetchLeases(org),
      fetchTickets(org),
      fetchLeads(org)
    ])
  }

  const fetchInvoices = async (org: string) => {
    const { data } = await supabase
      .from('invoices')
      .select(`
        id, vendor_name, invoice_number, invoice_date, total_amount, gst_amount, 
        status, is_anomaly, anomaly_reason, is_duplicate, work_order_amount, amount_deviation, 
        file_path, created_at, approved_by, approved_at,
        vendors ( name, phone ),
        maintenance_tickets ( title ),
        properties ( name )
      `)
      .eq('organization_id', org)
      .order('created_at', { ascending: true })
      
    if (data) {
      setInvoices(data.filter(i => ['received', 'matched', 'flagged'].includes(i.status)))
      setInvoiceHistory(data.filter(i => ['approved', 'rejected', 'paid'].includes(i.status)))
    }
  }

  const fetchLeases = async (org: string) => {
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('leases')
      .select(`
        id, unit_id, tenant_name, tenant_email, tenant_phone, start_date, expiry_date, rent_amount,
        lease_status, renewal_status, file_path, created_at,
        units ( unit_number, properties ( name, city ) )
      `)
      .eq('organization_id', org)
      .eq('lease_status', 'active')
      .lte('expiry_date', in90Days)
      .order('expiry_date', { ascending: true })
      
    if (data) {
      setLeases(data.filter(l => !l.renewal_status || l.renewal_status === 'pending' || l.renewal_status === 'offered'))
    }
  }

  const fetchTickets = async (org: string) => {
    const { data } = await supabase
      .from('maintenance_tickets')
      .select(`
        id, title, description, category, priority, status, estimated_cost, actual_cost, created_at, assigned_at,
        units ( unit_number, properties ( name ) ),
        vendors ( name, phone, rating )
      `)
      .eq('organization_id', org)
      .eq('status', 'quoted')
      .not('actual_cost', 'is', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      
    if (data) setTickets(data)
  }

  const fetchLeads = async (org: string) => {
    const { data } = await supabase
      .from('leads')
      .select(`
        id, full_name, email, phone, source, inquiry_type, budget_min, budget_max, 
        preferred_area, property_type, bedrooms, move_in_timeline, lead_score, stage, notes, 
        created_at, last_contact_at
      `)
      .eq('organization_id', org)
      .in('stage', ['negotiating', 'pending_signoff'])
      .order('lead_score', { ascending: false })
      .order('created_at', { ascending: true })
      
    if (data) setLeads(data)
  }

  // --- Invoice Actions ---
  const handleApproveInvoice = async (invoiceId: string) => {
    setProcessingId(invoiceId)
    try {
      const { error } = await supabase.from('invoices').update({ status: 'approved', approved_by: currentUser?.id, approved_at: new Date().toISOString() }).eq('id', invoiceId)
      if (error) throw error
      
      if (process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_approved", invoice_id: invoiceId }) }).catch(console.error)
      }
      
      setInvoices(prev => prev.filter(i => i.id !== invoiceId))
      toast.success("Invoice approved successfully")
    } catch (e: any) {
      toast.error("Approval failed. Please try again.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectInvoice = async (invoiceId: string) => {
    if (!rejectionReason.trim()) return toast.error("Please enter a rejection reason")
    setProcessingId(invoiceId)
    try {
      const { error } = await supabase.from('invoices').update({ status: 'rejected', anomaly_reason: rejectionReason }).eq('id', invoiceId)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_rejected", invoice_id: invoiceId, reason: rejectionReason }) }).catch(console.error)
      }
      
      setInvoices(prev => prev.filter(i => i.id !== invoiceId))
      setRejectingId(null)
      setRejectionReason("")
      toast.error("Invoice rejected")
    } catch (e: any) {
      toast.error("Rejection failed. Please try again.")
    } finally {
      setProcessingId(null)
    }
  }

  // --- Lease Actions ---
  const handleSendRenewal = async (lease: any) => {
    setProcessingId(lease.id)
    try {
      const { error } = await supabase.from('leases').update({ renewal_status: 'offered' }).eq('id', lease.id)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "send_renewal_offer", lease_id: lease.id, tenant_email: lease.tenant_email }) }).catch(console.error)
      }
      
      setLeases(prev => prev.map(l => l.id === lease.id ? { ...l, renewal_status: 'offered' } : l))
      toast.success("Renewal offer sent to tenant")
    } catch (e: any) {
      toast.error("Failed to send offer")
    } finally {
      setProcessingId(null)
    }
  }
  
  const handleMarkRenewed = async (leaseId: string) => {
    if (!confirm("Confirm lease has been renewed?")) return
    setProcessingId(leaseId)
    try {
      const { error } = await supabase.from('leases').update({ renewal_status: 'renewed' }).eq('id', leaseId)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_renewed", lease_id: leaseId }) }).catch(console.error)
      }
      
      setLeases(prev => prev.filter(l => l.id !== leaseId))
      toast.success("Lease marked as renewed")
    } catch (e: any) {
      toast.error("Update failed")
    } finally {
      setProcessingId(null)
    }
  }

  const handleSkipRenewal = async (leaseId: string) => {
    if (!confirm("Mark this lease as not renewing?")) return
    setProcessingId(leaseId)
    try {
      await supabase.from('leases').update({ renewal_status: 'declined' }).eq('id', leaseId)
      setLeases(prev => prev.filter(l => l.id !== leaseId))
      toast.success("Lease marked as not renewing")
    } catch (e: any) {
      toast.error("Update failed")
    } finally {
      setProcessingId(null)
    }
  }

  // --- Maintenance Actions ---
  const handleApproveQuote = async (ticket: any) => {
    setProcessingId(ticket.id)
    try {
      const { error } = await supabase.from('maintenance_tickets').update({ status: 'in_progress', assigned_at: new Date().toISOString() }).eq('id', ticket.id)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_approved", ticket_id: ticket.id }) }).catch(console.error)
      }
      
      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      toast.success("Quote approved. Vendor notified.")
    } catch (e: any) {
      toast.error("Approval failed")
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectQuote = async (ticket: any) => {
    if (!rejectionReason.trim()) return toast.error("Please enter a rejection reason")
    setProcessingId(ticket.id)
    try {
      const { error } = await supabase.from('maintenance_tickets').update({ status: 'open', actual_cost: null }).eq('id', ticket.id)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_rejected", ticket_id: ticket.id, reason: rejectionReason }) }).catch(console.error)
      }
      
      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      setRejectingId(null)
      setRejectionReason("")
      toast.error("Quote rejected. Vendor needs to requote.")
    } catch (e: any) {
      toast.error("Rejection failed")
    } finally {
      setProcessingId(null)
    }
  }

  // --- Deal Actions ---
  const handleRequestSignoff = async (lead: any) => {
    setProcessingId(lead.id)
    try {
      const { error } = await supabase.from('leads').update({ stage: 'pending_signoff' }).eq('id', lead.id)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_signoff_request", lead_id: lead.id }) }).catch(console.error)
      }
      
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: 'pending_signoff' } : l))
      toast.success("Sign-off requested")
    } catch (e: any) {
      toast.error("Request failed")
    } finally {
      setProcessingId(null)
    }
  }

  const handleApproveDeal = async (leadId: string) => {
    if (!confirm("Confirm deal approval?")) return
    setProcessingId(leadId)
    try {
      const { error } = await supabase.from('leads').update({ stage: 'won' }).eq('id', leadId)
      if (error) throw error

      if (process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK, { method: 'POST', body: JSON.stringify({ action: "notify_approved", lead_id: leadId }) }).catch(console.error)
      }
      
      setLeads(prev => prev.filter(l => l.id !== leadId))
      toast.success("Deal approved")
    } catch (e: any) {
      toast.error("Approval failed")
    } finally {
      setProcessingId(null)
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours} hours ago`
    return `${Math.floor(hours/24)} days ago`
  }

  const getUrgencyBadge = (dateStr: string) => {
    const hours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
    if (hours > 48) return <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded text-xs">Critical</span>
    if (hours > 24) return <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-xs">Overdue</span>
    return null
  }

  const formatCurrency = (val: number) => val ? `₹${val.toLocaleString('en-IN')}` : '-'

  if (error) return (
    <div className="p-8 text-center">
      <div className="text-red-500 mb-4">{error}</div>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#1E1E1E] text-white rounded">Retry</button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-[#1E1E1E]">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Approvals</h1>
          <p className="text-[#A1A1AA]">All pending actions requiring your decision</p>
        </div>
        
        {/* Stats Row */}
        <div className="flex gap-4">
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-white">{invoices.length}</div>
            <div className="text-xs text-[#A1A1AA]">Invoices</div>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-white">{leases.length}</div>
            <div className="text-xs text-[#A1A1AA]">Renewals</div>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-white">{tickets.length}</div>
            <div className="text-xs text-[#A1A1AA]">Quotes</div>
          </div>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-white">{leads.filter(l=>l.stage==='pending_signoff').length}</div>
            <div className="text-xs text-[#A1A1AA]">Sign-offs</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-[#0D0D0D] p-1 rounded-lg border border-[#1E1E1E] w-fit">
        {[
          { id: "invoices", label: "Invoices", icon: FileText, count: invoices.length },
          { id: "leases", label: "Lease Renewals", icon: KeySquare, count: leases.length },
          { id: "maintenance", label: "Maintenance Quotes", icon: Wrench, count: tickets.length },
          { id: "leads", label: "Deal Sign-offs", icon: UserPlus, count: leads.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-[#1E1E1E] text-white' : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E1E]/50'}`}
          >
            <t.icon size={16} />
            {t.label}
            {t.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-white/10' : 'bg-[#1E1E1E]'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* INVOICES TAB */}
          {activeTab === "invoices" && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Pending Invoices</h2>
              {invoices.length === 0 ? (
                <div className="p-8 text-center border border-[#1E1E1E] rounded-xl bg-[#0D0D0D]/50 text-[#A1A1AA]">
                  <CheckCircle2 className="mx-auto mb-2 opacity-50" size={32} />
                  No pending invoices
                </div>
              ) : invoices.map(invoice => (
                <div key={invoice.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white text-lg">{invoice.vendors?.name || invoice.vendor_name}</span>
                        {invoice.status === "matched" ? (
                          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/20">Matched</span>
                        ) : invoice.status === "flagged" ? (
                          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20">Flagged</span>
                        ) : (
                          <span className="bg-white/10 text-white px-2 py-0.5 rounded text-xs border border-white/10">Received</span>
                        )}
                        {getUrgencyBadge(invoice.created_at)}
                      </div>
                      
                      <div className="text-sm text-[#A1A1AA] flex items-center gap-4">
                        <span>Inv #{invoice.invoice_number}</span>
                        <span>•</span>
                        <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{invoice.properties?.name || 'Unassigned Property'}</span>
                        {invoice.maintenance_tickets?.title && (
                          <><span>•</span><span className="text-blue-400 flex items-center gap-1"><LinkIcon size={12}/> {invoice.maintenance_tickets.title}</span></>
                        )}
                      </div>

                      {(invoice.is_anomaly || invoice.is_duplicate) && (
                        <div className="mt-2 text-sm">
                          {invoice.is_anomaly && <div className="text-red-400 flex items-center gap-1"><AlertTriangle size={14}/> {invoice.anomaly_reason}</div>}
                          {invoice.is_duplicate && <div className="text-orange-400 flex items-center gap-1"><AlertTriangle size={14}/> Possible duplicate invoice</div>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between gap-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{formatCurrency(invoice.total_amount)}</div>
                        <div className="text-xs text-[#A1A1AA] flex items-center gap-1 justify-end mt-1"><Clock size={12}/> Waiting {getTimeAgo(invoice.created_at)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {invoice.file_path && (
                          <button className="px-4 py-2 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}
                            onClick={() => {
                              const url = supabase.storage.from('invoices').getPublicUrl(invoice.file_path).data.publicUrl
                              window.open(url, '_blank')
                            }}
                          ><Eye size={14}/> View</button>
                        )}
                        <button 
                          className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors disabled:opacity-50"
                          onClick={() => setRejectingId(invoice.id)}
                          disabled={processingId === invoice.id}
                        >Reject</button>
                        <button 
                          className="px-4 py-1.5 text-sm bg-green-600 text-white hover:bg-green-500 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                          onClick={() => handleApproveInvoice(invoice.id)}
                          disabled={processingId === invoice.id}
                        >
                          {processingId === invoice.id && <Loader2 size={14} className="animate-spin" />}
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Form */}
                  {rejectingId === invoice.id && (
                    <div className="mt-4 pt-4 border-t border-[#1E1E1E] flex gap-3 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="text" placeholder="Reason for rejection..." 
                        value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                        className="flex-1 bg-black border border-[#1E1E1E] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                        autoFocus
                      />
                      <button onClick={() => handleRejectInvoice(invoice.id)} disabled={processingId === invoice.id} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors flex items-center gap-2">
                        {processingId === invoice.id && <Loader2 size={14} className="animate-spin"/>} Confirm Reject
                      </button>
                      <button onClick={() => {setRejectingId(null); setRejectionReason("")}} className="px-4 py-2 text-[#A1A1AA] hover:text-white text-sm transition-colors">Cancel</button>
                    </div>
                  )}
                </div>
              ))}

              {/* History Toggle */}
              <div className="pt-6">
                <button onClick={() => setShowHistory(!showHistory)} className="text-sm text-[#A1A1AA] hover:text-white flex items-center gap-2">
                  {showHistory ? "Hide History" : "Show History"} ({invoiceHistory.length})
                </button>
                {showHistory && (
                  <div className="mt-4 space-y-3 opacity-70">
                    {invoiceHistory.map(invoice => (
                      <div key={invoice.id} className="bg-black border border-[#1E1E1E] rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-white">{invoice.vendors?.name || invoice.vendor_name} — {formatCurrency(invoice.total_amount)}</div>
                          <div className="text-xs text-[#A1A1AA]">Inv #{invoice.invoice_number} • {new Date(invoice.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="text-xs text-[#A1A1AA] flex flex-col items-end">
                          <span className={`px-2 py-0.5 rounded border mb-1 ${invoice.status === 'approved' ? 'border-green-500/20 text-green-400 bg-green-500/10' : invoice.status === 'rejected' ? 'border-red-500/20 text-red-400 bg-red-500/10' : 'border-blue-500/20 text-blue-400 bg-blue-500/10'}`}>{invoice.status.toUpperCase()}</span>
                          {invoice.approved_at && <span>Processed: {new Date(invoice.approved_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LEASES TAB */}
          {activeTab === "leases" && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Lease Renewals Due</h2>
              {leases.length === 0 ? (
                <div className="p-8 text-center border border-[#1E1E1E] rounded-xl bg-[#0D0D0D]/50 text-[#A1A1AA]">
                  <CheckCircle2 className="mx-auto mb-2 opacity-50" size={32} />
                  No pending lease renewals
                </div>
              ) : leases.map(lease => {
                const daysLeft = Math.ceil((new Date(lease.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const urgencyColor = daysLeft < 30 ? "text-red-400 bg-red-400/10" : daysLeft < 60 ? "text-amber-400 bg-amber-400/10" : "text-green-400 bg-green-400/10"
                
                return (
                  <div key={lease.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white text-lg">{lease.tenant_name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs border border-white/10 ${urgencyColor}`}>{daysLeft} days remaining</span>
                          {lease.renewal_status === 'offered' && <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-500/20">Offer Sent</span>}
                        </div>
                        <div className="text-sm text-[#A1A1AA] flex items-center gap-4">
                          <span>{lease.units?.properties?.name} — Unit {lease.units?.unit_number}</span>
                          <span>•</span>
                          <span>Expires: {new Date(lease.expiry_date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-[#A1A1AA] mt-1">Current Rent: {formatCurrency(lease.rent_amount)}/mo</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(!lease.renewal_status || lease.renewal_status === 'pending') && (
                          <button onClick={() => handleSendRenewal(lease)} disabled={processingId === lease.id} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-2">
                            {processingId === lease.id && <Loader2 size={14} className="animate-spin"/>} Send Renewal Offer
                          </button>
                        )}
                        {lease.renewal_status === 'offered' && (
                          <button onClick={() => handleMarkRenewed(lease.id)} disabled={processingId === lease.id} className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors flex items-center gap-2">
                            {processingId === lease.id && <Loader2 size={14} className="animate-spin"/>} Mark Renewed
                          </button>
                        )}
                        <button onClick={() => handleSkipRenewal(lease.id)} disabled={processingId === lease.id} className="px-3 py-1.5 text-sm bg-[#1E1E1E] text-white hover:bg-white/20 rounded-md transition-colors">
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* MAINTENANCE QUOTES TAB */}
          {activeTab === "maintenance" && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Pending Maintenance Quotes</h2>
              {tickets.length === 0 ? (
                <div className="p-8 text-center border border-[#1E1E1E] rounded-xl bg-[#0D0D0D]/50 text-[#A1A1AA]">
                  <CheckCircle2 className="mx-auto mb-2 opacity-50" size={32} />
                  No pending maintenance quotes
                </div>
              ) : tickets.map(ticket => {
                const isOverBudget = ticket.estimated_cost && ticket.actual_cost > ticket.estimated_cost * 1.2
                return (
                  <div key={ticket.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white text-lg">{ticket.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs border ${ticket.priority==='urgent'?'border-red-500/30 text-red-400 bg-red-500/10':'border-amber-500/30 text-amber-400 bg-amber-500/10'}`}>{ticket.priority.toUpperCase()}</span>
                          {getUrgencyBadge(ticket.assigned_at || ticket.created_at)}
                        </div>
                        <div className="text-sm text-[#A1A1AA] flex items-center gap-4">
                          <span>{ticket.units?.properties?.name} — Unit {ticket.units?.unit_number}</span>
                          <span>•</span>
                          <span className="capitalize">{ticket.category}</span>
                          <span>•</span>
                          <span>Vendor: <strong className="text-white">{ticket.vendors?.name || 'Unknown'}</strong></span>
                        </div>
                        
                        <div className="flex gap-6 mt-3 bg-black/40 p-3 rounded-lg border border-[#1E1E1E] w-fit">
                          <div>
                            <div className="text-xs text-[#A1A1AA]">Estimated</div>
                            <div className="text-sm text-white">{formatCurrency(ticket.estimated_cost)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[#A1A1AA]">Quoted</div>
                            <div className={`text-sm font-semibold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(ticket.actual_cost)}</div>
                          </div>
                          {isOverBudget && (
                            <div className="text-xs text-red-400 self-center flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                              <AlertTriangle size={12}/> Exceeds estimate by &gt;20%
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 justify-center">
                        <button onClick={() => handleApproveQuote(ticket)} disabled={processingId === ticket.id} className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors w-full flex items-center justify-center gap-2">
                          {processingId === ticket.id && <Loader2 size={14} className="animate-spin"/>} Approve Quote
                        </button>
                        <button onClick={() => setRejectingId(ticket.id)} disabled={processingId === ticket.id} className="px-4 py-1.5 text-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-md transition-colors w-full">
                          Reject
                        </button>
                        {isOverBudget && (
                          <button onClick={() => {
                            setRejectionReason("Please review your quote to bring it closer to the original estimate.")
                            setRejectingId(ticket.id)
                          }} className="px-4 py-1.5 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-md transition-colors w-full">
                            Request Requote
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rejection Form */}
                    {rejectingId === ticket.id && (
                      <div className="mt-4 pt-4 border-t border-[#1E1E1E] flex gap-3 animate-in fade-in slide-in-from-top-2">
                        <input 
                          type="text" placeholder="Note to vendor..." 
                          value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                          className="flex-1 bg-black border border-[#1E1E1E] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                          autoFocus
                        />
                        <button onClick={() => handleRejectQuote(ticket)} disabled={processingId === ticket.id} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded transition-colors flex items-center gap-2">
                          {processingId === ticket.id && <Loader2 size={14} className="animate-spin"/>} Submit
                        </button>
                        <button onClick={() => {setRejectingId(null); setRejectionReason("")}} className="px-4 py-2 text-[#A1A1AA] hover:text-white text-sm transition-colors">Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* DEAL SIGN-OFFS TAB */}
          {activeTab === "leads" && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white mb-4">Pending Deal Sign-offs</h2>
              {leads.length === 0 ? (
                <div className="p-8 text-center border border-[#1E1E1E] rounded-xl bg-[#0D0D0D]/50 text-[#A1A1AA]">
                  <CheckCircle2 className="mx-auto mb-2 opacity-50" size={32} />
                  No deals pending sign-off
                </div>
              ) : leads.map(lead => (
                <div key={lead.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white text-lg">{lead.full_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs border font-medium ${lead.lead_score >= 70 ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'}`}>
                          Score: {lead.lead_score}
                        </span>
                        {lead.stage === 'pending_signoff' ? (
                          <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-500/20">Awaiting Manager</span>
                        ) : (
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-500/20">Negotiating</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-[#A1A1AA] flex items-center gap-4">
                        <span className="capitalize">{lead.inquiry_type}</span>
                        <span>•</span>
                        <span>Budget: {formatCurrency(lead.budget_min)} - {formatCurrency(lead.budget_max)}</span>
                        <span>•</span>
                        <span>{lead.property_type} ({lead.bedrooms}BHK) in {lead.preferred_area}</span>
                      </div>
                      
                      {lead.notes && (
                        <div className="mt-2 text-sm text-[#A1A1AA] bg-black/40 p-3 rounded-lg border border-[#1E1E1E]">
                          <strong className="text-white mb-1 block">Notes:</strong>
                          {lead.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 justify-center">
                      {lead.stage === 'negotiating' ? (
                        <button onClick={() => handleRequestSignoff(lead)} disabled={processingId === lead.id} className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors flex items-center gap-2">
                          {processingId === lead.id && <Loader2 size={14} className="animate-spin"/>} Request Sign-Off
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleApproveDeal(lead.id)} disabled={processingId === lead.id} className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors w-full flex items-center justify-center gap-2">
                            {processingId === lead.id && <Loader2 size={14} className="animate-spin"/>} Approve Deal
                          </button>
                          <button onClick={() => setRejectingId(lead.id)} disabled={processingId === lead.id} className="px-4 py-1.5 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-md transition-colors w-full">
                            Send Back
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Send Back Form */}
                  {rejectingId === lead.id && (
                    <div className="mt-4 pt-4 border-t border-[#1E1E1E] flex gap-3 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="text" placeholder="Feedback for agent..." 
                        value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                        className="flex-1 bg-black border border-[#1E1E1E] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                        autoFocus
                      />
                      <button onClick={async () => {
                        if(!rejectionReason.trim()) return toast.error("Provide feedback")
                        setProcessingId(lead.id)
                        try {
                          await fetch(process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK!, {
                            method: 'POST', headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({ action: "sent_back", lead_id: lead.id, feedback: rejectionReason, organization_id: orgId })
                          })
                          setLeads(prev => prev.map(l => l.id === lead.id ? {...l, stage: 'negotiating', notes: `Manager feedback: ${rejectionReason}`} : l))
                          setRejectingId(null)
                          setRejectionReason("")
                        } finally { setProcessingId(null) }
                      }} disabled={processingId === lead.id} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors flex items-center gap-2">
                        {processingId === lead.id && <Loader2 size={14} className="animate-spin"/>} Confirm
                      </button>
                      <button onClick={() => {setRejectingId(null); setRejectionReason("")}} className="px-4 py-2 text-[#A1A1AA] hover:text-white text-sm transition-colors">Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
