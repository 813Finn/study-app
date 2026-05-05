const SUPABASE_URL = 'https://zwpcfriofxmakznujmsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Rge94zZBh_fCF1TaS-NFkQ__7eCy3dp';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadUserData() {
  const { data, error } = await supabaseClient.from('user_store').select('key, value');
  if (error) { console.error('loadUserData:', error); return; }
  Object.keys(localStorage).filter(k => k.startsWith('sf_')).forEach(k => localStorage.removeItem(k));
  data.forEach(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)));
}

async function syncKey(key, value) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  await supabaseClient.from('user_store').upsert(
    { user_id: session.user.id, key, value },
    { onConflict: 'user_id,key' }
  );
}

async function removeKey(key) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  await supabaseClient.from('user_store').delete()
    .eq('user_id', session.user.id).eq('key', key);
}
