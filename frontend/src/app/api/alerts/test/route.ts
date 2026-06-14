import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's org
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const orgId = teamMember.organization_id
    
    const severities = ["urgent", "warning", "info", "ok"]
    const randomSev = severities[Math.floor(Math.random() * severities.length)]
    
    const messages: Record<string, string[]> = {
      urgent: ["Water main leak detected in Unit 4B", "Server connection lost to IoT gateway", "Fire alarm triggered in North Wing"],
      warning: ["HVAC unit 2 requires scheduled maintenance", "Tenant 12C rent is 5 days overdue", "Occupancy dropped below 90% target"],
      info: ["Monthly compliance report generated successfully", "System backup completed", "New vendor added to preferred list"],
      ok: ["All IoT sensors reporting normal status", "Rent collection hit 100% for this month", "Maintenance queue is completely clear"]
    }
    
    const randomMsg = messages[randomSev][Math.floor(Math.random() * 3)]
    
    const { error } = await supabase.from("alerts").insert({
      organization_id: orgId,
      alert_type: "system_test",
      message: randomMsg,
      severity: randomSev,
      is_read: false
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Test alert error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
