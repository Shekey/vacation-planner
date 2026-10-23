import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Role } from "@/lib/permissions";
import type { TokenDays } from "@/lib/personal-tokens-shared";

/**
 * Personal tokens for AI assistants (#45). A token acts for one person in one workspace, with that person's role, and
 * nothing else: no settings, no members, no other workspace. Only its SHA-256 hash is stored, so a database leak gives
 * nobody a working token; the person sees the token once, when it is made.
 */

export const TOKEN_PREFIX = "ufl_";
export const MAX_TOKENS_PER_PERSON = 10;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Makes a token; the returned `token` is the only time it exists in readable form. */
export async function createPersonalToken(opts: { membershipId: string; name: string; days: TokenDays; now?: Date }) {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const now = opts.now ?? new Date();
  const row = await db.personalToken.create({
    data: {
      membershipId: opts.membershipId,
      name: opts.name,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + opts.days * 24 * 60 * 60 * 1000),
    },
  });
  return { id: row.id, token };
}

export type TokenContext = {
  tokenId: string;
  user: { id: string; name: string | null; email: string; locale: string | null };
  membership: { id: string; role: Role; workspaceId: string };
};

/**
 * Who a token belongs to, or null when it is unknown, expired, the person has left the workspace, the workspace is
 * deleted or its admins turned assistants off. Checked on every call, so revoking or leaving takes effect at once.
 */
export async function contextOfToken(token: string, now = new Date()): Promise<TokenContext | null> {
  if (!token.startsWith(TOKEN_PREFIX) || token.length > 200) return null;
  const row = await db.personalToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      membership: {
        include: {
          user: { select: { id: true, name: true, email: true, locale: true } },
          workspace: { select: { deletedAt: true, settings: { select: { assistantAccess: true } } } },
        },
      },
    },
  });
  if (!row || row.expiresAt <= now) return null;
  const { membership } = row;
  if (membership.removedAt || membership.isSample || membership.workspace.deletedAt) return null;
  if (membership.workspace.settings && !membership.workspace.settings.assistantAccess) return null;
  // At most one write a minute per token, so a busy assistant doesn't write on every call.
  if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > 60_000) {
    await db.personalToken.update({ where: { id: row.id }, data: { lastUsedAt: now } });
  }
  return {
    tokenId: row.id,
    user: membership.user,
    membership: { id: membership.id, role: membership.role, workspaceId: membership.workspaceId },
  };
}

/** The person's tokens across their workspaces, newest first, without the hashes. */
export function tokensOfUser(userId: string) {
  return db.personalToken.findMany({
    where: { membership: { userId, removedAt: null, workspace: { deletedAt: null } } },
    select: { id: true, name: true, createdAt: true, expiresAt: true, lastUsedAt: true, membership: { select: { workspace: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}
