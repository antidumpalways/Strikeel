import { createStore } from "@strikeel/db";
import { EXECUTION_MODE } from "@strikeel/core";
import { rejectNonLocal } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let store: ReturnType<typeof createStore> | undefined;
function getStore() {
  store ??= createStore();
  return store;
}

export async function GET(request: Request): Promise<Response> {
  const blocked = rejectNonLocal(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const strategyId = url.searchParams.get("strategyId") ?? undefined;
  if (strategyId && !getStore().getStrategy(strategyId)) {
    return Response.json({ error: "strategy not found" }, { status: 404 });
  }
  return Response.json({
    events: getStore().listActivity(strategyId),
    executionMode: EXECUTION_MODE,
    schemaVersion: 1,
  });
}
