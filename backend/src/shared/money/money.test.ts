import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  toMoney,
  add,
  subtract,
  multiply,
  round,
  compare,
  isEqual,
  isGreaterThan,
  isGreaterThanOrEqual,
  isLessThan,
  isLessThanOrEqual,
  isZero,
  isPositive,
  isNegative,
  formatMoney
} from "./money.js";

test("toMoney conversion", () => {
  const fromStr = toMoney("125000.50");
  assert.equal(fromStr.toString(), "125000.5");

  const fromNum = toMoney(50000);
  assert.equal(fromNum.toString(), "50000");

  const fromDec = toMoney(new Prisma.Decimal("75000"));
  assert.equal(fromDec.toString(), "75000");

  assert.throws(() => toMoney(NaN), /Invalid monetary amount/);
  assert.throws(() => toMoney(Infinity), /Invalid monetary amount/);
});

test("decimal-safe arithmetic avoids floating point inaccuracies", () => {
  // In native JS: 0.1 + 0.2 === 0.30000000000000004
  const sum = add("0.1", "0.2");
  assert.equal(sum.toString(), "0.3");
  assert.equal(formatMoney(sum), "0.30");

  // Subtract
  const diff = subtract("100000.75", "25000.50");
  assert.equal(diff.toString(), "75000.25");

  // Multiply
  const product = multiply("150000", "0.1"); // e.g. 10% discount or tax
  assert.equal(product.toString(), "15000");
});

test("rounding uses ROUND_HALF_UP", () => {
  // Half-up rounding tests
  assert.equal(round("10.555").toString(), "10.56");
  assert.equal(round("10.554").toString(), "10.55");
  assert.equal(round("10.555", 1).toString(), "10.6");
  assert.equal(round("10.555", 0).toString(), "11");
});

test("comparisons and predicates", () => {
  assert.equal(compare("100", "200"), -1);
  assert.equal(compare("200", "200"), 0);
  assert.equal(compare("300", "200"), 1);

  assert.equal(isEqual("150000.00", "150000"), true);
  assert.equal(isEqual("150000", "150001"), false);

  assert.equal(isGreaterThan("200", "100"), true);
  assert.equal(isGreaterThan("100", "200"), false);
  assert.equal(isGreaterThanOrEqual("200", "200"), true);

  assert.equal(isLessThan("100", "200"), true);
  assert.equal(isLessThan("200", "100"), false);
  assert.equal(isLessThanOrEqual("100", "100"), true);

  assert.equal(isZero("0"), true);
  assert.equal(isZero("0.00"), true);
  assert.equal(isZero("1"), false);

  assert.equal(isPositive("500"), true);
  assert.equal(isPositive("0"), false);
  assert.equal(isPositive("-10"), false);

  assert.equal(isNegative("-10"), true);
  assert.equal(isNegative("0"), false);
  assert.equal(isNegative("10"), false);
});

test("formatMoney produces standard two decimal places", () => {
  assert.equal(formatMoney("150000"), "150000.00");
  assert.equal(formatMoney("1234.5"), "1234.50");
  assert.equal(formatMoney(new Prisma.Decimal("9999.99")), "9999.99");
});
