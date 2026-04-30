"use client"
import { useRef, useEffect } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** Master page entrance — call in every page */
export function usePageAnimation(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

    tl.fromTo(".page-header",
      { opacity: 0, y: -24, filter: "blur(6px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }
    )
    .fromTo(".anim-card",
      { opacity: 0, y: 36, scale: 0.94, rotateX: 8 },
      { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.65, stagger: 0.08, ease: "back.out(1.4)" },
      "-=0.3"
    )
    .fromTo(".anim-row",
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.04 },
      "-=0.3"
    )
    .fromTo(".anim-filter",
      { opacity: 0, y: 12, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35 },
      "<"
    )
    .fromTo(".anim-stat",
      { opacity: 0, scale: 0.8, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.07, ease: "back.out(1.8)" },
      "-=0.2"
    )

    // Scroll-triggered reveal for below-fold content
    ScrollTrigger.batch(".anim-scroll", {
      onEnter: (els) => gsap.fromTo(els,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" }
      ),
      start: "top 90%",
    })

  }, { scope: ref, dependencies: deps })

  return ref
}

/** Magnetic hover — smooth cursor tracking */
export function magneticHover(el: HTMLElement | null, strength = 0.35) {
  if (!el) return
  const onMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect()
    const dx = (e.clientX - rect.left - rect.width  / 2) * strength
    const dy = (e.clientY - rect.top  - rect.height / 2) * strength
    gsap.to(el, { x: dx, y: dy, duration: 0.35, ease: "power2.out" })
  }
  const onLeave = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" })
  el.addEventListener("mousemove", onMove)
  el.addEventListener("mouseleave", onLeave)
  return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave) }
}

/** Animated number counter */
export function animateCounter(el: HTMLElement | null, target: number, duration = 1.4, prefix = "", suffix = "") {
  if (!el) return
  gsap.fromTo({ val: 0 }, { val: target }, {
    val: target, duration, ease: "power2.out",
    onUpdate: function() {
      const v = Math.round((this as any).targets()[0].val)
      el.textContent = prefix + v.toLocaleString() + suffix
    }
  })
}

/** Glitch text effect */
export function glitchText(el: HTMLElement | null) {
  if (!el) return
  const original = el.textContent
  const chars = "!@#$%^&*ABCDEFabcdef0123456789"
  let iterations = 0
  const interval = setInterval(() => {
    el.textContent = (original || "").split("").map((c, i) => {
      if (i < iterations) return (original || "")[i]
      return chars[Math.floor(Math.random() * chars.length)]
    }).join("")
    iterations += 1 / 3
    if (iterations >= (original || "").length) clearInterval(interval)
  }, 30)
}

/** Tilt card on mouse — 3D perspective */
export function tilt3D(el: HTMLElement | null, max = 12) {
  if (!el) return
  const onMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect()
    const x = (e.clientY - rect.top  - rect.height / 2) / rect.height
    const y = (e.clientX - rect.left - rect.width  / 2) / rect.width
    gsap.to(el, { rotateX: -x * max, rotateY: y * max, transformPerspective: 800, duration: 0.4, ease: "power2.out" })
  }
  const onLeave = () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" })
  el.addEventListener("mousemove", onMove)
  el.addEventListener("mouseleave", onLeave)
  return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave) }
}
