"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ArrowLeft, Check, CheckCircle2, Clock, AlertTriangle, Receipt } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"
import toast from "react-hot-toast"

gsap.registerPlugin(useGSAP)

export default function RentCollectionPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [rentPayments, setRentPayments] = useState<any[]>([])
  const [showPay, setShowPay] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [payForm, setPayForm] = useState({ paid_method: 'upi', paid_ref: '', paid_date: '' })
  const [activeTab, setActiveTab] = useState('pending')

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
    partial: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }

  async function fetchData(org?: string) {
    const id = org || orgId
    const { data } = await supabase.from('rent_payments')
      .select('*, tenants(full_name), units(unit_number, properties(name))')
      .eq('organization_id', id).order('due_date', { ascending: false })
    
    // Automatically flag overdue
    const today = new Date().toISOString().split('T')[0]
    const updatedData = (data || []).map(r => {
      if (r.status === 'pending' && r.due_date < today) {
        return { ...r, status: 'overdue' }
      }
      return r
    })
    setRentPayments(updatedData)
  }

  useEffect(() => {
    async function init() {
      const org = await getOrCreateOrg()
      setOrgId(org)
      await fetchData(org)
      setLoading(false)
    }
    init()
  }, [])

  useGSAP(() => { 
    if (!loading) gsap.fromTo(".rent-row", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04 }) 
  }, { scope: containerRef, dependencies: [loading, rentPayments, activeTab] })

  const totalCollected = rentPayments.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount_due || 0), 0)
  const totalPending = rentPayments.filter(r => ['pending', 'overdue'].includes(r.status)).reduce((s, r) => s + Number(r.amount_due || 0), 0)

  const handlePay = async () => {
    if (!showPay) return
    setSaving(true)
    const toastId = toast.loading("Recording payment...")
    try {
      const { error } = await supabase.from('rent_payments').update({
        status: 'paid',
        amount_paid: showPay.amount_due,
        paid_date: payForm.paid_date || new Date().toISOString().split('T')[0],
        notes: `Method: ${payForm.paid_method}, Ref: ${payForm.paid_ref}`
      }).eq('id', showPay.id)
      
      if (error) throw error
      
      toast.success("Payment recorded & ledger updated!", { id: toastId })
      setShowPay(null)
      await fetchData()
    } catch (e: any) {
      toast.error(`Failed to record: ${e.message}`, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const filteredPayments = rentPayments.filter(r => {
    if (activeTab === 'pending') return ['pending', 'overdue'].includes(r.status)
    if (activeTab === 'paid') return r.status === 'paid'
    return true
  })

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {/* Hero */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "28px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex items-center gap-3 mb-3">
          <Link href="/app/finance" className="text-[#A1A1AA] hover:text-white transition-colors"><ArrowLeft size={18}/></Link>
          <p style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Finance Engine</p>
        </div>
        <div className="flex justify-between items-end">
          <h1 style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
            rent <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#10b981" }}>collection</em>
          </h1>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Pending Collection</span>
          <div className="text-3xl font-medium text-amber-400 mt-2">{formatCurrency(totalPending)}</div>
        </div>
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Total Collected</span>
          <div className="text-3xl font-medium text-green-400 mt-2">{formatCurrency(totalCollected)}</div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 text-sm rounded-lg border ${activeTab === 'pending' ? 'bg-[#1E1E1E] border-[#333] text-white' : 'bg-transparent border-transparent text-[#A1A1AA] hover:text-white'}`}>Pending & Overdue</button>
        <button onClick={() => setActiveTab('paid')} className={`px-4 py-2 text-sm rounded-lg border ${activeTab === 'paid' ? 'bg-[#1E1E1E] border-[#333] text-white' : 'bg-transparent border-transparent text-[#A1A1AA] hover:text-white'}`}>Paid</button>
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm rounded-lg border ${activeTab === 'all' ? 'bg-[#1E1E1E] border-[#333] text-white' : 'bg-transparent border-transparent text-[#A1A1AA] hover:text-white'}`}>All Bills</button>
      </div>

      {/* Table */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Tenant','Property','Due Date','Amount','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={6} className="p-4"><div className="h-8 bg-black animate-pulse rounded" /></td></tr>) :
                filteredPayments.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-[#A1A1AA]">
                    <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No rent bills found</p>
                  </td></tr>
                ) :
                filteredPayments.map(r => (
                  <tr key={r.id} className="rent-row border-b border-[#1E1E1E]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium">{r.tenants?.full_name || '—'}</td>
                    <td className="p-4 text-[#A1A1AA]">
                      {r.units?.properties?.name || '—'} <span className="text-white">#{r.units?.unit_number}</span>
                    </td>
                    <td className="p-4 text-[#A1A1AA] text-xs">
                      {new Date(r.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 text-white font-bold">{formatCurrency(r.amount_due)}</td>
                    <td className="p-4"><span className={`text-[10px] px-2 py-0.5 rounded border ${statusColors[r.status] || ''}`}>{r.status?.toUpperCase()}</span></td>
                    <td className="p-4">
                      {['pending', 'overdue'].includes(r.status) ? (
                        <button onClick={() => { setShowPay(r); setPayForm({ paid_method: 'upi', paid_ref: '', paid_date: new Date().toISOString().split('T')[0] }) }}
                          className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors flex items-center gap-1 font-medium">
                          <Receipt size={14}/> Record Payment
                        </button>
                      ) : (
                        <span className="text-xs text-[#A1A1AA]">Paid on {r.paid_date}</span>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark as Paid Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPay(null)}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-4">Record Rent Payment</h2>
            <div className="bg-black border border-[#1E1E1E] rounded-lg p-4 mb-5 text-sm">
              <div className="text-[#A1A1AA] text-xs mb-1">Tenant: <span className="text-white">{showPay.tenants?.full_name}</span></div>
              <div className="text-[#A1A1AA] text-xs mb-2">Due Date: <span className="text-white">{showPay.due_date}</span></div>
              <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-2 mt-2">
                <span className="text-[#A1A1AA]">Amount Due:</span>
                <span className="text-xl text-green-400 font-bold">{formatCurrency(showPay.amount_due)}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Method</label>
                  <select value={payForm.paid_method} onChange={e => setPayForm(f => ({...f, paid_method: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Date</label>
                  <input type="date" value={payForm.paid_date} onChange={e => setPayForm(f => ({...f, paid_date: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Reference (Optional)</label>
                <input type="text" value={payForm.paid_ref} onChange={e => setPayForm(f => ({...f, paid_ref: e.target.value}))} placeholder="Transaction reference" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <button onClick={handlePay} disabled={saving}
                className="w-full py-3 mt-2 bg-green-500 text-white font-medium rounded-full flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                {saving ? 'Processing...' : <><Check size={16}/>Confirm Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
