"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Shield, Plus, ArrowLeft, X, Check, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"

gsap.registerPlugin(useGSAP)

export default function DepositsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [deposits, setDeposits] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [showReturn, setShowReturn] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ tenant_id: '', unit_id: '', deposit_amount: '', received_date: '', received_method: 'upi', received_ref: '', status: 'received' })
  const [returnForm, setReturnForm] = useState({ deduction_amount: '0', deduction_reason: '', refund_method: 'upi', refund_ref: '', refund_date: '' })

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    received: 'bg-green-500/10 text-green-400 border-green-500/20',
    partially_refunded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    fully_refunded: 'bg-[#1E1E1E] text-[#A1A1AA] border-[#333]',
    forfeited: 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  async function fetchData(org?: string) {
    const id = org || orgId
    const { data } = await supabase.from('security_deposits')
      .select('*, tenants(full_name, email), units(unit_number), properties(name)')
      .eq('organization_id', id).order('created_at', { ascending: false })
    setDeposits(data || [])
  }

  useEffect(() => {
    async function init() {
      const org = await getOrCreateOrg()
      setOrgId(org)
      const [, t, u] = await Promise.all([
        fetchData(org),
        supabase.from('tenants').select('id, full_name').eq('organization_id', org),
        supabase.from('units').select('id, unit_number, property_id, properties(id, name)').eq('organization_id', org)
      ])
      setTenants(t.data || [])
      setUnits(u.data || [])
      setLoading(false)
    }
    init()
  }, [])

  useGSAP(() => { if (!loading) gsap.fromTo(".dep-row", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04 }) }, { scope: containerRef, dependencies: [loading, deposits] })

  const totalHeld = deposits.filter(d => d.status === 'received').reduce((s, d) => s + Number(d.deposit_amount || 0), 0)
  const totalPending = deposits.filter(d => d.status === 'pending').reduce((s, d) => s + Number(d.deposit_amount || 0), 0)
  const totalReturned = deposits.filter(d => ['fully_refunded','partially_refunded'].includes(d.status)).reduce((s, d) => s + Number(d.refund_amount || 0), 0)

  const handleCreate = async () => {
    if (!newForm.tenant_id || !newForm.deposit_amount) return
    setSaving(true)
    const unit = units.find(u => u.id === newForm.unit_id)
    await supabase.from('security_deposits').insert({
      organization_id: orgId, tenant_id: newForm.tenant_id, unit_id: newForm.unit_id || null,
      property_id: unit?.property_id || null, deposit_amount: Number(newForm.deposit_amount),
      received_date: newForm.received_date || null, received_method: newForm.received_method,
      received_ref: newForm.received_ref || null, status: newForm.status
    })
    // Send email notification
    fetch('/api/emails/finance-event', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'deposit_received', record_id: 'new', organization_id: orgId })
    }).catch(() => {})
    setShowNew(false)
    setNewForm({ tenant_id: '', unit_id: '', deposit_amount: '', received_date: '', received_method: 'upi', received_ref: '', status: 'received' })
    await fetchData()
    setSaving(false)
  }

  const handleReturn = async () => {
    if (!showReturn) return
    setSaving(true)
    const deduction = Number(returnForm.deduction_amount) || 0
    const refund = Number(showReturn.deposit_amount) - deduction
    const status = deduction > 0 ? 'partially_refunded' : 'fully_refunded'
    await supabase.from('security_deposits').update({
      status, deduction_amount: deduction, deduction_reason: returnForm.deduction_reason,
      refund_amount: refund, refund_date: returnForm.refund_date || new Date().toISOString().split('T')[0],
      refund_method: returnForm.refund_method, refund_ref: returnForm.refund_ref
    }).eq('id', showReturn.id)
    fetch('/api/emails/finance-event', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'deposit_returned', record_id: showReturn.id, organization_id: orgId })
    }).catch(() => {})
    setShowReturn(null)
    setReturnForm({ deduction_amount: '0', deduction_reason: '', refund_method: 'upi', refund_ref: '', refund_date: '' })
    await fetchData()
    setSaving(false)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {/* Hero */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "28px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex items-center gap-3 mb-3">
          <Link href="/app/finance" className="text-[#A1A1AA] hover:text-white transition-colors"><ArrowLeft size={18}/></Link>
          <p style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Finance Engine</p>
        </div>
        <div className="flex justify-between items-end">
          <h1 style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
            security <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#a855f7" }}>deposits</em>
          </h1>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-white text-black font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"><Plus size={16}/>New Deposit</button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Currently Held</span>
          <div className="text-3xl font-medium text-white mt-2">{formatCurrency(totalHeld)}</div>
        </div>
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Pending Collection</span>
          <div className="text-3xl font-medium text-amber-400 mt-2">{formatCurrency(totalPending)}</div>
        </div>
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Total Returned</span>
          <div className="text-3xl font-medium text-blue-400 mt-2">{formatCurrency(totalReturned)}</div>
        </div>
      </section>

      {/* Table */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Tenant','Unit','Amount','Status','Received','Method','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={7} className="p-4"><div className="h-8 bg-black animate-pulse rounded" /></td></tr>) :
                deposits.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-[#A1A1AA]">
                    <Shield size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No deposits recorded yet</p>
                  </td></tr>
                ) :
                deposits.map(d => (
                  <tr key={d.id} className="dep-row border-b border-[#1E1E1E]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium">{d.tenants?.full_name || '—'}</td>
                    <td className="p-4 text-[#A1A1AA]">{d.units?.unit_number || '—'}</td>
                    <td className="p-4 text-white font-bold">{formatCurrency(d.deposit_amount)}</td>
                    <td className="p-4"><span className={`text-[10px] px-2 py-0.5 rounded border ${statusColors[d.status] || ''}`}>{d.status?.replace(/_/g, ' ')}</span></td>
                    <td className="p-4 text-[#A1A1AA] text-xs">{d.received_date || '—'}</td>
                    <td className="p-4 text-[#A1A1AA] text-xs uppercase">{d.received_method || '—'}</td>
                    <td className="p-4">
                      {d.status === 'received' && (
                        <button onClick={() => { setShowReturn(d); setReturnForm({ deduction_amount: '0', deduction_reason: '', refund_method: 'upi', refund_ref: '', refund_date: new Date().toISOString().split('T')[0] }) }}
                          className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors flex items-center gap-1">
                          <RefreshCw size={12}/>Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* New Deposit Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">New Security Deposit</h2>
              <button onClick={() => setShowNew(false)} className="text-[#A1A1AA] hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Tenant</label>
                <select value={newForm.tenant_id} onChange={e => setNewForm(f => ({...f, tenant_id: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                  <option value="">Select tenant...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Unit</label>
                <select value={newForm.unit_id} onChange={e => setNewForm(f => ({...f, unit_id: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                  <option value="">Select unit...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} — {(u as any).properties?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Deposit Amount</label>
                <input type="number" value={newForm.deposit_amount} onChange={e => setNewForm(f => ({...f, deposit_amount: e.target.value}))} placeholder="₹100,000" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Received Date</label>
                  <input type="date" value={newForm.received_date} onChange={e => setNewForm(f => ({...f, received_date: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Method</label>
                  <select value={newForm.received_method} onChange={e => setNewForm(f => ({...f, received_method: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Reference (UPI ID / Cheque No.)</label>
                <input type="text" value={newForm.received_ref} onChange={e => setNewForm(f => ({...f, received_ref: e.target.value}))} placeholder="e.g. nitesh@upi" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <button onClick={handleCreate} disabled={saving || !newForm.tenant_id || !newForm.deposit_amount}
                className="w-full py-3 bg-white text-black font-medium rounded-full flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : <><Check size={16}/>Record Deposit</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Deposit Modal */}
      {showReturn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowReturn(null)}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-white">Return Deposit</h2>
              <button onClick={() => setShowReturn(null)} className="text-[#A1A1AA] hover:text-white"><X size={20}/></button>
            </div>
            <div className="bg-black border border-[#1E1E1E] rounded-lg p-4 mb-4">
              <div className="text-xs text-[#A1A1AA]">Tenant: <span className="text-white">{showReturn.tenants?.full_name}</span></div>
              <div className="text-xs text-[#A1A1AA] mt-1">Original Deposit: <span className="text-white font-bold">{formatCurrency(showReturn.deposit_amount)}</span></div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Deduction Amount (for damages)</label>
                <input type="number" value={returnForm.deduction_amount} onChange={e => setReturnForm(f => ({...f, deduction_amount: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              {Number(returnForm.deduction_amount) > 0 && (
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Reason for Deduction</label>
                  <input type="text" value={returnForm.deduction_reason} onChange={e => setReturnForm(f => ({...f, deduction_reason: e.target.value}))} placeholder="e.g. Wall damage in bedroom" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
              )}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                <div className="text-xs text-emerald-400">Refund Amount (auto-calculated)</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(Number(showReturn.deposit_amount) - Number(returnForm.deduction_amount || 0))}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Refund Method</label>
                  <select value={returnForm.refund_method} onChange={e => setReturnForm(f => ({...f, refund_method: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Refund Date</label>
                  <input type="date" value={returnForm.refund_date} onChange={e => setReturnForm(f => ({...f, refund_date: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Reference</label>
                <input type="text" value={returnForm.refund_ref} onChange={e => setReturnForm(f => ({...f, refund_ref: e.target.value}))} placeholder="Transaction reference" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <button onClick={handleReturn} disabled={saving}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-full flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? 'Processing...' : <><RefreshCw size={16}/>Confirm Refund</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
