"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, Download } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"

gsap.registerPlugin(useGSAP)

type Tab = 'trial_balance' | 'income_statement' | 'balance_sheet'

export default function ReportsPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [tab, setTab] = useState<Tab>('trial_balance')
  const [trialBalance, setTrialBalance] = useState<any[]>([])
  const [incomeStmt, setIncomeStmt] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [propertyFilter, setPropertyFilter] = useState('')

  const now = new Date()
  const [fromDate, setFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
  const [toDate, setToDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])

  const formatCurrency = (val: number) => `₹${Math.abs(Number(val || 0)).toLocaleString('en-IN')}`

  useEffect(() => {
    async function init() {
      const org = await getOrCreateOrg()
      setOrgId(org)
      const { data: props } = await supabase.from('properties').select('id, name').eq('organization_id', org)
      setProperties(props || [])
      await fetchReport(org, tab)
    }
    init()
  }, [])

  useEffect(() => {
    if (orgId) fetchReport(orgId, tab)
  }, [tab, fromDate, toDate, propertyFilter])

  async function fetchReport(org: string, currentTab: Tab) {
    setLoading(true)
    try {
      if (currentTab === 'trial_balance') {
        const { data } = await supabase.rpc('get_trial_balance', { p_org_id: org })
        setTrialBalance(data || [])
      }
      if (currentTab === 'income_statement' || currentTab === 'balance_sheet') {
        const params: any = { p_org_id: org, p_from: fromDate, p_to: toDate }
        if (propertyFilter) params.p_property_id = propertyFilter
        const { data } = await supabase.rpc('get_income_statement', params)
        setIncomeStmt(data || [])
        // Also get trial balance for balance sheet
        if (currentTab === 'balance_sheet') {
          const { data: tb } = await supabase.rpc('get_trial_balance', { p_org_id: org })
          setTrialBalance(tb || [])
        }
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useGSAP(() => {
    if (!loading) gsap.fromTo(".report-row", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.2, stagger: 0.02 })
  }, { scope: containerRef, dependencies: [loading, tab, trialBalance, incomeStmt] })

  // Trial Balance calculations
  const tbTotalDebit = trialBalance.reduce((s, r) => s + Number(r.total_debit || 0), 0)
  const tbTotalCredit = trialBalance.reduce((s, r) => s + Number(r.total_credit || 0), 0)
  const isBalanced = Math.abs(tbTotalDebit - tbTotalCredit) < 0.01

  // Income Statement calculations
  const revenueAccounts = incomeStmt.filter((a: any) => a.acct_type === 'revenue')
  const expenseAccounts = incomeStmt.filter((a: any) => a.acct_type === 'expense')
  const totalRevenue = revenueAccounts.reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
  const totalExpenses = expenseAccounts.reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
  const netIncome = totalRevenue - totalExpenses

  // Balance sheet from trial balance
  const bsAssets = trialBalance.filter((a: any) => a.acct_type === 'asset')
  const bsLiabilities = trialBalance.filter((a: any) => a.acct_type === 'liability')
  const bsEquity = trialBalance.filter((a: any) => a.acct_type === 'equity')
  const totalAssets = bsAssets.reduce((s: number, a: any) => s + Number(a.balance || 0), 0)
  const totalLiabilities = bsLiabilities.reduce((s: number, a: any) => s + Math.abs(Number(a.balance || 0)), 0)
  const totalEquity = bsEquity.reduce((s: number, a: any) => s + Math.abs(Number(a.balance || 0)), 0)

  const tabs: { key: Tab, label: string }[] = [
    { key: 'trial_balance', label: 'Trial Balance' },
    { key: 'income_statement', label: 'Income Statement' },
    { key: 'balance_sheet', label: 'Balance Sheet' }
  ]

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {/* Hero */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "28px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex items-center gap-3 mb-3">
          <Link href="/app/finance" className="text-[#A1A1AA] hover:text-white transition-colors"><ArrowLeft size={18}/></Link>
          <p style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>Finance Engine</p>
        </div>
        <h1 style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
          financial <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#6366f1" }}>reports</em>
        </h1>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-[#0D0D0D] border border-[#1E1E1E] rounded-full p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${tab === t.key ? 'bg-white text-black font-medium' : 'text-[#A1A1AA] hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab !== 'trial_balance' && (
            <>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30" />
              <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
                className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30">
                <option value="">All Properties</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Trial Balance */}
      {tab === 'trial_balance' && (
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
          {isBalanced && !loading && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/5 border-b border-green-500/10">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-xs text-green-400 font-medium">Books are balanced — Total Debits = Total Credits</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E1E]">
                  <th className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">Code</th>
                  <th className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">Account</th>
                  <th className="text-left text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">Type</th>
                  <th className="text-right text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">Debit</th>
                  <th className="text-right text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">Credit</th>
                  <th className="text-right text-[10px] text-[#A1A1AA] uppercase tracking-widest p-4 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? [1,2,3,4].map(i => <tr key={i}><td colSpan={6} className="p-4"><div className="h-6 bg-black animate-pulse rounded" /></td></tr>) :
                  trialBalance.length === 0 ? (
                    <tr><td colSpan={6} className="p-12 text-center text-[#A1A1AA]">No accounting data yet</td></tr>
                  ) :
                  trialBalance.map((row, i) => (
                    <tr key={i} className={`report-row border-b border-[#1E1E1E]/30 ${i % 2 === 0 ? 'bg-black/30' : ''}`}>
                      <td className="p-4 font-mono text-xs text-[#A1A1AA]">{row.account_code}</td>
                      <td className="p-4 text-white">{row.account_name}</td>
                      <td className="p-4 text-[#A1A1AA] text-xs capitalize">{row.acct_type}</td>
                      <td className="p-4 text-right text-green-400">{Number(row.total_debit) > 0 ? formatCurrency(row.total_debit) : '—'}</td>
                      <td className="p-4 text-right text-red-400">{Number(row.total_credit) > 0 ? formatCurrency(row.total_credit) : '—'}</td>
                      <td className={`p-4 text-right font-bold ${Number(row.balance) >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(row.balance)}</td>
                    </tr>
                  ))
                }
              </tbody>
              {!loading && trialBalance.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#1E1E1E] font-bold">
                    <td className="p-4" colSpan={3}><span className="text-[#A1A1AA] text-xs uppercase">Grand Total</span></td>
                    <td className="p-4 text-right text-green-400">{formatCurrency(tbTotalDebit)}</td>
                    <td className="p-4 text-right text-red-400">{formatCurrency(tbTotalCredit)}</td>
                    <td className="p-4 text-right">
                      {isBalanced ? <CheckCircle2 size={16} className="text-green-400 inline" /> : <AlertTriangle size={16} className="text-red-400 inline" />}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Income Statement */}
      {tab === 'income_statement' && (
        <div className="space-y-4">
          {/* Revenue */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1E1E1E] flex items-center gap-2">
              <span className="text-green-400 text-sm font-medium">📈 Revenue</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {loading ? <tr><td className="p-4"><div className="h-6 bg-black animate-pulse rounded" /></td></tr> :
                  revenueAccounts.length === 0 ? <tr><td className="p-8 text-center text-[#A1A1AA]">No revenue entries this period</td></tr> :
                  revenueAccounts.map((a: any, i: number) => (
                    <tr key={i} className={`report-row border-b border-[#1E1E1E]/30 ${i % 2 === 0 ? 'bg-black/30' : ''}`}>
                      <td className="p-4 text-white">{a.account_name}</td>
                      <td className="p-4 text-right text-green-400 font-bold">{formatCurrency(a.amount)}</td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1E1E1E] font-bold bg-green-500/5">
                  <td className="p-4 text-green-400">Total Revenue</td>
                  <td className="p-4 text-right text-green-400">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1E1E1E] flex items-center gap-2">
              <span className="text-red-400 text-sm font-medium">📉 Expenses</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {loading ? <tr><td className="p-4"><div className="h-6 bg-black animate-pulse rounded" /></td></tr> :
                  expenseAccounts.length === 0 ? <tr><td className="p-8 text-center text-[#A1A1AA]">No expense entries this period</td></tr> :
                  expenseAccounts.map((a: any, i: number) => (
                    <tr key={i} className={`report-row border-b border-[#1E1E1E]/30 ${i % 2 === 0 ? 'bg-black/30' : ''}`}>
                      <td className="p-4 text-white">{a.account_name}</td>
                      <td className="p-4 text-right text-red-400 font-bold">{formatCurrency(a.amount)}</td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1E1E1E] font-bold bg-red-500/5">
                  <td className="p-4 text-red-400">Total Expenses</td>
                  <td className="p-4 text-right text-red-400">{formatCurrency(totalExpenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Net Income */}
          <div className={`bg-[#0D0D0D] border rounded-xl p-6 flex justify-between items-center ${netIncome >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <div>
              <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Net Operating Income</span>
              <div className={`text-3xl font-bold mt-1 ${netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {netIncome < 0 ? '-' : ''}{formatCurrency(netIncome)}
              </div>
            </div>
            <div className="text-right text-xs text-[#A1A1AA]">
              <div>Revenue: {formatCurrency(totalRevenue)}</div>
              <div>Expenses: {formatCurrency(totalExpenses)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {tab === 'balance_sheet' && (
        <div className="space-y-4">
          {/* Assets */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1E1E1E]"><span className="text-emerald-400 text-sm font-medium">💰 Assets</span></div>
            <table className="w-full text-sm">
              <tbody>
                {loading ? <tr><td className="p-4"><div className="h-6 bg-black animate-pulse rounded" /></td></tr> :
                  bsAssets.map((a: any, i: number) => (
                    <tr key={i} className={`report-row border-b border-[#1E1E1E]/30 ${i % 2 === 0 ? 'bg-black/30' : ''}`}>
                      <td className="p-4 font-mono text-xs text-[#A1A1AA]">{a.account_code}</td>
                      <td className="p-4 text-white">{a.account_name}</td>
                      <td className="p-4 text-right text-emerald-400 font-bold">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1E1E1E] font-bold bg-emerald-500/5">
                  <td className="p-4" colSpan={2}><span className="text-emerald-400">Total Assets</span></td>
                  <td className="p-4 text-right text-emerald-400">{formatCurrency(totalAssets)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Liabilities */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1E1E1E]"><span className="text-red-400 text-sm font-medium">📋 Liabilities</span></div>
            <table className="w-full text-sm">
              <tbody>
                {loading ? <tr><td className="p-4"><div className="h-6 bg-black animate-pulse rounded" /></td></tr> :
                  bsLiabilities.map((a: any, i: number) => (
                    <tr key={i} className={`report-row border-b border-[#1E1E1E]/30 ${i % 2 === 0 ? 'bg-black/30' : ''}`}>
                      <td className="p-4 font-mono text-xs text-[#A1A1AA]">{a.account_code}</td>
                      <td className="p-4 text-white">{a.account_name}</td>
                      <td className="p-4 text-right text-red-400 font-bold">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1E1E1E] font-bold bg-red-500/5">
                  <td className="p-4" colSpan={2}><span className="text-red-400">Total Liabilities</span></td>
                  <td className="p-4 text-right text-red-400">{formatCurrency(totalLiabilities)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Equity */}
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#1E1E1E]"><span className="text-blue-400 text-sm font-medium">👤 Equity</span></div>
            <table className="w-full text-sm">
              <tbody>
                {loading ? <tr><td className="p-4"><div className="h-6 bg-black animate-pulse rounded" /></td></tr> :
                  bsEquity.map((a: any, i: number) => (
                    <tr key={i} className={`report-row border-b border-[#1E1E1E]/30 ${i % 2 === 0 ? 'bg-black/30' : ''}`}>
                      <td className="p-4 font-mono text-xs text-[#A1A1AA]">{a.account_code}</td>
                      <td className="p-4 text-white">{a.account_name}</td>
                      <td className="p-4 text-right text-blue-400 font-bold">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr className="border-t border-[#1E1E1E] font-bold bg-blue-500/5">
                  <td className="p-4" colSpan={2}><span className="text-blue-400">Total Equity</span></td>
                  <td className="p-4 text-right text-blue-400">{formatCurrency(totalEquity)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Accounting Equation */}
          <div className={`bg-[#0D0D0D] border rounded-xl p-6 ${Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <div className="text-[11px] text-[#A1A1AA] uppercase tracking-widest mb-3">Accounting Equation</div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <div className="text-xs text-emerald-400 mb-1">Assets</div>
                <div className="text-xl font-bold text-white">{formatCurrency(totalAssets)}</div>
              </div>
              <div className="text-2xl text-[#A1A1AA]">=</div>
              <div className="text-center">
                <div className="text-xs text-red-400 mb-1">Liabilities</div>
                <div className="text-xl font-bold text-white">{formatCurrency(totalLiabilities)}</div>
              </div>
              <div className="text-2xl text-[#A1A1AA]">+</div>
              <div className="text-center">
                <div className="text-xs text-blue-400 mb-1">Equity</div>
                <div className="text-xl font-bold text-white">{formatCurrency(totalEquity)}</div>
              </div>
              <div className="ml-4">
                {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ?
                  <CheckCircle2 size={20} className="text-green-400" /> :
                  <AlertTriangle size={20} className="text-red-400" />
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
