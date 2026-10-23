import { z } from "zod";
import { createStore } from "@strikeel/db";
import { EXECUTION_MODE } from "@strikeel/core";
import { clientKey, rejectNonLocal } from "../../../../../lib/http";
import { rateLimitResponse, takeRateLimit } from "../../../../../lib/rate-limit";
import { withLock } from "../../../../../lib/lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let store: ReturnType<typeof createStore> | undefined;
function getStore() {
  store ??= createStore();
  return store;
}

const BodySchema = z.object({ active: z.boolean() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const blocked = rejectNonLocal(request);
  if (blocked) return blocked;
  const limit = takeRateLimit(`activate:${clientKey(request)}`, 30, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });

  return withLock(`strategy:${id}`, () => {
    const bundle = getStore().getStrategy(id);
    if (!bundle) return Response.json({ error: "strategy not found" }, { status: 404 });

    if (parsed.data.active && Date.parse(bundle.mandate.expiresAt) < Date.now()) {
      getStore().saveAudit(id, null, "mandate.activate_rejected", {
        reason: "MANDATE_EXPIRED",
        schemaVersion: 1,
      });
      return Response.json(
        { error: "mandate expired", reason: "MANDATE_EXPIRED", schemaVersion: 1 },
        { status: 400 }
      );
    }

    getStore().setMandateActive(id, parsed.data.active);
    return Response.json({
      ...getStore().getStrategy(id),
      executionMode: EXECUTION_MODE,
      schemaVersion: 1,
    });
  });
}
