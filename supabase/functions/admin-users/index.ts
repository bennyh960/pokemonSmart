// Supabase Edge Function (Deno) — admin-only player accounts.
// The browser can't change another user's password: that needs the service-role
// key, which must never ship to the client. This function holds it and only
// serves callers whose login email is in the ADMIN_EMAILS secret.
//
// Deploy:  supabase functions deploy admin-users
// Secret:  supabase secrets set ADMIN_EMAILS=you@example.com
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
//
// Body: { action: 'list' } → { players: AdminPlayer[] }
//       { action: 'reset-password', userId, password } → { ok: true }

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MIN_PASSWORD = 6;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Who is calling? Verify their session token with Supabase, then check the allowlist.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  const admins = (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = caller.user?.email?.toLowerCase();
  if (!email || !admins.includes(email)) return json({ error: 'Not an admin' }, 403);

  let body: { action?: string; userId?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }

  if (body.action === 'list') {
    const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string }[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }
    const { data: profiles, error } = await admin.from('profiles').select('user_id, active, slots');
    if (error) return json({ error: error.message }, 500);
    const byUser = new Map(profiles.map((p) => [p.user_id as string, p]));

    const players = users.map((u) => {
      const p = byUser.get(u.id);
      const slots = Array.isArray(p?.slots) ? (p.slots as { meta?: { playerName?: string } }[]) : [];
      return {
        userId: u.id,
        email: u.email ?? '',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        active: p?.active === true,
        playerNames: slots.map((s) => s.meta?.playerName).filter((n): n is string => !!n),
      };
    });
    return json({ players });
  }

  if (body.action === 'reset-password') {
    if (!body.userId || typeof body.password !== 'string' || body.password.length < MIN_PASSWORD) {
      return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(body.userId, { password: body.password });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
