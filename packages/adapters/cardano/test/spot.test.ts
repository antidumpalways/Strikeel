import { describe, expect, it } from "vitest";
import { parseKoiosAddressInfo } from "../src/index";

describe("Cardano spot position", () => {
  it("converts lovelace to ADA and values it in USD", () => {
    const p = parseKoiosAddressInfo(
      [
        {
          address: "addr1_test",
          balance: "5000000",
          asset_list: [],
        },
      ],
      { "cardano:ADA": "0.5" },
      "2026-10-22T00:00:00.000Z"
    );

    expect(p.chain).toBe("cardano");
    expect(p.assets[0].quantity).toBe("5");
    expect(p.estimatedValueUsd).toBe("2.5");
  });
});
