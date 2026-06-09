"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { AlertTriangle, Plus, ArrowLeft, X, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"

gsap.registerPlugin(useGSAP)

const CHARGE_TYPES = ['maintenance','damage','utility','cam','penalty','other']

export default function ChargesPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [charges, setCharges] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [showPay, setShowPay] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ tenant_id: '', unit_id: '', charge_type: 'maintenance', description: '', amount: '' })
  const [payForm, setPayForm] = useState({ paid_method: 'upi', paid_ref: '', paid_date: '' })

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`
  const typeColors: Record<string, string> = {
    maintenance: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    damage: 'bg-red-500/10 text-red-400 border-red-500/20',
    utility: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cam: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    penalty: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    other: 'bg-[#1E1E1E] text-[#A1A1AA] border-[#333]'
  }
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    deducted_from_deposit: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    waived: 'bg-[#1E1E1E] text-[#A1A1AA] border-[#333]',
    disputed: 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  async function fetchData(org?: string) {
    const id = org || orgId
    const { data } = await supabase.from('tenant_charges')
      .select('*, tenants(full_name), units(unit_number)')
      .eq('organization_id', id).order('created_at', { ascending: false })
    setCharges(data || [])
  }

  useEffect(() => {
    async function init() {
      const org = await getOrCreateOrg()
      setOrgId(org)
      const [, t, u] = await Promise.all([
        fetchData(org),
        supabase.from('tenants').select('id, full_name').eq('organization_id', org),
        supabase.from('units').select('id, unit_number').eq('organization_id', org)
      ])
      setTenants(t.data || [])
      setUnits(u.data || [])
      setLoading(false)
    }
    init()
  }, [])

  useGSAP(() => { if (!loading) gsap.fromTo(".charge-row", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04 }) }, { scope: containerRef, dependencies: [loading, charges] })

  const outstanding = charges.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.amount || 0), 0)
  const collected = charges.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0)
  const waived = charges.filter(c => c.status === 'waived').reduce((s, c) => s + Number(c.amount || 0), 0)

  const handleCreate = async () => {
    if (!newForm.tenant_id || !newForm.amount || !newForm.description) return
    setSaving(true)
    const { data } = await supabase.from('tenant_charges').insert({
      organization_id: orgId, tenant_id: newForm.tenant_id, unit_id: newForm.unit_id || null,
      charge_type: newForm.charge_type, description: newForm.description, amount: Number(newForm.amount)
    }).select().single()
    if (data) {
      fetch('/api/emails/finance-event', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'tenant_charged', record_id: data.id, organization_id: orgId })
      }).catch(() => {})
    }
    setShowNew(false)
    setNewForm({ tenant_id: '', unit_id: '', charge_type: 'maintenance', description: '', amount: '' })
    await fetchData()
    setSaving(false)
  }

  const handlePay = async () => {
    if (!showPay) return
    setSaving(true)
    await supabase.from('tenant_charges').update({
      status: 'paid', paid_date: payForm.paid_date || new Date().toISOString().split('T')[0],
      paid_method: payForm.paid_method, paid_ref: payForm.paid_ref
    }).eq('id', showPay.id)
    setShowPay(null)
    await fetchData()
    setSaving(false)
  }

  const handleWaive = async (id: string) => {
    await supabase.from('tenant_charges').update({ status: 'waived' }).eq('id', id)
    await fetchData()
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {/* Hero */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "28px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex items-center gap-3 mb-3">
          <Link href="/app/finance" className="text-[#A1A1AA] hover:text-white transition-colors"><ArrowLeft size={18}/></Link>
          <p style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Finance Engine</p>
        </div>
        <div className="flex justify-between items-end">
          <h1 style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
            tenant <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#ef4444" }}>charges</em>
          </h1>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-white text-black font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"><Plus size={16}/>New Charge</button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Outstanding</span>
          <div className="text-3xl font-medium text-amber-400 mt-2">{formatCurrency(outstanding)}</div>
        </div>
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Collected</span>
          <div className="text-3xl font-medium text-green-400 mt-2">{formatCurrency(collected)}</div>
        </div>
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5">
          <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Waived</span>
          <div className="text-3xl font-medium text-[#A1A1AA] mt-2">{formatCurrency(waived)}</div>
        </div>
      </section>

      {/* Table */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E1E1E]">
                {['Tenant','Unit','Type','Description','Amount','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={7} className="p-4"><div className="h-8 bg-black animate-pulse rounded" /></td></tr>) :
                charges.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-[#A1A1AA]">
                    <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
                    <p>No charges recorded</p>
                  </td></tr>
                ) :
                charges.map(c => (
                  <tr key={c.id} className="charge-row border-b border-[#1E1E1E]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium">{c.tenants?.full_name || '—'}</td>
                    <td className="p-4 text-[#A1A1AA]">{c.units?.unit_number || '—'}</td>
                    <td className="p-4"><span className={`text-[10px] px-2 py-0.5 rounded border ${typeColors[c.charge_type] || ''}`}>{c.charge_type}</span></td>
                    <td className="p-4 text-white text-xs max-w-[200px] truncate">{c.description}</td>
                    <td className="p-4 text-white font-bold">{formatCurrency(c.amount)}</td>
                    <td className="p-4"><span className={`text-[10px] px-2 py-0.5 rounded border ${statusColors[c.status] || ''}`}>{c.status?.replace(/_/g, ' ')}</span></td>
                    <td className="p-4">
                      {c.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => { setShowPay(c); setPayForm({ paid_method: 'upi', paid_ref: '', paid_date: new Date().toISOString().split('T')[0] }) }}
                            className="text-[10px] px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors">
                            Mark Paid
                          </button>
                          <button onClick={() => handleWaive(c.id)}
                            className="text-[10px] px-2 py-1 bg-[#1E1E1E] text-[#A1A1AA] border border-[#333] rounded hover:bg-white/10 transition-colors">
                            Waive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* New Charge Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">New Tenant Charge</h2>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Unit</label>
                  <select value={newForm.unit_id} onChange={e => setNewForm(f => ({...f, unit_id: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="">Select unit...</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Type</label>
                  <select value={newForm.charge_type} onChange={e => setNewForm(f => ({...f, charge_type: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    {CHARGE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Description</label>
                <input type="text" value={newForm.description} onChange={e => setNewForm(f => ({...f, description: e.target.value}))} placeholder="e.g. AC compressor repair" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Amount</label>
                <input type="number" value={newForm.amount} onChange={e => setNewForm(f => ({...f, amount: e.target.value}))} placeholder="₹8,000" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <button onClick={handleCreate} disabled={saving || !newForm.tenant_id || !newForm.amount || !newForm.description}
                className="w-full py-3 bg-white text-black font-medium rounded-full flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50">
                {saving ? 'Creating...' : <><Check size={16}/>Create Charge</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showPay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPay(null)}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-4">Mark as Paid</h2>
            <div className="bg-black border border-[#1E1E1E] rounded-lg p-3 mb-4 text-sm">
              <span className="text-[#A1A1AA]">{showPay.description}</span> — <span className="text-white font-bold">{formatCurrency(showPay.amount)}</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Method</label>
                  <select value={payForm.paid_method} onChange={e => setPayForm(f => ({...f, paid_method: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    <option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Date</label>
                  <input type="date" value={payForm.paid_date} onChange={e => setPayForm(f => ({...f, paid_date: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Reference</label>
                <input type="text" value={payForm.paid_ref} onChange={e => setPayForm(f => ({...f, paid_ref: e.target.value}))} placeholder="Transaction reference" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <button onClick={handlePay} disabled={saving}
                className="w-full py-3 bg-green-500 text-white font-medium rounded-full flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : <><Check size={16}/>Confirm Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
