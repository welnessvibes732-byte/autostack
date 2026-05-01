import { supabase } from "@/lib/supabase"

/**
 * Gets or creates the user's organization and ensures they are in team_members.
 * This is required for RLS policies to work correctly on all tables.
 */
export async function getOrCreateOrg(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // 1. Try to find org via team_members first (most reliable for RLS)
  const { data: teamRow } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (teamRow?.organization_id) return teamRow.organization_id

  // 2. Try to find org by owner_id
  const { data: orgData } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (orgData?.id) {
    // Org exists but user is not in team_members — fix that
    await supabase.from('team_members').insert({
      organization_id: orgData.id,
      user_id: user.id,
      role: 'owner',
      email: user.email
    })
    return orgData.id
  }

  // 3. Create a brand-new org + team_members row
  const { data: newOrg, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: 'My Organization', owner_id: user.id })
    .select('id')
    .single()

  if (orgErr || !newOrg) throw new Error("Could not create organization: " + orgErr?.message)

  await supabase.from('team_members').insert({
    organization_id: newOrg.id,
    user_id: user.id,
    role: 'owner',
    email: user.email
  })

  return newOrg.id
}
