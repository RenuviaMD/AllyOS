import { NextResponse } from "next/server";
import { loadFormulary } from "@/lib/formulary";
import { isBaaSigned, isDbConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + foundation self-check. No PHI, no auth required. */
export function GET() {
  let formularyCount = -1;
  let formularyOk = false;
  try {
    formularyCount = loadFormulary().length;
    formularyOk = true;
  } catch {
    formularyOk = false;
  }

  return NextResponse.json({
    status: "ok",
    service: "bioaxisos",
    formulary: { ok: formularyOk, count: formularyCount },
    database: { configured: isDbConfigured() },
    compliance: { baaSigned: isBaaSigned(), mode: isBaaSigned() ? "production" : "synthetic-only" },
    ts: new Date().toISOString(),
  });
}
