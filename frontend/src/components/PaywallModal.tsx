"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { X, ChevronLeft, ChevronRight, Clock, Globe, User, Mail, Phone, Sparkles, CheckCircle2, Loader2, Calendar as CalendarIcon, ArrowRight, Search, Shield } from "lucide-react"
import gsap from "gsap"
import { countryCodes } from "@/lib/countryCodes"

/* ───────────── helpers ───────────── */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

function isSunday(d: Date) { return d.getDay() === 0 }
function isPast(d: Date) {
  const today = new Date(); today.setHours(0,0,0,0)
  return d < today
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}
function formatDateDisplay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

/* generate calendar grid for a month — start on Monday */
function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  // getDay: 0=Sun … 6=Sat  →  Mon-start offset
  let startOffset = first.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const days: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

/* IST slots from 09:00 to 20:00 (your availability in India) */
const IST_SLOTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00"
]

function istToLocal(istTime: string, selectedDate: Date): string {
  // IST is UTC+5:30
  const [h, m] = istTime.split(":").map(Number)
  const istDate = new Date(selectedDate)
  istDate.setUTCHours(h - 5, m - 30, 0, 0)
  return istDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
}

function localToIST(istTime: string): string {
  const [h, m] = istTime.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2,"0")} ${period} IST`
}

/* ───────────── component ───────────── */
export default function PaywallModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState("")
  const [step, setStep] = useState(1) // 1=calendar, 2=time, 3=contact, 4=done
  const [loading, setLoading] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Calendar state
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Time state
  const [selectedTime, setSelectedTime] = useState("")

  // Contact state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [countrySearch, setCountrySearch] = useState("")
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [phone, setPhone] = useState("")

  const userTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countryCodes.filter(c => c.code !== "undefined")
    const q = countrySearch.toLowerCase()
    return countryCodes.filter(c =>
      c.code !== "undefined" &&
      (c.name.toLowerCase().includes(q) || c.code.includes(q))
    )
  }, [countrySearch])

  const selectedCountry = useMemo(() =>
    countryCodes.find(c => c.code === countryCode) || countryCodes[0],
  [countryCode])

  /* ── event listener ── */
  useEffect(() => {
    const handleOpen = (e: any) => {
      setSource(e.detail?.source || "Premium Feature")
      setStep(1)
      setSelectedDate(null)
      setSelectedTime("")
      setName("")
      setEmail("")
      setPhone("")
      setCountryCode("+91")
      setCountrySearch("")
      setIsOpen(true)
    }
    window.addEventListener("showPaywall", handleOpen)
    return () => window.removeEventListener("showPaywall", handleOpen)
  }, [])

  /* ── open animation ── */
  useEffect(() => {
    if (isOpen && modalRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      gsap.fromTo(modalRef.current,
        { opacity: 0, scale: 0.92, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }
      )
    }
  }, [isOpen])

  /* ── step transition animation ── */
  useEffect(() => {
    if (contentRef.current && isOpen) {
      gsap.fromTo(contentRef.current,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }
      )
    }
  }, [step, isOpen])

  const close = () => {
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { opacity: 0, scale: 0.95, y: -10, duration: 0.2 })
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, onComplete: () => setIsOpen(false) })
    } else {
      setIsOpen(false)
    }
  }

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth())

  const handleDateSelect = (d: Date) => {
    if (isSunday(d) || isPast(d)) return
    setSelectedDate(d)
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !name || !email || !phone) return
    setLoading(true)
    const fullPhone = `${countryCode} ${phone}`
    try {
      const res = await fetch("/api/emails/book-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, fullPhone,
          date: selectedDate.toISOString().split("T")[0],
          time: `${selectedTime} IST`,
          timezone: userTimezone,
          source,
          countryCode
        })
      })
      if (!res.ok) throw new Error("Failed")
      setStep(4)
    } catch {
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const stepLabels = ["Select Date", "Select Time", "Your Details", "Confirmed"]

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}>
      <div ref={modalRef} className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10" style={{ background: "linear-gradient(180deg, #0C0C0C 0%, #111111 100%)", boxShadow: "0 0 80px rgba(99,102,241,0.12), 0 25px 50px rgba(0,0,0,0.6)" }}>
        {/* glow orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full blur-[80px]" style={{ background: "rgba(99,102,241,0.25)" }} />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full blur-[80px]" style={{ background: "rgba(236,72,153,0.2)" }} />

        {/* ─── header ─── */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-white leading-tight">Book a Demo Call</h2>
              <p className="text-[11px] text-indigo-400 font-medium tracking-wide uppercase">
                Unlock {source}
              </p>
            </div>
          </div>
          <button onClick={close} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* ─── step indicator ─── */}
        {step < 4 && (
          <div className="relative z-10 flex items-center gap-2 px-6 py-3 border-b border-white/5">
            {stepLabels.slice(0, 3).map((label, i) => {
              const num = i + 1
              const isActive = step === num
              const isDone = step > num
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]" : "bg-white/5 text-zinc-600 border border-white/10"}`}>
                    {isDone ? <CheckCircle2 size={12} /> : num}
                  </div>
                  <span className={`text-[11px] font-medium transition-colors hidden sm:block ${isActive ? "text-white" : isDone ? "text-emerald-400" : "text-zinc-600"}`}>
                    {label}
                  </span>
                  {i < 2 && <div className={`flex-1 h-px transition-colors ${isDone ? "bg-emerald-500/50" : "bg-white/5"}`} />}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── content ─── */}
        <div ref={contentRef} className="relative z-10 px-6 py-5" style={{ minHeight: step === 4 ? "200px" : "360px" }}>

          {/* ═══════ STEP 1: CALENDAR ═══════ */}
          {step === 1 && (
            <div>
              {/* timezone badge */}
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <Globe size={13} className="text-indigo-400" />
                <span className="text-[12px] text-zinc-400">Your timezone: <strong className="text-white">{userTimezone}</strong></span>
              </div>

              {/* month nav */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} disabled={!canGoPrev} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
                <h3 className="text-[15px] font-bold text-white tracking-tight">{MONTH_NAMES[viewMonth]} {viewYear}</h3>
                <button onClick={nextMonth} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_LABELS.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* day grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const disabled = isSunday(day) || isPast(day)
                  const isToday = sameDay(day, today)
                  const isSelected = selectedDate ? sameDay(day, selectedDate) : false
                  const isSun = isSunday(day)

                  return (
                    <button
                      key={day.toISOString()}
                      disabled={disabled}
                      onClick={() => handleDateSelect(day)}
                      className={`
                        relative h-9 rounded-lg text-[13px] font-medium transition-all duration-200
                        ${disabled
                          ? isSun
                            ? "text-red-900/40 cursor-not-allowed line-through"
                            : "text-zinc-800 cursor-not-allowed"
                          : isSelected
                            ? "text-white font-bold"
                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                        }
                      `}
                      style={isSelected ? {
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        boxShadow: "0 0 16px rgba(99,102,241,0.4)"
                      } : undefined}
                    >
                      {day.getDate()}
                      {isToday && !isSelected && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* sunday note */}
              <p className="mt-3 text-center text-[11px] text-zinc-600">
                <span className="text-red-500/60">●</span> Sundays are unavailable
              </p>

              {/* next button */}
              <button
                disabled={!selectedDate}
                onClick={() => setStep(2)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  background: selectedDate ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.05)",
                  boxShadow: selectedDate ? "0 4px 20px rgba(99,102,241,0.3)" : "none"
                }}
              >
                {selectedDate ? (
                  <>
                    {formatDateDisplay(selectedDate)}
                    <ArrowRight size={16} />
                  </>
                ) : "Select a date to continue"}
              </button>
            </div>
          )}

          {/* ═══════ STEP 2: TIME SLOTS ═══════ */}
          {step === 2 && selectedDate && (
            <div>
              <button onClick={() => setStep(1)} className="mb-3 flex items-center gap-1 text-[12px] text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft size={14} /> Change date
              </button>

              <div className="mb-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={14} className="text-indigo-400" />
                  <span className="text-[13px] text-white font-medium">{formatDateDisplay(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <Globe size={11} /> {userTimezone}
                </div>
              </div>

              <p className="text-[12px] text-zinc-500 mb-3 flex items-center gap-1">
                <Clock size={12} /> Showing times in your local timezone
              </p>

              <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                {IST_SLOTS.map(slot => {
                  const localTime = istToLocal(slot, selectedDate)
                  const istDisplay = localToIST(slot)
                  const isSelected = selectedTime === slot
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`
                        rounded-lg border px-2 py-2.5 text-left transition-all duration-200
                        ${isSelected
                          ? "border-indigo-500/50 text-white"
                          : "border-white/5 text-zinc-400 hover:border-white/20 hover:text-white hover:bg-white/5"
                        }
                      `}
                      style={isSelected ? {
                        background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))",
                        boxShadow: "0 0 12px rgba(99,102,241,0.15)"
                      } : undefined}
                    >
                      <div className="text-[13px] font-semibold">{localTime}</div>
                      <div className="text-[10px] text-zinc-600 mt-0.5">{istDisplay}</div>
                    </button>
                  )
                })}
              </div>

              <button
                disabled={!selectedTime}
                onClick={() => setStep(3)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  background: selectedTime ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.05)",
                  boxShadow: selectedTime ? "0 4px 20px rgba(99,102,241,0.3)" : "none"
                }}
              >
                {selectedTime ? (
                  <>Continue <ArrowRight size={16} /></>
                ) : "Pick a time slot"}
              </button>
            </div>
          )}

          {/* ═══════ STEP 3: CONTACT DETAILS ═══════ */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="mb-3 flex items-center gap-1 text-[12px] text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft size={14} /> Change time
              </button>

              {/* summary bar */}
              {selectedDate && (
                <div className="mb-5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={13} className="text-indigo-400" />
                    <span className="text-[12px] text-zinc-300">{formatDateDisplay(selectedDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-indigo-400" />
                    <span className="text-[12px] text-white font-medium">{selectedTime ? istToLocal(selectedTime, selectedDate) : ""}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3.5">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                    <User size={11} /> Full Name
                  </label>
                  <input
                    required type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
                    placeholder="Your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                    <Mail size={11} /> Email Address
                  </label>
                  <input
                    required type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
                    placeholder="you@company.com"
                  />
                </div>

                {/* Phone with country picker */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                    <Phone size={11} /> Phone Number
                  </label>
                  <div className="flex gap-2">
                    {/* country selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[13px] text-white hover:bg-white/[0.06] transition-all min-w-[110px]"
                      >
                        <span className="text-lg">{selectedCountry?.flag}</span>
                        <span className="font-medium">{countryCode}</span>
                        <ChevronRight size={12} className={`text-zinc-600 transition-transform ${showCountryDropdown ? "rotate-90" : ""}`} />
                      </button>

                      {/* dropdown */}
                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-[280px] max-h-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl z-50 flex flex-col">
                          <div className="px-2 py-2 border-b border-white/5">
                            <div className="relative">
                              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={e => setCountrySearch(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-3 py-2 text-[12px] text-white placeholder:text-zinc-600 outline-none focus:border-indigo-500/30"
                                placeholder="Search country..."
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                            {filteredCountries.map(c => (
                              <button
                                key={c.name + c.code}
                                onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); setCountrySearch("") }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] hover:bg-white/5 transition-colors ${c.code === countryCode ? "bg-indigo-500/10 text-white" : "text-zinc-400"}`}
                              >
                                <span className="text-base">{c.flag || "🏳️"}</span>
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="text-zinc-600 font-mono text-[11px]">{c.code}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <input
                      required type="tel" value={phone}
                      onChange={e => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-white placeholder:text-zinc-700 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={loading || !name || !email || !phone}
                onClick={handleSubmit}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 border border-indigo-500/30"
                style={{
                  background: (!loading && name && email && phone) ? "linear-gradient(135deg, #6366f1, #ec4899)" : "rgba(255,255,255,0.05)",
                  boxShadow: (!loading && name && email && phone) ? "0 4px 24px rgba(99,102,241,0.3), 0 0 40px rgba(236,72,153,0.15)" : "none"
                }}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <><Sparkles size={16} /> Confirm Booking</>
                )}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
                <Shield size={11} /> Your information is encrypted and never shared
              </p>
            </div>
          )}

          {/* ═══════ STEP 4: SUCCESS ═══════ */}
          {step === 4 && selectedDate && (
            <div className="py-6 text-center">
              <div className="relative mx-auto mb-5 h-20 w-20">
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(16,185,129,0.15)" }} />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))" }}>
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Call Booked Successfully!</h3>
              <p className="text-[13px] text-zinc-400 mb-5 max-w-xs mx-auto leading-relaxed">
                The founder will reach out to confirm your booking. You&apos;ll receive a confirmation on <strong className="text-white">{email}</strong>.
              </p>

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 mx-auto max-w-xs space-y-2 text-[13px] text-left">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date</span>
                  <span className="text-white font-medium">{formatDateDisplay(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Time</span>
                  <span className="text-white font-medium">{selectedTime ? istToLocal(selectedTime, selectedDate) : ""} ({userTimezone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Feature</span>
                  <span className="text-indigo-400 font-medium">{source}</span>
                </div>
              </div>

              <button
                onClick={close}
                className="mt-6 w-full max-w-xs mx-auto flex items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white hover:opacity-90 transition-all border border-white/10"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* click outside dropdown to close */}
      {showCountryDropdown && (
        <div className="fixed inset-0 z-[998]" onClick={() => { setShowCountryDropdown(false); setCountrySearch("") }} />
      )}
    </div>
  )
}
