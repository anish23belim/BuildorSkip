import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('Supabase URL or Anon Key is missing. Returning a safe mock client for build safety.');
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

  return createBrowserClient(url, anonKey);
}
