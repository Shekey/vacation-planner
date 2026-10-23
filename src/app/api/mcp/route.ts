import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { assistantServer } from "@/lib/assistant";
import { db } from "@/lib/db";
import { contextOfToken } from "@/lib/personal-tokens";
import { settingsOf } from "@/lib/session";
import { appOrigin } from "@/lib/url";

/**
 * MCP over streamable HTTP for AI assistants (#45), authenticated with a personal token as a Bearer token. Stateless:
 * each request gets its own server for the token's person, so nothing is kept between calls.
 */
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  const ctx = token ? await contextOfToken(token) : null;
  if (!ctx) return unauthorized();

  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: ctx.membership.workspaceId }, include: { settings: true } });
  const server = assistantServer({
    ...ctx,
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, timezone: workspace.timezone },
    settings: settingsOf(workspace),
    origin: await appOrigin(),
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

/** No server-sent stream and no sessions to end: every call is a POST. */
export function GET() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

function unauthorized() {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message: "Missing, expired or revoked token. Create one under Account → Connect an AI assistant." }, id: null },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="urlaubflow"' } },
  );
}

function methodNotAllowed() {
  return Response.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }, { status: 405, headers: { Allow: "POST" } });
}
