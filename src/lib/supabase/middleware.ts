import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('Supabase URL or Anon Key is missing in middleware. Bypassing session update for build safety.');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/messages', '/ideas/new'];
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Check if there is any Supabase cookie (starts with 'sb-' or contains 'auth-token')
  const hasSupabaseCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') || cookie.name.includes('auth-token')
  );

  let user = null;

  // Only run getUser network request if we must verify a protected route or refresh an existing session
  if (isProtectedRoute || hasSupabaseCookie) {
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();
    user = authenticatedUser;
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
