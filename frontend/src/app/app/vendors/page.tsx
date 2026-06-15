"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { getOrCreateOrg } from "@/lib/getOrCreateOrg"
import { 
  Truck, Plus, Star, Shield, AlertTriangle, Search, Loader2, X, CheckCircle2, ShieldOff
} from "lucide-react"
import toast from "react-hot-toast"

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newVendor, setNewVendor] = useState({
    name: "",
    phone: "",
    email: "",
    whatsapp_number: "",
    categoryString: "", // comma separated
    address: "",
    gstin: "",
    bank_account: "",
    bank_ifsc: "",
  })

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      setLoading(true)
      const org = await getOrCreateOrg()
      setOrgId(org)
      await fetchVendors(org)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async (org: string) => {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('organization_id', org)
      .order('is_preferred', { ascending: false })
      .order('rating', { ascending: false })
    
    if (data) setVendors(data)
  }

  const handleCreateVendor = async () => {

    if (!newVendor.name || !newVendor.phone || !newVendor.email) {
      return toast.error("Name, Phone, and Email are required")
    }
    
    setIsSubmitting(true)
    try {
      // Parse comma separated strings into arrays
      const categories = newVendor.categoryString.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)

      const { error } = await supabase.from('vendors').insert({
        organization_id: orgId,
        name: newVendor.name,
        phone: newVendor.phone,
        email: newVendor.email,
        whatsapp_number: newVendor.whatsapp_number || null,
        category: categories.length > 0 ? categories : ['general'],
        address: newVendor.address || null,
        gstin: newVendor.gstin || null,
        bank_account: newVendor.bank_account || null,
        bank_ifsc: newVendor.bank_ifsc || null,
        is_preferred: false,
        is_blacklisted: false,
        rating: 5.0
      })

      if (error) throw error
      
      toast.success("Vendor added successfully")
      setShowCreateModal(false)
      setNewVendor({ name: "", phone: "", email: "", whatsapp_number: "", categoryString: "", address: "", gstin: "", bank_account: "", bank_ifsc: "" })
      fetchVendors(orgId)
    } catch (e: any) {
      toast.error(e.message || "Failed to add vendor")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStatus = async (vendorId: string, field: 'is_preferred' | 'is_blacklisted', currentValue: boolean) => {

    try {
      // If blacklisting, remove preferred. If preferring, remove blacklisted.
      const updates: any = { [field]: !currentValue }
      if (field === 'is_blacklisted' && !currentValue) updates.is_preferred = false
      if (field === 'is_preferred' && !currentValue) updates.is_blacklisted = false

      await supabase.from('vendors').update(updates).eq('id', vendorId)
      fetchVendors(orgId)
      toast.success("Vendor status updated")
    } catch (e) {
      toast.error("Update failed")
    }
  }

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.category && v.category.some((c: string) => c.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  const activeCount = vendors.filter(v => !v.is_blacklisted).length
  const preferredCount = vendors.filter(v => v.is_preferred).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Vendors</h1>
          <p className="text-[#A1A1AA]">Manage contractors, service areas, and ratings</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={16}/>
            <input 
              type="text" 
              placeholder="Search vendors..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-white font-medium text-sm rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
            <Plus size={16}/> Add Vendor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Truck size={20}/></div>
            <div className="text-sm text-[#A1A1AA]">Active Vendors</div>
          </div>
          <div className="text-3xl font-bold text-white">{activeCount}</div>
        </div>
        
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><Shield size={20}/></div>
            <div className="text-sm text-[#A1A1AA]">Preferred Providers</div>
          </div>
          <div className="text-3xl font-bold text-white">{preferredCount}</div>
        </div>
        
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 text-green-400 rounded-lg"><CheckCircle2 size={20}/></div>
            <div className="text-sm text-[#A1A1AA]">Auto-Assign Status</div>
          </div>
          <div className="text-lg font-bold text-white mt-1">Ready</div>
          <div className="text-xs text-[#A1A1AA] mt-1">AI has enough data to route jobs</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#A1A1AA]" size={32}/></div>
      ) : filteredVendors.length === 0 ? (
        <div className="text-center p-12 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl">
          <Truck className="mx-auto mb-3 opacity-30" size={48}/>
          <h3 className="text-lg font-medium text-white mb-1">No vendors found</h3>
          <p className="text-[#A1A1AA] text-sm">Add contractors to allow the AI to auto-assign maintenance tickets.</p>
        </div>
      ) : (
        <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E1E1E] bg-black/40 text-xs uppercase text-[#A1A1AA]">
                  <th className="p-4 font-medium">Vendor</th>
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">Categories & Pincodes</th>
                  <th className="p-4 font-medium">Rating</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E] text-sm">
                {filteredVendors.map(vendor => (
                  <tr key={vendor.id} className={`hover:bg-white/[0.02] transition-colors ${vendor.is_blacklisted ? 'opacity-50 grayscale' : ''}`}>
                    <td className="p-4 align-top">
                      <div className="font-medium text-white flex items-center gap-2">
                        {vendor.name}
                        {vendor.is_preferred && <span title="Preferred Vendor"><Shield size={14} className="text-purple-400" /></span>}
                      </div>
                      <div className="text-xs text-[#A1A1AA] mt-1 line-clamp-1 max-w-[200px]">ID: {vendor.id.slice(0,8)}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="text-white">{vendor.phone}</div>
                      <div className="text-[#A1A1AA] text-xs">{vendor.email}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {vendor.category?.map((c: string) => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E1E1E] border border-white/10 text-[#A1A1AA] capitalize">{c}</span>
                        ))}
                      </div>
                      {vendor.address && (
                        <div className="text-[10px] text-[#A1A1AA] max-w-[200px] truncate" title={vendor.address}>
                          📍 {vendor.address}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-1 bg-black border border-[#1E1E1E] px-2 py-1 rounded w-fit">
                        <Star size={14} className="text-amber-400 fill-amber-400"/>
                        <span className="text-white font-medium">{vendor.rating ? Number(vendor.rating).toFixed(1) : '5.0'}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      {vendor.is_blacklisted ? (
                        <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full">Blacklisted</span>
                      ) : vendor.is_preferred ? (
                        <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-full">Preferred</span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">Active</span>
                      )}
                    </td>
                    <td className="p-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => toggleStatus(vendor.id, 'is_preferred', vendor.is_preferred)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${vendor.is_preferred ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/10' : 'border-[#1E1E1E] text-[#A1A1AA] hover:text-white hover:border-white/30'}`}
                          title="Toggle Preferred"
                        >
                          <Shield size={14} className="mr-1 inline"/> {vendor.is_preferred ? 'Remove Pref' : 'Make Pref'}
                        </button>
                        <button 
                          onClick={() => toggleStatus(vendor.id, 'is_blacklisted', vendor.is_blacklisted)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${vendor.is_blacklisted ? 'border-[#1E1E1E] text-white hover:bg-white/10' : 'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}
                        >
                          {vendor.is_blacklisted ? 'Restore' : 'Blacklist'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Add New Vendor</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-[#A1A1AA] hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Company / Contractor Name *</label>
                <input value={newVendor.name} onChange={e=>setNewVendor({...newVendor, name: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="e.g. Apex Plumbing" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Phone *</label>
                  <input type="tel" value={newVendor.phone} onChange={e=>setNewVendor({...newVendor, phone: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="+1 234 567 890" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Email *</label>
                  <input type="email" value={newVendor.email} onChange={e=>setNewVendor({...newVendor, email: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30" placeholder="vendor@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">WhatsApp Number</label>
                <input type="tel" value={newVendor.whatsapp_number} onChange={e=>setNewVendor({...newVendor, whatsapp_number: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 text-sm" placeholder="e.g. +91 98765 43210" />
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Categories (Comma separated)</label>
                <input value={newVendor.categoryString} onChange={e=>setNewVendor({...newVendor, categoryString: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 text-sm" placeholder="e.g. plumbing, electrical, hvac" />
                <p className="text-[10px] text-[#A1A1AA] mt-1">Used by AI to route specific types of tickets.</p>
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">Address</label>
                <input value={newVendor.address} onChange={e=>setNewVendor({...newVendor, address: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 text-sm" placeholder="Business address" />
              </div>

              <div>
                <label className="block text-sm text-[#A1A1AA] mb-1">GSTIN</label>
                <input value={newVendor.gstin} onChange={e=>setNewVendor({...newVendor, gstin: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 text-sm" placeholder="e.g. 22AAAAA0000A1Z5" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">Bank Account</label>
                  <input value={newVendor.bank_account} onChange={e=>setNewVendor({...newVendor, bank_account: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 text-sm" placeholder="Account number" />
                </div>
                <div>
                  <label className="block text-sm text-[#A1A1AA] mb-1">IFSC Code</label>
                  <input value={newVendor.bank_ifsc} onChange={e=>setNewVendor({...newVendor, bank_ifsc: e.target.value})} className="w-full bg-black border border-[#1E1E1E] rounded-lg p-2.5 text-white outline-none focus:border-white/30 text-sm" placeholder="e.g. SBIN0001234" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-[#1E1E1E] hover:bg-white/20 text-white rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleCreateVendor} disabled={isSubmitting} className="flex-1 px-4 py-2 text-white font-medium text-sm rounded-lg flex justify-center items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(to right, #ec4899, #f97316)", boxShadow: "0 4px 16px rgba(255,86,86,0.25)", border: "none" }}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : "Add Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
