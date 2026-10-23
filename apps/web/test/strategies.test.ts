import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

process.env.STRIKEEL_DB_PATH = path.join(
  os.tmpdir(),
  `strikeel-api-${randomUUID()}.sqlite`
);
process.env.STRIKEEL_LOCAL_ONLY = "true";

vi.mock("@strikeel/strike-adapter", () => {
  class StrikeClient {
    async getMarketSnapshot(symbol: string) {
      return {
        symbol,
        status: "trading",
        markPrice: "2000",
        indexPrice: "2000",
        fundingRate: "0.0001",
        nextFundingTime: Date.now() + 28_800_000,
        maxLeverage: "10",
        maintenanceMarginRate: "0.005",
        maintenanceAmount: "0",
        minSize: "0.001",
        maxSize: "100",
        minNotional: "10",
        tickSize: "0.01",
        stepSize: "0.001",
        takerFeeBps: "5",
        bids: [{ price: "2000", quantity: "100" }],
        asks: [{ price: "2001", quantity: "100" }],
        observedAt: new Date().toISOString(),
        dataStatus: "fresh",
        source: "strike-mainnet",
        marginTiers: [
          {
            maxNotional: "1000000",
            maxLeverage: "10",
            maintenanceMarginRate: "0.005",
            maintenanceAmount: "0",
          },
        ],
      };
    }

    async getServerNow() {
      return Date.now();
    }
  }
  return { StrikeClient };
});

type Handler = (request: Request, context?: any) => Promise<Response>;

let createRoute: Handler;
let listRoute: Handler;
let activateRoute: Handler;
let simulateRoute: Handler;
let activityRoute: Handler;

beforeAll(async () => {
  createRoute = (await import("../app/api/strategies/route")).POST as Handler;
  listRoute = (await import("../app/api/strategies/route")).GET as Handler;
  activateRoute = (await import("../app/api/strategies/[id]/activate/route")).POST as Handler;
  simulateRoute = (await import("../app/api/strategies/[id]/simulate/route")).POST as Handler;
  activityRoute = (await import("../app/api/activity/route")).GET as Handler;
});

const headers = { "content-type": "application/json" };

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function body(response: Response) {
  return (await response.json()) as any;
}

async function createStrategy(overrides: Record<string, unknown> = {}) {
  const response = await createRoute(
    jsonRequest("http://localhost/api/strategies", "POST", {
      symbol: "ETH-USD",
      externalDeltaUnits: "10",
      targetRatio: "0.8",
      availableMarginUsd: "100000",
      exposureObservedAt: new Date().toISOString(),
      exposureDataQuality: "fresh",
      ...overrides,
    })
  );
  expect(response.status).toBe(201);
  return body(response);
}

function activate(id: string, active = true) {
  return activateRoute(jsonRequest(`http://localhost/api/strategies/${id}/activate`, "POST", { active }), {
    params: Promise.resolve({ id }),
  });
}

function simulate(id: string, idempotencyKey: string) {
  return simulateRoute(
    jsonRequest(`http://localhost/api/strategies/${id}/simulate`, "POST", { idempotencyKey }),
    { params: Promise.resolve({ id }) }
  );
}

describe("strategy execution API", () => {
  it("blocks inactive mandates, fills once, and replays idempotently", async () => {
    const created = await createStrategy();
    const id = created.strategy.id as string;

    const blocked = await simulate(id, "idem-inactive-0001");
    expect(blocked.status).toBe(400);
    expect((await body(blocked)).reason).toBe("MANDATE_INACTIVE");

    const activated = await activate(id);
    expect(activated.status).toBe(200);
    expect((await body(activated)).mandate.active).toBe(true);

    const filled = await simulate(id, "idem-filled-0001");
    expect(filled.status).toBe(200);
    const filledBody = await body(filled);
    expect(filledBody.execution.intent.state).toBe("FILLED");
    expect(filledBody.execution.fill.marketSource).toBe("strike-mainnet");
    expect(filledBody.execution.fill.schemaVersion).toBe(1);
    expect(filledBody.execution.fill.marginUtilizationPct).toBeTruthy();

    const replay = await simulate(id, "idem-filled-0001");
    expect(replay.status).toBe(200);
    const replayBody = await body(replay);
    expect(replayBody.idempotent).toBe(true);
    expect(replayBody.execution.intent.id).toBe(filledBody.execution.intent.id);

    const listed = await body(
      await listRoute(new Request("http://localhost/api/strategies"))
    );
    const strategy = listed.strategies.find((item: any) => item.strategy.id === id);
    expect(strategy.fills).toHaveLength(1);
    expect(strategy.intents).toHaveLength(1);

    const activity = await body(
      await activityRoute(new Request(`http://localhost/api/activity?strategyId=${id}`))
    );
    const types = activity.events.map((event: any) => event.type);
    expect(types).toContain("execution.blocked");
    expect(types).toContain("execution.replayed");
  });

  it("rejects activation of an expired mandate", async () => {
    const created = await createStrategy({
      expiresAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    const id = created.strategy.id as string;

    const response = await activate(id);
    expect(response.status).toBe(400);
    expect((await body(response)).reason).toBe("MANDATE_EXPIRED");

    const activity = await body(
      await activityRoute(new Request(`http://localhost/api/activity?strategyId=${id}`))
    );
    expect(activity.events.map((event: any) => event.type)).toContain(
      "mandate.activate_rejected"
    );
  });
});

