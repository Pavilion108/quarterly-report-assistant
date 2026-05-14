import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, role, password } = await req.json()
    
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    // Verify the caller is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error("Unauthorized")
    
    const { data: roleData } = await supabaseClient.from('user_roles').select('role').eq('user_id', user.id).single()
    if (roleData?.role !== 'admin' && roleData?.role !== 'manager' && roleData?.role !== 'partner') {
      throw new Error("Only admins or managers can invite new users.")
    }

    // Now initialize the Admin client using the Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Direct User Creation with email_confirm: false sends the Supabase Confirm Email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false,
      user_metadata: { name: email.split('@')[0] }
    })
    
    if (inviteError) {
      // If user already exists, just return success so we can upsert their role
      if (inviteError.status !== 422 && !inviteError.message.includes('already exists')) {
        throw inviteError
      }
    }

    // Get the user ID (either newly created or existing)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const targetUser = existingUser.users.find(u => u.email === email)
    
    if (!targetUser) throw new Error("Failed to resolve user.")

    // Pre-assign their role so it's ready when they sign in
    if (role) {
      await supabaseAdmin.from('user_roles').upsert({
        user_id: targetUser.id,
        role: role
      })
    }

    return new Response(JSON.stringify({ success: true, user: targetUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
