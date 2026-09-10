import { Prisma } from "@prisma/client";

export type MoneyInput = Prisma.Decimal | string | number;

/**
 * Converts a string, number, or Decimal to a Prisma.Decimal.
 * Numbers are converted via string representation to prevent floating point inaccuracy.
 */
export function toMoney(value: MoneyInput): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid monetary amount: ${value}`);
    }
    return new Prisma.Decimal(value.toString());
  }
  return new Prisma.Decimal(value);
}

/**
 * Adds two monetary amounts: a + b
 */
export function add(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return toMoney(a).add(toMoney(b));
}

/**
 * Subtracts b from a: a - b
 */
export function subtract(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return toMoney(a).sub(toMoney(b));
}

/**
 * Multiplies an amount by a factor: a * factor
 */
export function multiply(a: MoneyInput, factor: MoneyInput): Prisma.Decimal {
  return toMoney(a).mul(toMoney(factor));
}

/**
 * Rounds an amount to specified decimal places using ROUND_HALF_UP (default 2 decimals).
 */
export function round(amount: MoneyInput, decimalPlaces = 2): Prisma.Decimal {
  return toMoney(amount).toDecimalPlaces(decimalPlaces, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * Compares two amounts:
 * returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compare(a: MoneyInput, b: MoneyInput): number {
  return toMoney(a).cmp(toMoney(b));
}

/**
 * Checks if a equals b
 */
export function isEqual(a: MoneyInput, b: MoneyInput): boolean {
  return toMoney(a).equals(toMoney(b));
}

/**
 * Checks if a > b
 */
export function isGreaterThan(a: MoneyInput, b: MoneyInput): boolean {
  return toMoney(a).greaterThan(toMoney(b));
}

/**
 * Checks if a >= b
 */
export function isGreaterThanOrEqual(a: MoneyInput, b: MoneyInput): boolean {
  return toMoney(a).greaterThanOrEqualTo(toMoney(b));
}

/**
 * Checks if a < b
 */
export function isLessThan(a: MoneyInput, b: MoneyInput): boolean {
  return toMoney(a).lessThan(toMoney(b));
}

/**
 * Checks if a <= b
 */
export function isLessThanOrEqual(a: MoneyInput, b: MoneyInput): boolean {
  return toMoney(a).lessThanOrEqualTo(toMoney(b));
}

/**
 * Checks if amount is exactly zero
 */
export function isZero(a: MoneyInput): boolean {
  return toMoney(a).isZero();
}

/**
 * Checks if amount is strictly positive (> 0)
 */
export function isPositive(a: MoneyInput): boolean {
  const decimal = toMoney(a);
  return decimal.isPositive() && !decimal.isZero();
}

/**
 * Checks if amount is strictly negative (< 0)
 */
export function isNegative(a: MoneyInput): boolean {
  return toMoney(a).isNegative();
}

/**
 * Formats a monetary value to standard 2-decimal string representation.
 */
export function formatMoney(amount: MoneyInput): string {
  return toMoney(amount).toFixed(2);
}
