"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import gsap from "gsap"

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

    /* 1. Nav pills drop in */
    tl.fromTo(".nav-pill",
      { y: -36, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, stagger: 0.1 }
    )

    /* 2. Giant words blur-reveal stagger — the centrepiece */
    tl.fromTo(".hero-word",
      { y: 100, opacity: 0, filter: "blur(18px)" },
      { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, stagger: 0.18 },
      "-=0.3"
    )

    /* 3. Description text */
    tl.fromTo(".hero-desc",
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55 },
      "-=0.4"
    )

    /* 4. Stats */
    tl.fromTo(".hero-stat",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
      "-=0.5"
    )

    /* 5. CTA button */
    tl.fromTo(".hero-cta",
      { y: 18, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.5)" },
      "-=0.35"
    )
  }, [])

  return (
    <div
      ref={pageRef}
      style={{
        position: "relative",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        background: "#000",
        fontFamily: "'Readex Pro', system-ui, sans-serif",
        color: "#fff",
      }}
    >
      {/* ── Fullscreen background video ── */}
      

      {/* Dark gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.85) 100%)",
          zIndex: 1,
        }}
      />

      {/* ── Floating pill navbar ── */}
      <nav
        style={{
          position: "absolute",
          zIndex: 20,
          top: 0,
          left: 0,
          right: 0,
          padding: "24px 5vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Logo pill */}
        <div
          className="nav-pill"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(18,18,18,0.92)",
            borderRadius: "9999px",
            padding: "12px 22px 12px 16px",
            border: "1px solid #1E1E1E",
          }}
        >
          <svg viewBox="0 0 256 256" style={{ height: "20px", width: "20px" }} fill="none">
            <path
              d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z
                 M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z
                 M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z
                 M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z"
              fill="#ffffff"
            />
          </svg>
          <span
            style={{
              color: "#fff",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "-0.03em",
            }}
          >
            PropIQ
          </span>
        </div>

        {/* Center links pill */}
        <div
          className="nav-pill"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            background: "rgba(18,18,18,0.92)",
            borderRadius: "9999px",
            padding: "6px 10px",
            border: "1px solid #1E1E1E",
          }}
        >
          {[
            { label: "platform", href: "#platform" },
            { label: "portfolio", href: "#portfolio" },
            { label: "pricing",   href: "#pricing" },
            { label: "about",     href: "#about" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                color: "#A1A1AA",
                fontSize: "13px",
                fontWeight: 400,
                padding: "8px 18px",
                borderRadius: "9999px",
                textDecoration: "none",
                letterSpacing: "-0.01em",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "#fff"
                e.currentTarget.style.background = "rgba(255,255,255,0.07)"
              }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; e.currentTarget.style.color = "#A1A1AA"; e.currentTarget.style.borderColor = "#1E1E1E"; }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA pill */}
        <div
          className="nav-pill"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Link
            href="/login"
            style={{
              color: "#A1A1AA",
              fontSize: "13px",
              fontWeight: 400,
              padding: "12px 20px",
              borderRadius: "9999px",
              textDecoration: "none",
              letterSpacing: "-0.01em",
              transition: "color 0.2s",
              background: "rgba(18,18,18,0.92)",
              border: "1px solid #1E1E1E",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          >
            sign in
          </Link>
          <Link
            href="/signup"
            style={{
              background: "#fff",
              color: "#000",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "9999px",
              padding: "12px 22px",
              textDecoration: "none",
              letterSpacing: "-0.02em",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e5e5e5")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            get started
          </Link>
        </div>
      </nav>

      {/* ── Foreground content ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 5vw 60px",
          pointerEvents: "none",
        }}
      >
        {/* Giant staggered words */}
        <div style={{ userSelect: "none" }}>

          {/* Row 1: "the intelligence" + top-right stat */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div
              className="hero-word"
              style={{
                fontSize: "clamp(32px, 8vw, 155px)",
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 0.92,
                color: "#fff",
                textTransform: "lowercase",
              }}
            >
              the intelligence
            </div>

            {/* Stat — top right */}
            <div className="hero-stat" style={{ textAlign: "right", paddingBottom: "10px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "flex-end" }}>
                <div
                  style={{
                    height: "1px",
                    width: "72px",
                    background: "#0D0D0D",
                    transform: "rotate(20deg)",
                  }}
                />
                <span
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 52px)",
                    fontWeight: 500,
                    color: "#fff",
                    letterSpacing: "-0.04em",
                  }}
                >
                  +12k
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#A1A1AA",
                  marginTop: "5px",
                  letterSpacing: "0.02em",
                  textTransform: "lowercase",
                }}
              >
                units managed
              </div>
            </div>
          </div>

          {/* Row 2: "layer for" — indented */}
          <div
            className="hero-word"
            style={{
              fontSize: "clamp(32px, 8vw, 155px)",
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              color: "#fff",
              textTransform: "lowercase",
              paddingLeft: "15%",
            }}
          >
            layer for
          </div>

          {/* Row 3: "real estate" + bottom stat */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div
              className="hero-word"
              style={{
                fontSize: "clamp(32px, 8vw, 155px)",
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 0.92,
                color: "#fff",
                textTransform: "lowercase",
              }}
            >
              real estate
            </div>

            {/* Stat — bottom right */}
            <div className="hero-stat" style={{ textAlign: "right", paddingBottom: "10px", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "flex-end" }}>
                <div
                  style={{
                    height: "1px",
                    width: "72px",
                    background: "#0D0D0D",
                    transform: "rotate(-20deg)",
                  }}
                />
                <span
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 52px)",
                    fontWeight: 500,
                    color: "#fff",
                    letterSpacing: "-0.04em",
                  }}
                >
                  +98%
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#A1A1AA",
                  marginTop: "5px",
                  textTransform: "lowercase",
                }}
              >
                collection rate
              </div>
            </div>
          </div>
        </div>

        {/* Description + CTA row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            marginTop: "28px",
            pointerEvents: "all",
          }}
        >
          {/* Description */}
          <p
            className="hero-desc"
            style={{
              maxWidth: "260px",
              fontSize: "15px",
              lineHeight: 1.5,
              color: "#A1A1AA",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            manage your entire property portfolio with ai-powered insights, automated collections and smart lease tracking
          </p>

          {/* Bottom-left stat */}
          <div className="hero-stat" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  fontSize: "clamp(24px, 3vw, 44px)",
                  fontWeight: 500,
                  color: "#fff",
                  letterSpacing: "-0.04em",
                }}
              >
                +500
              </span>
              <div
                style={{
                  height: "1px",
                  width: "60px",
                  background: "#0D0D0D",
                  transform: "rotate(-20deg)",
                }}
              />
            </div>
            <div style={{ fontSize: "12px", color: "#A1A1AA", marginTop: "5px", textTransform: "lowercase" }}>
              property managers
            </div>
          </div>

          {/* CTA */}
          <div className="hero-cta" style={{ display: "flex", gap: "10px" }}>
            <Link
              href="/signup"
              style={{
                background: "#fff",
                color: "#000",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "9999px",
                padding: "14px 28px",
                textDecoration: "none",
                letterSpacing: "-0.02em",
                transition: "background 0.2s, transform 0.25s",
                display: "inline-block",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#e5e5e5"
                e.currentTarget.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#fff"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              start for free
            </Link>
            <Link
              href="/login"
              style={{
                background: "#0D0D0D",
                color: "#A1A1AA",
                fontSize: "14px",
                fontWeight: 400,
                borderRadius: "9999px",
                padding: "14px 24px",
                textDecoration: "none",
                letterSpacing: "-0.02em",
                border: "1px solid #1E1E1E",
                transition: "all 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.14)"
                e.currentTarget.style.color = "#fff"
              }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0D0D0D"; e.currentTarget.style.color = "#A1A1AA"; e.currentTarget.style.borderColor = "#1E1E1E"; }}
            >
              sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "220px",
          background: "linear-gradient(to bottom, transparent, #000)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    </div>
  )
}
