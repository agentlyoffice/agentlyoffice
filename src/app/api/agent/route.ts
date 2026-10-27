import { NextResponse } from "next/server";
import { AI, LIMITS } from "@/config/ai";
import { readCapped } from "@/lib/guard";
import { clientIp } from "@/lib/netkey";
import { spend } from "@/lib/ratelimit";
import { aiConfigured, hourlyLimit, runDesk, type DeskInput } from "@/lib/server/ai";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
 * Optional AI model for the researcher and writer desks. Without OPENROUTER_API_KEY it answers { configured: false }
 * with HTTP 200 and the desks use their built-in methods. With a key: body capped, every field length-checked,
 * per-network limit, site-wide hourly ceiling (AI_HOURLY_LIMIT), price ceiling on every call. Only the task title,
 * brief, template name, the pasted sources and (for the writer) the researcher's points are sent. Nothing is stored.
 */

export async function GET() {
  return NextResponse.json({ configured: aiConfigured() }, { headers: { "cache-control": "no-store" } });
}

const MAX_BODY = 90_000;
const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);

export async function POST(request: Request) {
  if (!aiConfigured()) return NextResponse.json({ configured: false });
  const raw = await readCapped(request, MAX_BODY).catch(() => null);
  if (raw === null) return NextResponse.json({ configured: true, error: "Request too large." }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ configured: true, error: "Invalid JSON." }, { status: 400 });
  }
  const role = body.role === "researcher" || body.role === "writer" ? body.role : null;
  const title = str(body.title, LIMITS.title);
  const brief = str(body.brief, LIMITS.brief);
  const template = str(body.template, 20);
  const sources = Array.isArray(body.sources) ? body.sources.slice(0, LIMITS.sources + 1) : null;
  const points = Array.isArray(body.points) ? body.points.slice(0, 8) : [];
  if (!role || title === null || brief === null || template === null || !sources) return NextResponse.json({ configured: true, error: "Missing or oversized fields." }, { status: 400 });
  const cleanSources: DeskInput["sources"] = [];
  for (const s of sources) {
    const o = (s ?? {}) as Record<string, unknown>;
    const id = str(o.id, 3);
    const label = str(o.label, LIMITS.sourceLabel);
    const text = str(o.text, LIMITS.sourceText);
    if (!id || !/^S\d{1,2}$/.test(id) || label === null || !text) return NextResponse.json({ configured: true, error: "A source is malformed or too long." }, { status: 400 });
    cleanSources.push({ id, label, text });
  }
  if (!cleanSources.length) return NextResponse.json({ configured: true, error: "No sources." }, { status: 400 });
  const cleanPoints: DeskInput["points"] = [];
  for (const p of points) {
    const o = (p ?? {}) as Record<string, unknown>;
    const text = str(o.text, 500);
    const source = str(o.source, 3);
    if (text && source) cleanPoints.push({ text, source });
  }

  const store = getStore();
  const ipOk = await spend(store, "desk", clientIp(request), 1, AI.perIpPer10Min, 600, { aggregate: true });
  if (!ipOk) return NextResponse.json({ configured: true, error: "Too many model calls from this network; try again in a few minutes." }, { status: 429 });
  const siteOk = await spend(store, "desk:site", "all", 1, hourlyLimit(), 3600);
  if (!siteOk) return NextResponse.json({ configured: true, error: "The site's model calls for this hour are used up." }, { status: 429 });

  const out = await runDesk({ role, title, brief, template, sources: cleanSources, points: cleanPoints });
  if (!out.ok) return NextResponse.json({ configured: true, error: out.error });
  return NextResponse.json({ configured: true, text: out.text, model: out.model });
}
