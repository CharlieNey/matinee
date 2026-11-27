/**
 * Page counting with Vercel Web Analytics (docs/proposals/cookieless-counting.md):
 * no cookies, same-origin script and endpoint (`/_vercel/insights/*`), so the
 * CSP's `script-src 'self'` and `connect-src 'self'` already allow it.
 *
 * On only in Vercel production builds. Before Web Analytics is enabled for the
 * project in the Vercel dashboard, its script would 404, so the order is: the
 * dashboard click first, then the deploy that carries this code.
 */
export const pageCountingEnabled =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

/**
 * Only the page's address leaves the browser: no query string and no
 * fragment. A shared diary lives in the fragment (/p#<data>) and must never
 * be counted with its contents.
 */
export function pathOnly<T extends { url: string }>(event: T): T {
  const url = new URL(event.url);
  return { ...event, url: `${url.origin}${url.pathname}` };
}
