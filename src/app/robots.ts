import type { MetadataRoute } from "next";
import { isIndexingAllowed } from "@/lib/indexing";

/** robots.txt: everything blocked until launch (see `src/lib/indexing.ts`), then only the public pages. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/w/", "/api/", "/invite/", "/sign-in/confirm", "/admin", "/two-factor", "/account", "/workspaces"],
    },
  };
}
