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
    const file = e.target.files?.[0]
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
        fetch(process.env.NEXT_PUBLIC_N8N_DOCUMENT_WEBHOOK, {
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
    try {
      // 1. Immutable Ledger Check (Double Billing Prevention)
      const vName = invoice.vendors?.name || invoice.vendor_name
      if (vName && invoice.total_amount > 0) {
        const { data: duplicates } = await supabase.from('invoices')
          .select('id, created_at, status')
          .eq('organization_id', orgId)
          .eq('vendor_name', vName)
          .eq('total_amount', invoice.total_amount)
          .neq('id', invoice.id)
          .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
          
        if (duplicates && duplicates.length > 0) {
          toast.error("Ledger Block: Possible double-billing detected. Invoice flagged.", { duration: 6000 })
          await supabase.from('invoices').update({ is_duplicate: true }).eq('id', invoice.id)
          fetchInvoices(orgId)
          setProcessingId(null)
          return
        }
      }

      // 2. Trigger Autonomous Approval Flow
      const res = await fetch('/api/emails/invoice-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "approved", invoice_id: invoice.id, organization_id: orgId, approved_by: currentUser?.id })
      })
      if (!res.ok) throw new Error("Webhook failed")
      toast.success("Invoice approved & ledger updated")
    } catch (e) {
      toast.error("Approval failed")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (invoiceId: string) => {
    const reason = prompt("Enter reason for rejection:")
    if (!reason) return
    setProcessingId(invoiceId)
    try {
      const res = await fetch('/api/emails/invoice-approval', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "rejected", invoice_id: invoiceId, organization_id: orgId, rejected_by: currentUser?.id, rejection_reason: reason })
      })
      if (!res.ok) throw new Error("Webhook failed")
      toast.success("Invoice rejected")
    } catch (e) {
      toast.error("Rejection failed")
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

  const processingInvoices = invoices.filter(i => i.status === 'received')
  const pendingInvoices = invoices.filter(i => ['matched', 'flagged'].includes(i.status))
  const archivedInvoices = invoices.filter(i => ['approved', 'rejected', 'paid'].includes(i.status))

  const renderInvoiceCard = (invoice: any, actions: boolean) => (
    <div key={invoice.id} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-white/20 transition-colors">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white text-lg">{invoice.vendors?.name || invoice.vendor_name || 'Processing...'}</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${invoice.status==='received'?'border-blue-500/20 text-blue-400 bg-blue-500/10':invoice.status==='matched'?'border-green-500/20 text-green-400 bg-green-500/10':invoice.status==='flagged'?'border-red-500/20 text-red-400 bg-red-500/10':'border-[#1E1E1E] text-[#A1A1AA] bg-black'}`}>
              {invoice.status.toUpperCase()}
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
            {actions && (
              <>
                <button onClick={() => handleReject(invoice.id)} disabled={processingId === invoice.id} className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50">Reject</button>
                <button onClick={() => handleApprove(invoice)} disabled={processingId === invoice.id || invoice.is_duplicate} className="px-4 py-1.5 text-black font-bold text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #00F0FF, #0047FF)", border: "none" }}>
                  {processingId === invoice.id && <Loader2 size={14} className="animate-spin text-white"/>} Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Invoices <span className="text-xs ml-2 bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-mono border border-blue-500/20">AUTONOMOUS_MODE</span></h1>
          <p className="text-[#A1A1AA]">AI-powered immutable ledger and duplicate prevention</p>
        </div>
        
        <label className="px-5 py-2.5 text-black font-bold text-sm rounded-lg flex items-center gap-2 hover:opacity-90 cursor-pointer transition-opacity relative overflow-hidden group" style={{ background: "linear-gradient(to right, #00F0FF, #0047FF)", border: "none" }}>
          <div className="absolute top-0 left-[-100%] w-full h-full bg-white/20 skew-x-12 group-hover:animate-[sweep_1s_ease-in-out_infinite]" />
          {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>}
          {isUploading ? "Autonomous Engine Running..." : "Engage Autonomous Router"}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
        </label>
      </div>

      <div className="flex space-x-1 bg-[#0D0D0D] p-1 rounded-lg border border-[#1E1E1E] w-fit mb-6">
        {[
          { id: "pending", label: "Pending Approval", count: pendingInvoices.length },
          { id: "processing", label: "Processing (AI)", count: processingInvoices.length },
          { id: "archived", label: "Paid / Archived", count: archivedInvoices.length }
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
            : pendingInvoices.map(i => renderInvoiceCard(i, true))
          )}
          
          {activeTab === "processing" && (
            processingInvoices.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><CheckCircle2 className="mx-auto mb-2 opacity-50" size={32}/>No invoices currently processing.</div>
            : processingInvoices.map(i => renderInvoiceCard(i, false))
          )}

          {activeTab === "archived" && (
            archivedInvoices.length === 0 ? <div className="p-10 text-center text-[#A1A1AA] border border-[#1E1E1E] rounded-xl"><FileText className="mx-auto mb-2 opacity-50" size={32}/>No archived invoices.</div>
            : archivedInvoices.map(i => renderInvoiceCard(i, false))
          )}
        </div>
      )}
    </div>
  )
}
