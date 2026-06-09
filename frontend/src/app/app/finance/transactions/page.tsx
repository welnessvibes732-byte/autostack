"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import {
  Receipt, Search, Filter, ChevronDown, ChevronUp, Calendar,
  ArrowLeft
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"

gsap.registerPlugin(useGSAP)

const SOURCE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'rent_payment', label: 'Rent Payment' },
  { value: 'invoice_approved', label: 'Invoice Approved' },
  { value: 'invoice_paid', label: 'Invoice Paid' },
  { value: 'deposit_received', label: 'Deposit Received' },
  { value: 'deposit_returned', label: 'Deposit Returned' },
  { value: 'tenant_charge', label: 'Tenant Charge' },
]

export default function TransactionsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")

  const formatCurrency = (val: number) => val ? `₹${Number(val).toLocaleString('en-IN')}` : '—'

  useEffect(() => {
    async function fetchData() {
      try {
        const org = await getOrCreateOrg()
        let query = supabase
          .from('journal_entries')
          .select('*, ledger_lines(debit, credit, description, accounts(code, name, account_type))')
          .eq('organization_id', org)
          .order('created_at', { ascending: false })
          .limit(50)

        if (typeFilter) query = query.eq('source_type', typeFilter)
        if (search) query = query.ilike('description', `%${search}%`)

        const { data } = await query
        setEntries(data || [])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [typeFilter, search])

  useGSAP(() => {
    if (loading) return
    gsap.fromTo(".txn-row", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: "power2.out" })
  }, { scope: containerRef, dependencies: [loading, entries] })

  const getSourceBadge = (type: string) => {
    const map: Record<string, { label: string, color: string }> = {
      rent_payment: { label: 'Rent', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      invoice_approved: { label: 'Approved', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      invoice_paid: { label: 'Paid', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      deposit_received: { label: 'Deposit In', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      deposit_returned: { label: 'Deposit Out', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
      tenant_charge: { label: 'Charge', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    }
    const entry = map[type] || { label: type || 'Manual', color: 'bg-[#1E1E1E] text-[#A1A1AA] border-[#333]' }
    return <span className={`text-[10px] px-2 py-0.5 rounded border ${entry.color}`}>{entry.label}</span>
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {/* Hero */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "28px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex items-center gap-3 mb-3">
          <Link href="/app/finance" className="text-[#A1A1AA] hover:text-white transition-colors"><ArrowLeft size={18}/></Link>
          <p style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Finance Engine</p>
        </div>
        <h1 style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
          transactions <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#3b82f6" }}>ledger</em>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#A1A1AA] focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
        >
          {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Entries List */}
      <div className="flex flex-col gap-2">
        {loading ? [1,2,3,4,5].map(i => (
          <div key={i} className="h-[72px] bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse" />
        )) : entries.length === 0 ? (
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-12 text-center">
            <Receipt size={40} className="mx-auto mb-4 text-[#A1A1AA] opacity-30" />
            <p className="text-[#A1A1AA] text-sm">No transactions yet</p>
            <p className="text-[#A1A1AA] text-xs mt-1">Financial entries appear automatically when rent is paid, invoices are processed, or deposits are managed.</p>
          </div>
        ) : entries.map(entry => {
          const isOpen = expanded === entry.id
          const lines = entry.ledger_lines || []
          const totalDebit = lines.reduce((s: number, l: any) => s + Number(l.debit || 0), 0)
          const totalCredit = lines.reduce((s: number, l: any) => s + Number(l.credit || 0), 0)

          return (
            <div key={entry.id} className={`txn-row bg-[#0D0D0D] border rounded-xl transition-colors ${isOpen ? 'border-white/20' : 'border-[#1E1E1E] hover:border-white/10'}`}>
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : entry.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-black border border-[#1E1E1E] flex items-center justify-center flex-shrink-0">
                    <Receipt size={14} className="text-[#A1A1AA]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white font-medium truncate">{entry.description}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#A1A1AA] font-mono">{entry.entry_number}</span>
                      <span className="text-[10px] text-[#A1A1AA]">•</span>
                      <span className="text-[10px] text-[#A1A1AA]">{entry.entry_date}</span>
                      {getSourceBadge(entry.source_type)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{formatCurrency(totalDebit)}</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-[#A1A1AA]" /> : <ChevronDown size={16} className="text-[#A1A1AA]" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-[#1E1E1E] p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#A1A1AA] text-[10px] uppercase tracking-widest">
                        <th className="text-left pb-2 font-medium">Account</th>
                        <th className="text-right pb-2 font-medium">Debit</th>
                        <th className="text-right pb-2 font-medium">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line: any, i: number) => (
                        <tr key={i} className="border-t border-[#1E1E1E]/50">
                          <td className="py-2">
                            <span className="text-white">{line.accounts?.name || '—'}</span>
                            <span className="text-[#A1A1AA] text-xs ml-2">({line.accounts?.code})</span>
                          </td>
                          <td className="py-2 text-right">
                            {Number(line.debit) > 0 ? <span className="text-green-400">{formatCurrency(line.debit)}</span> : <span className="text-[#333]">—</span>}
                          </td>
                          <td className="py-2 text-right">
                            {Number(line.credit) > 0 ? <span className="text-red-400">{formatCurrency(line.credit)}</span> : <span className="text-[#333]">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[#1E1E1E] font-bold">
                        <td className="py-2 text-[#A1A1AA] text-xs uppercase">Total</td>
                        <td className="py-2 text-right text-green-400">{formatCurrency(totalDebit)}</td>
                        <td className="py-2 text-right text-red-400">{formatCurrency(totalCredit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {totalDebit === totalCredit && (
                    <div className="mt-2 text-[10px] text-green-400 flex items-center gap-1">✅ Balanced — Debits equal Credits</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
