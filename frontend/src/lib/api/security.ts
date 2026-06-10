import crypto from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

export const uuidSchema = z.string().uuid()

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  )
}

export function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

export function createUserClient(token: string) {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

export function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice("Bearer ".length).trim()
}

export function requireBearerSecret(req: Request, envName = "WEBHOOK_SECRET") {
  const expected = requireEnv(envName)
  const token = getBearerToken(req)
  if (token !== expected) {
    return jsonError("Unauthorized", 401)
  }
  return null
}

export async function requireUserSupabase(req: Request) {
  const token = getBearerToken(req)
  if (!token) {
    return { error: jsonError("Unauthorized", 401) }
  }

  const supabase = createUserClient(token)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return { error: jsonError("Unauthorized", 401) }
  }

  return { supabase, user: data.user }
}

export async function getAuthorizedSupabase(req: Request, secretEnvName = "WEBHOOK_SECRET") {
  const token = getBearerToken(req)
  const secret = process.env[secretEnvName]

  if (secret && token === secret) {
    return { supabase: createAdminClient(), mode: "service" as const, user: null }
  }

  if (token) {
    const supabase = createUserClient(token)
    const { data, error } = await supabase.auth.getUser()
    if (!error && data.user) {
      return { supabase, mode: "user" as const, user: data.user }
    }
  }

  return null
}

export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { error: jsonError("Invalid JSON body", 400) }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      error: jsonError("Invalid payload", 400, parsed.error.flatten()),
    }
  }

  return { data: parsed.data as z.infer<T> }
}

function vendorPortalSecret() {
  return process.env.VENDOR_PORTAL_SECRET || process.env.WEBHOOK_SECRET || requireEnv("SUPABASE_SERVICE_ROLE_KEY")
}

export function signVendorPortalToken(ticketId: string, vendorId: string, purpose: "accept" | "quote") {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = `${purpose}:${ticketId}:${vendorId}:${expiresAt}`
  const signature = crypto
    .createHmac("sha256", vendorPortalSecret())
    .update(payload)
    .digest("hex")

  return `${expiresAt}.${signature}`
}

export function verifyVendorPortalToken(params: {
  ticketId: string
  vendorId: string
  purpose: "accept" | "quote"
  token: string | null
}) {
  if (!params.token) return false

  const [expiresAtRaw, signature] = params.token.split(".")
  const expiresAt = Number(expiresAtRaw)
  if (!expiresAt || !signature || Date.now() > expiresAt) return false

  const payload = `${params.purpose}:${params.ticketId}:${params.vendorId}:${expiresAt}`
  const expected = crypto
    .createHmac("sha256", vendorPortalSecret())
    .update(payload)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}
