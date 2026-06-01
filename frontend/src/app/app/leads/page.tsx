"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import { Plus, LayoutGrid, List, X, Loader2, CheckCircle2, UserPlus, FileText, Activity, MessageSquare } from "lucide-react"
import toast from "react-hot-toast"

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [sidebarTab, setSidebarTab] = useState("terms")
  
  const [dealTerms, setDealTerms] = useState({
    final_rent: "", deposit_amount: "", move_in_date: "", lease_length: "12", concessions: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create Lead Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLead, setNewLead] = useState({
    full_name: "", email: "", phone: "", inquiry_type: "residential", budget_max: "", preferred_area: ""
  })

  const COLUMNS = [
    { id: "new", title: "New", color: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    { id: "qualified", title: "Qualified", color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" },
    { id: "viewing_scheduled", title: "Viewing", color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
    { id: "negotiating", title: "Negotiating", color: "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400" },
    { id: "pending_signoff", title: "Sign-off", color: "bg-pink-500/10 border-pink-500/20 text-pink-400" },
    { id: "closed_won", title: "Won", color: "bg-green-500/10 border-green-500/20 text-green-400" }
  ]

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
      
      await fetchLeads(org)
      
      const channelId = `leads-page-${Math.random()}`
      const channel = supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `organization_id=eq.${org}` }, () => fetchLeads(org))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeads = async (org: string) => {
    const { data } = await supabase.from('leads').select('*').eq('organization_id', org).order('created_at', { ascending: false })
    if (data) setLeads(data)
  }

  const handleCreateLead = async () => {
    if (!newLead.full_name) return toast.error("Full Name is required")
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('leads').insert({
        organization_id: orgId,
        full_name: newLead.full_name,
        email: newLead.email,
        phone: newLead.phone,
        inquiry_type: newLead.inquiry_type,
        budget_max: newLead.budget_max ? Number(newLead.budget_max) : 0,
        preferred_area: newLead.preferred_area,
        stage: 'new',
        lead_score: 0
      })
      if (error) throw error
      
      // Ping our fast Next.js route to send the Gmail alert
      fetch('/api/webhooks/new-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      }).catch(err => console.error("Email alert failed:", err))

      toast.success("Lead created successfully. AI Qualification sent.")
      setShowCreateModal(false)
      setNewLead({ full_name: "", email: "", phone: "", inquiry_type: "residential", budget_max: "", preferred_area: "" })
      fetchLeads(orgId)
    } catch (e: any) {
      toast.error("Failed to create lead")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("lead_id", id)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData("lead_id")
    if (!leadId) return
    
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: columnId } : l))
    await supabase.from('leads').update({ stage: columnId }).eq('id', leadId).eq('organization_id', orgId)
  }

  const handleOpenLead = (lead: any) => {
    setSelectedLead(lead)
    setDealTerms({
      final_rent: lead.budget_max?.toString() || "",
      deposit_amount: "", move_in_date: lead.move_in_timeline || "",
      lease_length: "12", concessions: ""
    })
    setSidebarTab("terms")
  }

  const handleRequestSignoff = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/emails/deal-signoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: "request_signoff", lead_id: selectedLead.id, lead_name: selectedLead.full_name,
          organization_id: orgId, requested_by: currentUser?.id, terms: dealTerms
        })
      })
      if (!res.ok) throw new Error("Webhook failed")
      
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, stage: 'pending_signoff', notes: JSON.stringify(dealTerms) } : l))
      setSelectedLead({...selectedLead, stage: 'pending_signoff'})
      toast.success("Sign-off requested")
    } catch (e: any) {
      toast.error("Request failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveDeal = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/emails/deal-signoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: "approved", lead_id: selectedLead.id, organization_id: orgId, approved_by: currentUser?.id })
      })
      if (!res.ok) throw new Error("Webhook failed")
      
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, stage: 'closed_won' } : l))
      setSelectedLead(null)
      toast.success("Deal approved")
    } catch (e: any) {
      toast.error("Approval failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (val: number) => val ? `₹${val.toLocaleString('en-IN')}` : '-'
  const getDaysInStage = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Leads</h1>
          <p className="text-[#A1A1AA]">Manage pipeline and deal sign-offs</p>
        </div>
        
        <div className="flex gap-3">
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-1 flex">
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-[#1E1E1E] text-white' : 'text-[#A1A1AA] hover:text-white'}`}><LayoutGrid size={16}/></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[#1E1E1E] text-white' : 'text-[#A1A1AA] hover:text-white'}`}><List size={16}/></button>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
            <Plus size={16}/> Add Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="min-w-[300px] flex-1 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {COLUMNS.map(col => {
            const columnLeads = leads.filter(l => 
              l.stage === col.id || 
              (col.id === 'closed_won' && l.stage === 'closed_lost')
            )
            return (
              <div 
                key={col.id} 
                className="min-w-[300px] flex-1 bg-[#0D0D0D]/50 border border-[#1E1E1E] rounded-xl flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="p-4 border-b border-[#1E1E1E] flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${col.color}`}>
                    {col.title}
                  </span>
                  <span className="text-sm font-medium text-[#A1A1AA] bg-black px-2 py-0.5 rounded-full border border-[#1E1E1E]">
                    {columnLeads.length}
                  </span>
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {columnLeads.map(lead => (
                    <div 
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => handleOpenLead(lead)}
                      className="bg-black border border-[#1E1E1E] hover:border-white/20 p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-white truncate max-w-[150px]">{lead.full_name}</div>
                        <div className={`text-xs px-2 py-0.5 rounded border ${
                          lead.lead_score >= 70 ? 'border-green-500/20 text-green-400 bg-green-500/10' : 
                          lead.lead_score > 0 ? 'border-amber-500/20 text-amber-400 bg-amber-500/10' :
                          'border-blue-500/20 text-blue-400 bg-blue-500/10'
                        }`}>
                          {lead.lead_score > 0 ? lead.lead_score : "AI Pending"}
                        </div>
                      </div>
                      
                      <div className="text-xs text-[#A1A1AA] mb-3 flex items-center gap-2 truncate">
                        <span className="capitalize">{lead.inquiry_type}</span> • {lead.preferred_area}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div className="font-semibold text-white bg-[#1E1E1E] px-2 py-1 rounded">
                          {formatCurrency(lead.budget_max)}
                        </div>
                        <div className="text-[#A1A1AA] flex items-center gap-1">
                          <Activity size={12}/> {getDaysInStage(lead.created_at)}d
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sidebar Overlay */}
      {selectedLead && (
        <div className="absolute top-0 right-0 h-full w-[450px] bg-black border-l border-[#1E1E1E] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-5 border-b border-[#1E1E1E] flex justify-between items-start bg-[#0D0D0D]">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedLead.full_name}</h2>
              <div className="text-sm text-[#A1A1AA] mt-1 flex items-center gap-2">
                <span className="capitalize">{selectedLead.stage.replace('_', ' ')}</span> • 
                Score: <span className="text-white font-medium">{selectedLead.lead_score}</span>
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="p-2 text-[#A1A1AA] hover:text-white rounded-full hover:bg-[#1E1E1E] transition-colors"><X size={18}/></button>
          </div>
          
          <div className="flex border-b border-[#1E1E1E] bg-[#0D0D0D]">
            {[
              { id: "context", label: "Context", icon: FileText },
              { id: "terms", label: "Deal Terms", icon: CheckCircle2 },
              { id: "activity", label: "Activity", icon: Activity }
            ].map(t => (
              <button 
                key={t.id} onClick={() => setSidebarTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${sidebarTab === t.id ? 'border-white text-white' : 'border-transparent text-[#A1A1AA] hover:text-white hover:bg-[#1E1E1E]/50'}`}
              >
                <t.icon size={14}/> {t.label}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 bg-black">
            {sidebarTab === "context" && (
              <div className="space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[#A1A1AA] text-xs uppercase">Email</div>
                    <div className="text-white break-all">{selectedLead.email || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[#A1A1AA] text-xs uppercase">Phone</div>
                    <div className="text-white">{selectedLead.phone || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[#A1A1AA] text-xs uppercase">Budget</div>
                    <div className="text-white">{formatCurrency(selectedLead.budget_min)} - {formatCurrency(selectedLead.budget_max)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[#A1A1AA] text-xs uppercase">Property Type</div>
                    <div className="text-white capitalize">{selectedLead.property_type}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-[#A1A1AA] text-xs uppercase">Notes</div>
                  <div className="bg-[#0D0D0D] border border-[#1E1E1E] p-3 rounded-lg text-white whitespace-pre-wrap leading-relaxed">
                    {selectedLead.notes || 'No notes available.'}
                  </div>
                </div>
              </div>
            )}
            
            {sidebarTab === "terms" && (
              <div className="space-y-5">
                <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-5">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2"><CheckCircle2 size={16} className="text-purple-400"/> Proposed Deal Terms</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-1">Final Agreed Rent (₹)</label>
                      <input 
                        type="number" value={dealTerms.final_rent} onChange={e => setDealTerms({...dealTerms, final_rent: e.target.value})}
                        disabled={selectedLead.stage === 'pending_signoff'}
                        className="w-full bg-black border border-[#1E1E1E] rounded p-2 text-white text-sm focus:border-white/30 outline-none disabled:opacity-50" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#A1A1AA] mb-1">Deposit</label>
                        <input 
                          type="number" value={dealTerms.deposit_amount} onChange={e => setDealTerms({...dealTerms, deposit_amount: e.target.value})}
                          disabled={selectedLead.stage === 'pending_signoff'}
                          className="w-full bg-black border border-[#1E1E1E] rounded p-2 text-white text-sm outline-none disabled:opacity-50" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#A1A1AA] mb-1">Length (Months)</label>
                        <select 
                          value={dealTerms.lease_length} onChange={e => setDealTerms({...dealTerms, lease_length: e.target.value})}
                          disabled={selectedLead.stage === 'pending_signoff'}
                          className="w-full bg-black border border-[#1E1E1E] rounded p-2 text-white text-sm outline-none disabled:opacity-50"
                        >
                          <option value="6">6 Months</option>
                          <option value="11">11 Months</option>
                          <option value="12">12 Months</option>
                          <option value="24">24 Months</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-1">Move-in Date</label>
                      <input 
                        type="date" value={dealTerms.move_in_date} onChange={e => setDealTerms({...dealTerms, move_in_date: e.target.value})}
                        disabled={selectedLead.stage === 'pending_signoff'}
                        className="w-full bg-black border border-[#1E1E1E] rounded p-2 text-white text-sm outline-none disabled:opacity-50" 
                        style={{colorScheme: 'dark'}}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#A1A1AA] mb-1">Concessions / Notes</label>
                      <textarea 
                        value={dealTerms.concessions} onChange={e => setDealTerms({...dealTerms, concessions: e.target.value})}
                        disabled={selectedLead.stage === 'pending_signoff'}
                        rows={3} className="w-full bg-black border border-[#1E1E1E] rounded p-2 text-white text-sm outline-none disabled:opacity-50 resize-none" 
                        placeholder="e.g. 1 month free rent"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-5 border-t border-[#1E1E1E]">
                    {selectedLead.stage === 'negotiating' && (
                      <div className="space-y-3">
                        <button 
                          onClick={async () => {
                            const msg = prompt("Enter follow-up note:");
                            if (!msg) return;
                            const newNotes = selectedLead.notes ? `${selectedLead.notes}\n[${new Date().toLocaleDateString()}] Follow-up: ${msg}` : `[${new Date().toLocaleDateString()}] Follow-up: ${msg}`;
                            await supabase.from('leads').update({ notes: newNotes, last_contact_at: new Date().toISOString() }).eq('id', selectedLead.id);
                            setSelectedLead({...selectedLead, notes: newNotes});
                            toast.success("Follow-up logged successfully");
                          }}
                          className="w-full text-white py-2.5 rounded text-sm font-medium transition-opacity flex items-center justify-center gap-2 hover:opacity-90 bg-[#1E1E1E]"
                        >
                          <MessageSquare size={14}/> Log Follow-up
                        </button>
                        <button 
                          onClick={handleRequestSignoff} disabled={isSubmitting}
                          className="w-full text-white py-2.5 rounded text-sm font-medium transition-opacity flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                          style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}
                        >
                          {isSubmitting && <Loader2 size={16} className="animate-spin"/>} Request Manager Sign-Off
                        </button>
                      </div>
                    )}
                    
                    {selectedLead.stage === 'pending_signoff' && (
                      <div className="space-y-3">
                        <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded text-sm flex items-start gap-2">
                          <MessageSquare size={16} className="mt-0.5 shrink-0"/>
                          This deal is awaiting manager approval. Terms are locked.
                        </div>
                        <button 
                          onClick={handleApproveDeal} disabled={isSubmitting}
                          className="w-full text-white py-2.5 rounded text-sm font-medium transition-opacity flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                          style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}
                        >
                          {isSubmitting && <Loader2 size={16} className="animate-spin"/>} Approve Deal (Manager Only)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {sidebarTab === "activity" && (
              <div className="text-center p-10 text-[#A1A1AA] text-sm">
                <Activity className="mx-auto mb-3 opacity-50" size={32}/>
                Activity feed coming soon.
              </div>
            )}
          </div>
        </div>
      )}
      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Add New Lead</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#A1A1AA] hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Full Name *</label>
                <input value={newLead.full_name} onChange={e=>setNewLead({...newLead, full_name: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Email</label>
                  <input type="email" value={newLead.email} onChange={e=>setNewLead({...newLead, email: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Phone</label>
                  <input type="tel" value={newLead.phone} onChange={e=>setNewLead({...newLead, phone: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="+1 234 567 890" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Inquiry Type</label>
                  <select value={newLead.inquiry_type} onChange={e=>setNewLead({...newLead, inquiry_type: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30">
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Max Budget</label>
                  <input type="number" value={newLead.budget_max} onChange={e=>setNewLead({...newLead, budget_max: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. 50000" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Preferred Area</label>
                <input value={newLead.preferred_area} onChange={e=>setNewLead({...newLead, preferred_area: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. Downtown" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleCreateLead} disabled={isSubmitting} className="flex-1 px-4 py-2 text-white font-medium text-sm rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : "Create Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
