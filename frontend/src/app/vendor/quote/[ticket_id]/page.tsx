"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle2, AlertTriangle, Loader2, Wrench } from "lucide-react"

export default function VendorQuotePage() {
  const params = useParams()
  const ticketId = params.ticket_id as string
  
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quoteAmount, setQuoteAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await fetch(`/api/vendor/quote?ticket_id=${ticketId}`)
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setTicket(json.data)
        
        // If already quoted, just show success state
        if (json.data.status !== 'open' && json.data.status !== 'in_progress') {
          setSubmitted(true)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load ticket")
      } finally {
        setLoading(false)
      }
    }
    if (ticketId) fetchTicket()
  }, [ticketId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteAmount || isNaN(Number(quoteAmount))) return
    
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/vendor/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, actual_cost: quoteAmount })
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      
      setSubmitted(true)
    } catch (err: any) {
      alert(err.message || "Submission failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-[#FF3366]" size={40} />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="bg-[#0A0A0A] border border-[#1E1E1E] p-8 rounded-xl max-w-md w-full text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-[#A1A1AA]">This quote link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="bg-[#0A0A0A] border border-[#1E1E1E] border-t-4 border-t-green-500 p-8 rounded-xl max-w-md w-full text-center shadow-[0_0_50px_rgba(34,197,94,0.1)]">
          <CheckCircle2 className="text-green-500 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Quote Submitted</h1>
          <p className="text-[#A1A1AA] mb-6">Your quote has been sent to the property manager for approval. You will be notified once approved.</p>
          <div className="text-xs text-[#6B7280] font-mono tracking-wider">AETHERA SECURE PORTAL</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col p-6">
      <div className="max-w-xl w-full mx-auto mt-12 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[#FF3366]/10 border border-[#FF3366]/20 flex items-center justify-center">
            <Wrench className="text-[#FF3366]" size={20} />
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA] font-mono tracking-wider uppercase mb-1">Service Request</div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Category</div>
              <div className="font-medium capitalize">{ticket.category || 'General'}</div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Priority</div>
              <div className={`font-medium capitalize ${ticket.priority === 'urgent' ? 'text-red-400' : 'text-amber-400'}`}>
                {ticket.priority || 'Medium'}
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-xs text-[#6B7280] uppercase tracking-wider mb-2">Description</div>
            <div className="text-[#D4D4D8] leading-relaxed bg-[#111] p-4 rounded-lg border border-[#222]">
              {ticket.description || 'No description provided.'}
            </div>
          </div>
        </div>

        {/* Quote Form */}
        <div className="bg-[#0A0A0A] border border-[#1E1E1E] border-t-4 border-t-[#FF3366] rounded-xl p-6 shadow-[0_0_50px_rgba(255,51,102,0.05)]">
          <h2 className="text-xl font-bold mb-2">Submit Your Quote</h2>
          <p className="text-sm text-[#A1A1AA] mb-6">Enter your final estimated cost to resolve this issue.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-[#6B7280] tracking-wider mb-2">TOTAL QUOTE AMOUNT (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] font-bold">₹</span>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  className="w-full bg-[#111] border border-[#1E1E1E] rounded-lg pl-10 pr-4 py-4 text-xl font-bold text-white focus:outline-none focus:border-[#FF3366] focus:ring-1 focus:ring-[#FF3366] transition-all"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting || !quoteAmount}
              className="w-full bg-white text-black hover:bg-gray-200 font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={20} />}
              SUBMIT SECURE QUOTE
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center text-xs text-[#3F3F46] font-mono tracking-widest">
          POWERED BY AETHERA OP-INTEL
        </div>
      </div>
    </div>
  )
}
