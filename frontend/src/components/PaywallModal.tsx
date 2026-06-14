"use client"
import { useState, useEffect, useRef } from "react"
import { X, Lock, Sparkles, Calendar, Clock, Loader2, CheckCircle2 } from "lucide-react"
import gsap from "gsap"
import { countryCodes } from "@/lib/countryCodes"

export default function PaywallModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    date: "",
    time: "",
  })

  useEffect(() => {
    const handleOpen = (e: any) => {
      setSource(e.detail?.source || "Premium Feature")
      setIsOpen(true)
      setSuccess(false)
    }
    window.addEventListener("showPaywall", handleOpen)
    return () => window.removeEventListener("showPaywall", handleOpen)
  }, [])

  useEffect(() => {
    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      gsap.fromTo(modalRef.current, 
        { opacity: 0, scale: 0.9, y: 20 }, 
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.2)" }
      )
    }
  }, [isOpen])

  const close = () => {
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { opacity: 0, scale: 0.95, y: -10, duration: 0.2 })
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, onComplete: () => setIsOpen(false) })
    } else {
      setIsOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const fullPhone = `${formData.countryCode} ${formData.phone}`
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    try {
      const res = await fetch("/api/emails/book-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          fullPhone,
          timezone: userTimezone,
          source
        })
      })
      if (!res.ok) throw new Error("Failed to send request")
      setSuccess(true)
    } catch (err) {
      alert("Failed to request call. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="p-6 relative z-10 border-b border-[#1E1E1E] flex justify-between items-center bg-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Lock size={18} color="#fff" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Enterprise Automation</h2>
              <p className="text-blue-400 text-xs font-medium tracking-wide uppercase flex items-center gap-1">
                <Sparkles size={10} /> Subscription Required
              </p>
            </div>
          </div>
          <button onClick={close} className="text-[#A1A1AA] hover:text-white transition-colors p-1 bg-black rounded-lg border border-[#1E1E1E]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 relative z-10">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Call Requested!</h3>
              <p className="text-[#A1A1AA] text-sm">
                Thank you! The founder will be in touch shortly to confirm your booking for {formData.date} at {formData.time}.
              </p>
              <button onClick={close} className="mt-6 w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-[#A1A1AA] text-sm mb-6 leading-relaxed">
                The <strong className="text-white">{source}</strong> feature is powered by N8N advanced automation. To unlock these capabilities, please book a demo call with our founder.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5">Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#111] border border-[#1E1E1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5">Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-[#111] border border-[#1E1E1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="john@example.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5">Phone Number</label>
                  <div className="flex gap-2">
                    <select value={formData.countryCode} onChange={e => setFormData({...formData, countryCode: e.target.value})} className="w-[110px] bg-[#111] border border-[#1E1E1E] rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors">
                      {countryCodes?.map(c => <option key={c.name + c.code} value={c.code}>{c.flag} {c.code}</option>)}
                    </select>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 bg-[#111] border border-[#1E1E1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="123 456 7890" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Calendar size={12}/> Date</label>
                    <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-[#111] border border-[#1E1E1E] rounded-xl px-3 py-2.5 text-sm text-[#A1A1AA] focus:text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock size={12}/> Time (Your Local)</label>
                    <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-[#111] border border-[#1E1E1E] rounded-xl px-3 py-2.5 text-sm text-[#A1A1AA] focus:text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-500/50">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={16}/> Book Call to Unlock</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
