/**
 * Search engine switch. Until launch every page is kept out of search results: robots.txt disallows everything, each
 * page carries `noindex, nofollow` (meta tag and X-Robots-Tag header) and no sitemap is published.
 *
 * ALLOW_INDEXING=true turns indexing on (anything else, or unset, keeps it off). It is read at build time by
 * next.config.ts and the static robots.txt, so change it in Vercel, then redeploy. Pages whose URL is a secret
 * (invites, workspaces, API, sign-in confirm) and the operator pages stay noindex either way.
 */
export function isIndexingAllowed(): boolean {
  return process.env.ALLOW_INDEXING === "true";
}
