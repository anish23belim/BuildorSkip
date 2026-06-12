import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('Supabase URL or Anon Key is missing. Returning a safe server mock client for build safety.');
    return new Proxy({} as any, {
      get(_, prop) {
        if (prop === 'auth') {
          return {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: async () => ({ data: { user: null } }),
            getSession: async () => ({ data: { session: null } }),
          };
        }
        if (prop === 'channel') {
          return () => ({
            on: () => ({ subscribe: () => {} }),
          });
        }
        const dummyFn = () => dummyFn;
        Object.assign(dummyFn, {
          select: dummyFn,
          eq: dummyFn,
          neq: dummyFn,
          or: dummyFn,
          order: dummyFn,
          limit: dummyFn,
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          then: (resolve: any) => resolve({ data: null, error: null }),
        });
        return dummyFn;
      },
    });
  }

  const cookieStore = await cookies();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
