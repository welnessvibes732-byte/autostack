"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { BookOpen, ArrowLeft, Plus, X, Check, Lock, ChevronDown, ChevronUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"

gsap.registerPlugin(useGSAP)

const TYPE_META: Record<string, { label: string, emoji: string, color: string }> = {
  asset: { label: 'Assets', emoji: '💰', color: 'text-emerald-400' },
  liability: { label: 'Liabilities', emoji: '📋', color: 'text-red-400' },
  equity: { label: 'Equity', emoji: '👤', color: 'text-blue-400' },
  revenue: { label: 'Revenue', emoji: '📈', color: 'text-green-400' },
  expense: { label: 'Expenses', emoji: '📉', color: 'text-amber-400' }
}

export default function AccountsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [accounts, setAccounts] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ code: '', name: '', account_type: 'expense', description: '' })

  const formatCurrency = (val: number) => {
    const abs = Math.abs(val)
    return `${val < 0 ? '-' : ''}₹${abs.toLocaleString('en-IN')}`
  }

  useEffect(() => {
    async function init() {
      const org = await getOrCreateOrg()
      setOrgId(org)
      try { await supabase.rpc('seed_chart_of_accounts', { org_id: org }) } catch(e) {}
      const [{ data: accts }, { data: tb }] = await Promise.all([
        supabase.from('accounts').select('*').eq('organization_id', org).order('code'),
        supabase.rpc('get_trial_balance', { p_org_id: org })
      ])
      setAccounts(accts || [])
      setBalances(tb || [])
      setLoading(false)
    }
    init()
  }, [])

  useGSAP(() => { if (!loading) gsap.fromTo(".acct-row", { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, stagger: 0.03 }) }, { scope: containerRef, dependencies: [loading] })

  const getBalance = (code: string) => {
    const b = balances.find((r: any) => r.account_code === code)
    return b ? Number(b.balance) : 0
  }

  const grouped = ['asset','liability','equity','revenue','expense'].map(type => ({
    type,
    accounts: accounts.filter(a => a.account_type === type)
  }))

  const handleCreate = async () => {
    if (!newForm.code || !newForm.name) return
    setSaving(true)
    await supabase.from('accounts').insert({
      organization_id: orgId, code: newForm.code, name: newForm.name,
      account_type: newForm.account_type, description: newForm.description, is_system: false
    })
    const [{ data: accts }, { data: tb }] = await Promise.all([
      supabase.from('accounts').select('*').eq('organization_id', orgId).order('code'),
      supabase.rpc('get_trial_balance', { p_org_id: orgId })
    ])
    setAccounts(accts || [])
    setBalances(tb || [])
    setShowNew(false)
    setNewForm({ code: '', name: '', account_type: 'expense', description: '' })
    setSaving(false)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "28px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex items-center gap-3 mb-3">
          <Link href="/app/finance" className="text-[#A1A1AA] hover:text-white transition-colors"><ArrowLeft size={18}/></Link>
          <p style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Finance Engine</p>
        </div>
        <div className="flex justify-between items-end">
          <h1 style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
            chart of <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#f59e0b" }}>accounts</em>
          </h1>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-white text-black font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"><Plus size={16}/>Add Account</button>
        </div>
      </div>

      {loading ? [1,2,3].map(i => <div key={i} className="h-[200px] bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse" />) :
        grouped.map(group => (
          <div key={group.type} className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1E1E] cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setCollapsed(c => ({ ...c, [group.type]: !c[group.type] }))}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_META[group.type].emoji}</span>
                <span className={`text-sm font-medium ${TYPE_META[group.type].color}`}>{TYPE_META[group.type].label}</span>
                <span className="text-xs text-[#A1A1AA] bg-black px-2 py-0.5 rounded">{group.accounts.length}</span>
              </div>
              {collapsed[group.type] ? <ChevronDown size={16} className="text-[#A1A1AA]" /> : <ChevronUp size={16} className="text-[#A1A1AA]" />}
            </div>
            {!collapsed[group.type] && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E1E1E]/50">
                    <th className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest px-4 py-2 font-medium">Code</th>
                    <th className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest px-4 py-2 font-medium">Name</th>
                    <th className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest px-4 py-2 font-medium hidden sm:table-cell">Description</th>
                    <th className="text-right text-[10px] text-[#A1A1AA] uppercase tracking-widest px-4 py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {group.accounts.map(acc => {
                    const bal = getBalance(acc.code)
                    return (
                      <tr key={acc.id} className="acct-row border-b border-[#1E1E1E]/30 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-[#A1A1AA]">{acc.code}</td>
                        <td className="px-4 py-3 text-white flex items-center gap-2">
                          {acc.name}
                          {acc.is_system && <Lock size={10} className="text-[#A1A1AA]" />}
                        </td>
                        <td className="px-4 py-3 text-[#A1A1AA] text-xs hidden sm:table-cell max-w-[300px] truncate">{acc.description || '—'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${bal > 0 ? 'text-green-400' : bal < 0 ? 'text-red-400' : 'text-[#A1A1AA]'}`}>
                          {bal !== 0 ? formatCurrency(bal) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))
      }

      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-white">Add Account</h2>
              <button onClick={() => setShowNew(false)} className="text-[#A1A1AA] hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Code</label>
                  <input type="text" value={newForm.code} onChange={e => setNewForm(f => ({...f, code: e.target.value}))} placeholder="5700" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
                </div>
                <div>
                  <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Type</label>
                  <select value={newForm.account_type} onChange={e => setNewForm(f => ({...f, account_type: e.target.value}))} className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30">
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Name</label>
                <input type="text" value={newForm.name} onChange={e => setNewForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Plumbing Expense" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="text-[11px] text-[#A1A1AA] uppercase tracking-widest block mb-1">Description</label>
                <input type="text" value={newForm.description} onChange={e => setNewForm(f => ({...f, description: e.target.value}))} placeholder="What this account tracks" className="w-full bg-black border border-[#1E1E1E] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/30" />
              </div>
              <button onClick={handleCreate} disabled={saving || !newForm.code || !newForm.name}
                className="w-full py-3 bg-white text-black font-medium rounded-full flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50">
                {saving ? 'Creating...' : <><Check size={16}/>Create Account</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
