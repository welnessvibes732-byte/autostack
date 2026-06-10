"use client"

import { useRef, useEffect, useState } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRouter } from "next/navigation"
import {
  IndianRupee, TrendingUp, TrendingDown, ArrowUpRight, Activity,
  Wallet, CreditCard, BarChart3, PieChart, ArrowRight, Building2,
  Receipt, Shield, FileText, Users
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import Link from "next/link"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts"

gsap.registerPlugin(useGSAP)

export default function FinanceDashboard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [kpis, setKpis] = useState({
    cashInBank: 0, totalRevenue: 0, totalExpenses: 0,
    realNOI: 0, accountsReceivable: 0, accountsPayable: 0,
    depositsHeld: 0, pendingCharges: 0
  })
  const [recentEntries, setRecentEntries] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [propertyPerf, setPropertyPerf] = useState<any[]>([])

  const formatCurrency = (val: number) => val ? `₹${Math.abs(val).toLocaleString('en-IN')}` : '₹0'
  const formatCurrencyL = (val: number) => {
    const abs = Math.abs(val)
    if (abs >= 10000000) return `₹${(val/10000000).toFixed(1)}Cr`
    if (abs >= 100000) return `₹${(val/100000).toFixed(1)}L`
    if (abs >= 1000) return `₹${(val/1000).toFixed(1)}K`
    return `₹${val.toLocaleString('en-IN')}`
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const org = await getOrCreateOrg()
        setOrgId(org)

        // Seed chart of accounts if needed
        try { await supabase.rpc('seed_chart_of_accounts', { org_id: org }) } catch(e) {}

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

        // Fetch trial balance for account balances
        const { data: trialBalance } = await supabase.rpc('get_trial_balance', { p_org_id: org })

        // Fetch income statement for this month
        const { data: incomeStmt } = await supabase.rpc('get_income_statement', {
          p_org_id: org, p_from: startOfMonth, p_to: endOfMonth
        })

        // Fetch real NOI
        const { data: noiResult } = await supabase.rpc('get_real_noi', {
          p_org_id: org, p_from: startOfMonth, p_to: endOfMonth
        })

        // Parse trial balance for KPIs
        const tb = trialBalance || []
        const getBalance = (code: string) => {
          const acc = tb.find((a: any) => a.account_code === code)
          return acc ? Number(acc.balance) : 0
        }

        // Revenue & expense from income statement
        const is = incomeStmt || []
        const totalRev = is.filter((a: any) => a.acct_type === 'revenue').reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
        const totalExp = is.filter((a: any) => a.acct_type === 'expense').reduce((s: number, a: any) => s + Number(a.amount || 0), 0)

        // Deposits held (sum of received deposits)
        const { data: deposits } = await supabase
          .from('security_deposits')
          .select('deposit_amount')
          .eq('organization_id', org)
          .eq('status', 'received')
        const depositsHeld = (deposits || []).reduce((s: number, d: any) => s + Number(d.deposit_amount || 0), 0)

        // Pending charges
        const { data: charges } = await supabase
          .from('tenant_charges')
          .select('amount')
          .eq('organization_id', org)
          .eq('status', 'pending')
        const pendingCharges = (charges || []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0)

        setKpis({
          cashInBank: getBalance('1000'),
          totalRevenue: totalRev,
          totalExpenses: totalExp,
          realNOI: Number(noiResult) || 0,
          accountsReceivable: getBalance('1100'),
          accountsPayable: Math.abs(getBalance('2000')),
          depositsHeld,
          pendingCharges
        })

        // Recent journal entries
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('*, ledger_lines(debit, credit, description, accounts(code, name))')
          .eq('organization_id', org)
          .order('created_at', { ascending: false })
          .limit(8)
        setRecentEntries(entries || [])

        // Monthly revenue/expense data (last 6 months)
        const months = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const from = d.toISOString().split('T')[0]
          const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
          months.push({
            label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
            from, to
          })
        }

        const monthlyResults = []
        for (const m of months) {
          const { data: is } = await supabase.rpc('get_income_statement', {
            p_org_id: org, p_from: m.from, p_to: m.to
          })
          const rev = (is || []).filter((a: any) => a.acct_type === 'revenue').reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
          const exp = (is || []).filter((a: any) => a.acct_type === 'expense').reduce((s: number, a: any) => s + Number(a.amount || 0), 0)
          monthlyResults.push({ name: m.label, Revenue: rev, Expenses: exp })
        }
        setMonthlyData(monthlyResults)

        // Property performance
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .eq('organization_id', org)

        if (properties && properties.length > 0) {
          const perfData = []
          for (const prop of properties.slice(0, 6)) {
            const { data: noi } = await supabase.rpc('get_real_noi', {
              p_org_id: org, p_from: startOfMonth, p_to: endOfMonth, p_property_id: prop.id
            })
            perfData.push({ name: prop.name, noi: Number(noi) || 0, id: prop.id })
          }
          setPropertyPerf(perfData)
        }

      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  useGSAP(() => {
    if (loading) return
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.fromTo(".fin-hero", { y: 40, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.1 })
      .fromTo(".fin-kpi", { y: 24, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.3)" }, "-=0.3")
      .fromTo(".fin-section", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.08 }, "-=0.2")

    document.querySelectorAll<HTMLElement>(".fin-kpi").forEach(card => {
      card.addEventListener("mousemove", (e: MouseEvent) => {
        const r = card.getBoundingClientRect()
        const x = (e.clientY - r.top - r.height/2) / r.height
        const y = (e.clientX - r.left - r.width/2) / r.width
        gsap.to(card, { rotateX: -x*6, rotateY: y*6, transformPerspective: 800, duration: 0.3, ease: "power2.out" })
      })
      card.addEventListener("mouseleave", () =>
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "elastic.out(1,0.5)" })
      )
    })
  }, { scope: containerRef, dependencies: [loading] })

  const getSourceBadge = (type: string) => {
    const map: Record<string, { label: string, color: string }> = {
      rent_payment: { label: 'Rent', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
      invoice_approved: { label: 'Invoice Approved', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      invoice_paid: { label: 'Invoice Paid', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
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
      <div className="fin-hero bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl" style={{ padding: "32px 36px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-60px", right: "-60px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <p className="fin-hero" style={{ fontSize: "11px", color: "#A1A1AA", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "12px", fontFamily: "'DM Mono',monospace" }}>
              Finance Engine
            </p>
            <h1 className="fin-hero" style={{ fontFamily: "'Poppins', system-ui, sans-serif", fontSize: "clamp(28px,3.5vw,48px)", fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, margin: 0, color: "#fff" }}>
              your <em style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: "italic", color: "#10b981" }}>finance</em>
              <br />engine
            </h1>
          </div>
          <div className="fin-hero flex gap-3 flex-wrap">
            <Link href="/app/finance/rent" className="px-4 py-2 bg-green-500/20 text-green-400 font-medium text-sm rounded-full flex items-center gap-2 hover:bg-green-500/30 border border-green-500/30 transition-colors"><Receipt size={16}/>Rent Collection</Link>
            <Link href="/app/finance/transactions" className="px-4 py-2 bg-white text-black font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"><Receipt size={16}/>Transactions</Link>
            <Link href="/app/finance/reports" className="px-4 py-2 bg-[#1E1E1E] text-white font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"><FileText size={16}/>Reports</Link>
            <Link href="/app/finance/deposits" className="px-4 py-2 bg-[#1E1E1E] text-white font-medium text-sm rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"><Shield size={16}/>Deposits</Link>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? [1,2,3,4].map(i => <div key={i} className="h-[130px] bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse"/>) : (
          <>
            {/* Cash in Bank */}
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-emerald-500/30 transition-colors" style={{ transformStyle: "preserve-3d" }}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Cash in Bank</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Wallet size={14} className="text-emerald-400"/></div>
              </div>
              <div className="text-3xl font-medium text-white mb-1">{formatCurrencyL(kpis.cashInBank)}</div>
              <div className="text-xs text-[#A1A1AA]">Current balance</div>
            </div>

            {/* Total Revenue */}
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-green-500/30 transition-colors" style={{ transformStyle: "preserve-3d" }}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Revenue (MTD)</span>
                <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"><TrendingUp size={14} className="text-green-400"/></div>
              </div>
              <div className="text-3xl font-medium text-green-400 mb-1">{formatCurrencyL(kpis.totalRevenue)}</div>
              <div className="text-xs text-[#A1A1AA]">All income this month</div>
            </div>

            {/* Total Expenses */}
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-red-500/30 transition-colors" style={{ transformStyle: "preserve-3d" }}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">Expenses (MTD)</span>
                <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"><TrendingDown size={14} className="text-red-400"/></div>
              </div>
              <div className="text-3xl font-medium text-red-400 mb-1">{formatCurrencyL(kpis.totalExpenses)}</div>
              <div className="text-xs text-[#A1A1AA]">All spending this month</div>
            </div>

            {/* Real NOI */}
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-5 hover:border-cyan-500/30 transition-colors relative overflow-hidden" style={{ transformStyle: "preserve-3d" }}>
              <div className="absolute -right-10 -top-10 w-24 h-24 bg-cyan-500/10 blur-xl rounded-full pointer-events-none" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Activity size={12} className="animate-pulse"/>Real NOI
                </span>
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center"><Activity size={14} className="text-cyan-400"/></div>
              </div>
              <div className="text-3xl font-bold text-white mb-1 relative z-10">{formatCurrencyL(kpis.realNOI)}</div>
              <div className="text-xs text-[#A1A1AA] relative z-10">From actual ledger</div>
            </div>
          </>
        )}
      </section>

      {/* Secondary KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? [1,2,3,4].map(i => <div key={i} className="h-[90px] bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse"/>) : (
          <>
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer" onClick={() => router.push('/app/finance/rent')}>
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">Receivables</span>
              <div className="text-2xl font-medium text-white mt-2">{formatCurrencyL(kpis.accountsReceivable)}</div>
            </div>
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer" onClick={() => router.push('/app/invoices')}>
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">Payables</span>
              <div className="text-2xl font-medium text-white mt-2">{formatCurrencyL(kpis.accountsPayable)}</div>
            </div>
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer" onClick={() => router.push('/app/finance/deposits')}>
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">Deposits Held</span>
              <div className="text-2xl font-medium text-white mt-2">{formatCurrencyL(kpis.depositsHeld)}</div>
            </div>
            <div className="fin-kpi bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer" onClick={() => router.push('/app/finance/charges')}>
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-widest">Pending Charges</span>
              <div className="text-2xl font-medium text-amber-400 mt-2">{formatCurrencyL(kpis.pendingCharges)}</div>
            </div>
          </>
        )}
      </section>

      {/* Charts + Recent Transactions */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue vs Expenses Chart */}
        <div className="fin-section lg:col-span-3 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white mb-6"><BarChart3 size={16} className="text-[#A1A1AA]" /> Revenue vs Expenses — Last 6 Months</div>
          <div className="h-[280px] w-full">
            {loading ? <div className="w-full h-full bg-black/50 animate-pulse rounded" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip
                    cursor={{fill: '#1E1E1E'}}
                    contentStyle={{backgroundColor: '#000', border: '1px solid #1E1E1E', borderRadius: '8px', fontSize: '12px'}}
                    labelStyle={{color: '#A1A1AA'}}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#A1A1AA' }} />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="fin-section lg:col-span-2 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl flex flex-col h-[360px]">
          <div className="p-5 border-b border-[#1E1E1E] flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-white"><Receipt size={16} className="text-[#A1A1AA]" /> Recent Entries</div>
            <Link href="/app/finance/transactions" className="text-xs text-[#A1A1AA] hover:text-white transition-colors flex items-center gap-1">View All <ArrowRight size={12}/></Link>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? [1,2,3].map(i => <div key={i} className="h-16 m-2 bg-black animate-pulse rounded border border-[#1E1E1E]" />) :
              recentEntries.length === 0 ? (
                <div className="p-8 text-center text-[#A1A1AA] text-sm">
                  <Receipt size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No transactions yet</p>
                  <p className="text-xs mt-1">Entries appear automatically when financial events happen</p>
                </div>
              ) :
              recentEntries.map((entry, i) => {
                const totalDebit = (entry.ledger_lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0), 0)
                return (
                  <div key={entry.id} className="p-3 border-b border-[#1E1E1E]/50 hover:bg-white/5 transition-colors rounded-lg mx-1">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{entry.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#A1A1AA] font-mono">{entry.entry_number}</span>
                          {getSourceBadge(entry.source_type)}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white pl-3">{formatCurrency(totalDebit)}</div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </section>

      {/* Property Performance */}
      {propertyPerf.length > 0 && (
        <section className="fin-section bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-white mb-6"><Building2 size={16} className="text-[#A1A1AA]" /> Property Performance — This Month</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {propertyPerf.map(p => (
              <div key={p.id} className="bg-black border border-[#1E1E1E] rounded-lg p-4 hover:border-white/20 transition-colors">
                <div className="text-sm text-white font-medium mb-2">{p.name}</div>
                <div className={`text-2xl font-bold ${p.noi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrencyL(p.noi)}
                </div>
                <div className="text-[10px] text-[#A1A1AA] mt-1">Net Operating Income</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
