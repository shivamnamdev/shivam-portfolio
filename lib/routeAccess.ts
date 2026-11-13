// Which paths the proxy lets a visitor reach without signing in, and which paths are API calls (answered with 401 JSON, not a redirect).
// Plain path checks instead of Clerk's createRouteMatcher (deprecated). Pure, so the rules are unit-tested (tests/unit/route-access.spec.ts).
// A prefix matches the path itself and anything below it ("/courses" and "/courses/x", not "/coursesx").

// Every public page and API route is listed explicitly; anything not listed needs a session. Handlers still verify the identity server-side.
const PUBLIC_EXACT = [
  '/',
  '/about',
  '/privacy',
  '/terms',
  '/refund',
  '/contact',
  '/mentorship',
  '/api/create-order',
  '/api/verify-payment',
  '/api/enroll-free',
  '/api/send-email',
  '/api/banners', // visitors see banners too; the route reads the session itself when there is one
  '/api/webhooks/clerk', // verified by its Svix signature in the handler, never by a session
] as const;

const PUBLIC_PREFIXES = [
  '/courses',
  '/share', // lets WhatsApp and other crawlers read the share thumbnail
  '/api/admin/v1', // answers its own 401/403 (lib/adminApi/guard.ts) so API keys work without a Clerk session; every route calls authorize()
] as const;

const API_PREFIXES = ['/api', '/trpc'] as const;

function clean(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;
}

function underPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/');
}

export function isPublicPath(pathname: string): boolean {
  const path = clean(pathname);
  return (PUBLIC_EXACT as readonly string[]).includes(path) || PUBLIC_PREFIXES.some((p) => underPrefix(path, p));
}

// "/api-docs" is a page, not an API route: it must be sent to sign in, not answered with JSON (SCP-29).
export function isApiPath(pathname: string): boolean {
  const path = clean(pathname);
  return API_PREFIXES.some((p) => underPrefix(path, p));
}
