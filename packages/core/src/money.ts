import Decimal from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -30,
  toExpPos: 40,
});

export { Decimal };

export type DecimalString = string;

export type DecimalInput = string | number | Decimal;

export function dec(value: DecimalInput): Decimal {
  return new Decimal(value);
}

export function sum(values: DecimalInput[]): Decimal {
  return values.reduce<Decimal>((acc, value) => acc.plus(dec(value)), new Decimal(0));
}

export function toDecimalString(value: DecimalInput, dp?: number): string {
  const d = dec(value);
  return dp === undefined ? d.toString() : d.toFixed(dp, Decimal.ROUND_HALF_EVEN);
}

export function bps(value: DecimalInput): Decimal {
  return dec(value).div(10000);
}

export function abs(value: DecimalInput): Decimal {
  return dec(value).abs();
}
