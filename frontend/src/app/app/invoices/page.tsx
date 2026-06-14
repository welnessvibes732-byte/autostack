"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import { 
  FileText, Upload, Plus, CheckCircle2, AlertTriangle, Eye, Loader2, IndianRupee, Link as LinkIcon, Wand2 
} from "lucide-react"
import toast from "react-hot-toast"

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("pending")
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [invoices, setInvoices] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [showPay, setShowPay] = useState<any>(null)
  const [payForm, setPayForm] = useState({ paid_method: 'upi', paid_ref: '', paid_date: '' })

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
      
      await fetchInvoices(org)
      
      const channelId = `invoices-page-${Math.random()}`
      const channel = supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${org}` }, () => fetchInvoices(org))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchInvoices = async (org: string) => {
    const { data } = await supabase.from('invoices').select(`
      *, vendors(name), maintenance_tickets(title), properties(name)
    `).eq('organization_id', org).order('created_at', { ascending: false })
    if (data) setInvoices(data)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('showPaywall', { detail: { source: 'Automated Invoice Processing' } }))
    return;

    const file = e.target.files?.[0] as File;
    if (!file) return

    setIsUploading(true)
    const toastId = toast.loading("Uploading invoice...")
    try {
      const filePath = `${orgId}/${Date.now()}_${file.name}`
      
      const { error: uploadError } = await supabase.storage.from('invoices').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: inserted, error: dbError } = await supabase.from('invoices').insert({
        organization_id: orgId,
        file_name: file.name,
        file_path: filePath,
        status: 'received',
        total_amount: 0
      }).select().single()
      if (dbError) throw dbError

      // Trigger Webhook if configured for document processing
      if (process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK) {
        fetch(process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK as string, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'document_uploaded', file_path: filePath, organization_id: orgId, file_name: file.name, type: 'invoice', invoice_id: inserted.id })
        }).catch(console.error)
      }

      toast.success("Invoice uploaded! AI is processing data.", { id: toastId })
    } catch (err) {
      toast.error("Upload failed", { id: toastId })
      console.error(err)
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ""
    }
  }

  const handleApprove = async (invoice: any) => {
    setProcessingId(invoice.id)
    const toastId = toast.loading("Approving invoice...")
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Try direct client-side update first
      const { data, error } = await supabase.from('invoices').update({
        status: 'approved',
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString()
      }).eq('id', invoice.id).select('id, status')

      if (error) {
        console.error("Direct update error:", error)
        throw new Error(error.message)
      }

      // Check if update actually changed something (data should have 1 row)
      if (!data || data.length === 0) {
        console.warn("Direct update returned empty - trying API fallback...")
        const res = await fetch('/api/invoices/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({ invoice_id: invoice.id, action: 'approve' })
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'API fallback failed')
      }

      // Notify vendor (non-blocking)
      fetch('/api/emails/invoice-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ action: "notify_approved", invoice_id: invoice.id, organization_id: orgId, approved_by: currentUser?.id })
      }).catch(console.error)

      await fetchInvoices(orgId)
      toast.success("Invoice approved! Switch to 'Awaiting Payment' tab to pay.", { id: toastId, duration: 5000 })
    } catch (e: any) {
      console.error("Invoice approve error:", e)
      const msg = e.message || 'Unknown error'
      toast.error(`Error: ${msg}`, { id: toastId, duration: 15000 })
      window.alert("Approve failed: " + msg)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (invoiceId: string) => {
    const reason = prompt("Enter reason for rejection:")
    if (!reason) return
    setProcessingId(invoiceId)
    const toastId = toast.loading("Rejecting invoice...")
    try {
      const { error } = await supabase.from('invoices').update({
        status: 'rejected',
        anomaly_reason: reason
      }).eq('id', invoiceId)
      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/emails/invoice-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ action: "notify_rejected", invoice_id: invoiceId, organization_id: orgId, rejected_by: currentUser?.id, reason })
      }).catch(console.error)
      await fetchInvoices(orgId)
      toast.success("Invoice rejected", { id: toastId })
    } catch (e: any) {
      toast.error(`Rejection failed: ${e.message}`, { id: toastId })
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkPaid = async () => {
    if (!showPay) return
    setProcessingId(showPay.id)
    const toastId = toast.loading("Recording payment...")
    try {
      const { error } = await supabase.from('invoices').update({
        status: 'paid',
        payment_date: payForm.paid_date || new Date().toISOString().split('T')[0],
        payment_ref: payForm.paid_ref || payForm.paid_method || 'direct'
      }).eq('id', showPay.id)
      if (error) throw error
      
      toast.success("Payment recorded & expense logged to ledger!", { id: toastId })
      setShowPay(null)
      await fetchInvoices(orgId)
    } catch (e: any) {
      toast.error(`Failed to record: ${e.message}`, { id: toastId })
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (val: number) => val ? `₹${Number(val || 0).toLocaleString('en-IN')}` : '-'
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours/24)}d ago`
  }

  // FIXED: Proper tab grouping
  const pendingInvoices = invoices.filter(i => ['received', 'matched', 'flagged'].includes(i.status))
  const approvedInvoices = invoices.filter(i => i.status === 'approved')
  const paidInvoices = invoices.filter(i => ['paid', 'rejected'].includes(i.status))

  const renderInvoiceCard = (invoice: any) => {
    const showApproveReject = ['received', 'matched', 'flagged'].includes(invoice.status)
    const showPayButton = invoice.status === 'approved'

    return (
    <div key={invoice.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white text-lg">{invoice.vendors?.name || invoice.vendor_name || 'Processing...'}</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${
              invoice.status==='received'?'border-blue-500/20 text-blue-400 bg-blue-500/10':
              invoice.status==='matched'?'border-green-500/20 text-green-400 bg-green-500/10':
              invoice.status==='flagged'?'border-red-500/20 text-red-400 bg-red-500/10':
              invoice.status==='approved'?'border-amber-500/20 text-amber-400 bg-amber-500/10':
              invoice.status==='paid'?'border-green-500/20 text-green-400 bg-green-500/10':
              'border-[#1E1E1E] text-[#A1A1AA] bg-black'}`}>
              {invoice.status === 'approved' ? 'APPROVED — AWAITING PAYMENT' : invoice.status.toUpperCase()}
            </span>
          </div>
          
          <div className="text-sm text-[#A1A1AA] flex items-center gap-4 flex-wrap">
            <span>Inv #{invoice.invoice_number || '---'}</span>
            <span>•</span>
            <span>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '---'}</span>
            {invoice.properties?.name && <><span>•</span><span>{invoice.properties.name}</span></>}
            {invoice.maintenance_tickets?.title && (
              <><span>•</span><span className="text-blue-400 flex items-center gap-1"><LinkIcon size={12}/> {invoice.maintenance_tickets.title}</span></>
            )}
          </div>

          {(invoice.is_anomaly || invoice.is_duplicate) && (
            <div className="mt-2 text-sm space-y-1">
              {invoice.is_anomaly && <div className="text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded w-fit"><AlertTriangle size={14}/> {invoice.anomaly_reason}</div>}
              {invoice.is_duplicate && <div className="text-orange-400 font-bold flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 rounded w-fit"><AlertTriangle size={16}/> Immutable Ledger Block: Duplicate invoice amount detected from this vendor in the last 60 days.</div>}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-between gap-3 min-w-[150px]">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{formatCurrency(invoice.total_amount)}</div>
            <div className="text-xs text-[#A1A1AA] mt-1">{getTimeAgo(invoice.created_at)}</div>
          </div>

          <div className="flex items-center gap-2">
            {invoice.file_path && (
              <button className="p-2 text-[#A1A1AA] hover:text-white bg-[#1E1E1E] hover:bg-white/20 rounded-md transition-colors"
                onClick={() => window.open(supabase.storage.from('invoices').getPublicUrl(invoice.file_path).data.publicUrl, '_blank')}
                title="View Document"
              ><Eye size={16}/></button>
            )}
            {showApproveReject && (
              <>
                <button onClick={() => handleReject(invoice.id)} disabled={processingId === invoice.id} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50">Reject</button>
                <button onClick={() => handleApprove(invoice)} disabled={processingId === invoice.id || invoice.is_duplicate} className="px-4 py-1.5 text-white font-bold text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", border: "none" }}>
                  {processingId === invoice.id && <Loader2 size={14} className="animate-spin"/>} Approve
                </button>
              </>
            )}
            {showPayButton && (
              <button onClick={() => { setShowPay(invoice); setPayForm({ paid_method: 'upi', paid_ref: '', paid_date: new Date().toISOString().split('T')[0] }) }} disabled={processingId === invoice.id} className="px-4 py-1.5 bg-green-500 text-white font-bold text-sm rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors">
                {processingId === invoice.id ? <Loader2 size={14} className="animate-spin"/> : <IndianRupee size={14}/>} Pay Now
              </button>
            )}
            {invoice.status === 'paid' && (
              <span className="px-3 py-1.5 text-sm bg-green-500/10 text-green-400 rounded-md flex items-center gap-1 border border-green-500/20"><CheckCircle2 size={14}/> Paid</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )}

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Invoices</h1>
          <p className="text-[#A1A1AA]">Approve vendor invoices and record payments to the ledger</p>
        </div>
        
        <label className="px-5 py-2.5 text-white font-bold text-sm rounded-lg flex items-center gap-2 hover:opacity-90 cursor-pointer transition-opacity" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", border: "none" }}>
          {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
          {isUploading ? "Uploading..." : "Upload Invoice"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      <div className="flex space-x-1 bg-[#0D0D0D] p-1 rounded-lg border border-[#1E1E1E] w-fit mb-6">
        {[
          { id: "pending", label: "Pending Approval", count: pendingInvoices.length },
          { id: "approved", label: "Awaiting Payment", count: approvedInvoices.length },
          { id: "paid", label: "Paid / Archived", count: paidInvoices.length }
        ].map(t => (
          <button
            key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-[#1E1E1E] text-white' : 'text-[#A1A1AA] hover:text-white hover:bg-[#1E1E1E]/50'}`}
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
          {activeTab === "pending" && (
            pendingInvoices.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>No invoices pending approval.</div>
            : pendingInvoices.map(i => renderInvoiceCard(i))
          )}
          
          {activeTab === "approved" && (
            approvedInvoices.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>No invoices awaiting payment.</div>
            : approvedInvoices.map(i => renderInvoiceCard(i))
          )}

          {activeTab === "paid" && (
            paidInvoices.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><FileText className="mx-auto mb-2 opacity-50" size={32}/>No paid or archived invoices.</div>
            : paidInvoices.map(i => renderInvoiceCard(i))
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]" onClick={(e) => { if (e.target === e.currentTarget) setShowPay(null) }}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><IndianRupee className="text-green-500" size={20}/> Record Payment</h2>
              <button onClick={() => setShowPay(null)} className="text-[#A1A1AA] hover:text-white"><Plus className="rotate-45" size={20}/></button>
            </div>

            <div className="bg-[#141414] rounded-lg p-4 border border-[#1E1E1E] mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#A1A1AA] text-sm">Vendor</span>
                <span className="text-white font-medium">{showPay.vendors?.name || showPay.vendor_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#A1A1AA] text-sm">Invoice #</span>
                <span className="text-white font-medium">{showPay.invoice_number || '---'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA] text-sm">Amount</span>
                <span className="text-green-400 font-bold text-lg">{formatCurrency(showPay.total_amount)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Payment Method</label>
                <select value={payForm.paid_method} onChange={e => setPayForm({...payForm, paid_method: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Reference / Transaction ID</label>
                <input type="text" value={payForm.paid_ref} onChange={e => setPayForm({...payForm, paid_ref: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. UPI ref, cheque no..." />
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Payment Date</label>
                <input type="date" value={payForm.paid_date} onChange={e => setPayForm({...payForm, paid_date: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPay(null)} className="flex-1 px-4 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleMarkPaid} disabled={processingId === showPay.id} className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                {processingId === showPay.id ? <Loader2 size={16} className="animate-spin"/> : <IndianRupee size={16}/>} Confirm Payment
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA] mt-4 text-center">This will record the expense in the double-entry ledger and deduct from your Cash balance.</p>
          </div>
        </div>
      )}
    </div>
  )
}
