// Quick script to assign admin role to vignesh@dkothary.com
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dzmmqxwiknemzzahcidw.supabase.co',
  'sb_publishable_iBXvMzMMDgOQymd7uO3qqw_61q8ukmB'
);

async function main() {
  // Sign in as the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'vignesh@dkothary.com',
    password: 'Dkc@1234'
  });
  
  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log('Signed in as:', authData.user.email, '| ID:', userId);
  
  // Check current role
  const { data: existingRoles } = await supabase.from('user_roles').select('*').eq('user_id', userId);
  console.log('Current roles:', existingRoles);
  
  // Delete any existing role and insert admin
  await supabase.from('user_roles').delete().eq('user_id', userId);
  const { data: inserted, error: insertError } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'admin'
  }).select();
  
  if (insertError) {
    console.error('Insert error:', insertError.message);
    // Try RPC
    const { error: rpcErr } = await supabase.rpc('set_user_role', {
      target_user_id: userId,
      new_role: 'admin'
    });
    if (rpcErr) console.error('RPC error:', rpcErr.message);
    else console.log('Admin role set via RPC');
  } else {
    console.log('Admin role inserted:', inserted);
  }
  
  // Verify
  const { data: verify } = await supabase.from('user_roles').select('*').eq('user_id', userId);
  console.log('Verified roles:', verify);
  
  // Also check profile exists
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId);
  console.log('Profile:', profile);

  await supabase.auth.signOut();
}

main().catch(console.error);
