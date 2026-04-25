import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/history/:path*',
    '/auth/:path*',
    '/api/history/:path*',
    '/api/download/:path*',
    '/api/payment/:path*',
    '/scanner/:path*',
    '/evaluate/:path*',
    '/followup/:path*',
    '/patterns/:path*',
    '/interview-prep/:path*',
    '/profile/:path*',
    '/api/scanner/:path*',
    '/api/evaluate/:path*',
    '/api/followup/:path*',
    '/api/patterns/:path*',
    '/api/interview-prep/:path*',
    '/api/profile/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
