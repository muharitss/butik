import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { computeOrderTotals } from "./modules/orders/orders.service.js";
import {
  validateTransition,
  ALLOWED_TRANSITIONS,
  ORDER_STATUSES,
  type OrderStatus,
  type TransitionOrderEntity
} from "./modules/orders/orders.rules.js";
import {
  validateRevisionTransition,
  ALLOWED_REVISION_TRANSITIONS,
  REVISION_STATUSES,
  type RevisionStatus
} from "./modules/revisions/revisions.rules.js";
import {
  toMoney,
  round,
  add,
  subtract,
  multiply,
  formatMoney,
  equals,
  isZero,
  isPositive,
  isNegative
} from "./shared/money/index.js";
import { ValidationError, BusinessRuleViolationError } from "./shared/errors/index.js";

test("Unit Tests — Core Business Logic & State Machines", async (t) => {
  // 1. Pricing Math (computeOrderTotals)
  await t.test("Pricing: calculates item subtotals, order subtotal and total accurately", () => {
    const items = [
      { garmentTypeId: "g1", quantity: 2, unitPrice: 150000, notes: "Kemeja" },
      { garmentTypeId: "g2", quantity: 1, unitPrice: 250000.5, notes: "Celana" }
    ];

    // Subtotal = (2 * 150000) + (1 * 250000.50) = 300000 + 250000.50 = 550000.50
    // Total = 550000.50 + additionalCost(50000) + expressFee(25000) - discount(10000) = 615000.50
    const result = computeOrderTotals(items, 50000, 25000, 10000);

    assert.equal(result.items.length, 2);
    assert.equal(formatMoney(result.items[0].subtotal), "300000.00");
    assert.equal(formatMoney(result.items[1].subtotal), "250000.50");
    assert.equal(formatMoney(result.subtotal), "550000.50");
    assert.equal(formatMoney(result.additionalCost), "50000.00");
    assert.equal(formatMoney(result.expressFee), "25000.00");
    assert.equal(formatMoney(result.discount), "10000.00");
    assert.equal(formatMoney(result.total), "615000.50");
  });

  await t.test("Pricing: handles zero additional costs and empty items cleanly", () => {
    const result = computeOrderTotals([]);
    assert.equal(result.items.length, 0);
    assert.equal(formatMoney(result.subtotal), "0.00");
    assert.equal(formatMoney(result.total), "0.00");
  });

  await t.test("Pricing: rejects discount that results in negative total", () => {
    const items = [{ garmentTypeId: "g1", quantity: 1, unitPrice: 100000 }];
    // Subtotal = 100000, discount = 150000 -> total = -50000 (rejected)
    assert.throws(
      () => computeOrderTotals(items, 0, 0, 150000),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /cannot be negative after discount/i);
        return true;
      }
    );
  });

  // 2. Order State Machine & Transition Rules (validateTransition)
  await t.test("Order State Machine: validates complete transition matrix", () => {
    // Valid transitions
    const validPairs: [OrderStatus, OrderStatus][] = [
      ["DRAFT", "CONFIRMED"],
      ["DRAFT", "CANCELLED"],
      ["CONFIRMED", "IN_PROGRESS"],
      ["CONFIRMED", "CANCELLED"],
      ["IN_PROGRESS", "FITTING"],
      ["IN_PROGRESS", "READY"],
      ["IN_PROGRESS", "CANCELLED"],
      ["FITTING", "REVISION"],
      ["FITTING", "READY"],
      ["FITTING", "CANCELLED"],
      ["REVISION", "FITTING"],
      ["REVISION", "CANCELLED"],
      ["READY", "COMPLETED"],
      ["READY", "REVISION"]
    ];

    for (const [from, to] of validPairs) {
      assert.ok(
        ALLOWED_TRANSITIONS[from].includes(to),
        `Expected transition from ${from} to ${to} to be allowed in matrix`
      );
    }

    // Terminal states cannot transition to anything
    assert.deepEqual(ALLOWED_TRANSITIONS["COMPLETED"], []);
    assert.deepEqual(ALLOWED_TRANSITIONS["CANCELLED"], []);
  });

  await t.test("Order State Machine: rejects illegal state transitions", () => {
    const mockOrder: TransitionOrderEntity = {
      id: "ord-1",
      status: "DRAFT",
      requiresFitting: true,
      total: new Prisma.Decimal(500000),
      paidTotalCache: new Prisma.Decimal(500000),
      items: [{ id: "item-1" }],
      customer: { id: "cust-1", deletedAt: null },
      measurementSnapshots: [{ id: "snap-1" }]
    };

    // DRAFT -> IN_PROGRESS is illegal (must go through CONFIRMED first)
    assert.throws(
      () => validateTransition(mockOrder, "IN_PROGRESS"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /Cannot transition order from DRAFT to IN_PROGRESS/i);
        return true;
      }
    );

    // COMPLETED -> CANCELLED is illegal (terminal state)
    assert.throws(
      () => validateTransition({ ...mockOrder, status: "COMPLETED" }, "CANCELLED"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        return true;
      }
    );
  });

  await t.test("Order Transition Guards: DRAFT->CONFIRMED requires >= 1 item, active customer, and snapshot", () => {
    const baseOrder: TransitionOrderEntity = {
      id: "ord-1",
      status: "DRAFT",
      requiresFitting: true,
      total: new Prisma.Decimal(100000),
      paidTotalCache: new Prisma.Decimal(0),
      items: [],
      customer: { id: "cust-1", deletedAt: null },
      measurementSnapshots: [{ id: "snap-1" }]
    };

    // 0 items
    assert.throws(
      () => validateTransition(baseOrder, "CONFIRMED"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /at least one item/i);
        return true;
      }
    );

    // Missing customer
    assert.throws(
      () => validateTransition({ ...baseOrder, items: [{ id: "it-1" }], customer: null }, "CONFIRMED"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /missing or inactive customer/i);
        return true;
      }
    );

    // Missing snapshot
    assert.throws(
      () =>
        validateTransition(
          { ...baseOrder, items: [{ id: "it-1" }], measurementSnapshots: [] },
          "CONFIRMED"
        ),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /measurement snapshot/i);
        return true;
      }
    );
  });

  await t.test("Order Transition Guards: IN_PROGRESS->READY is blocked if requiresFitting is true", () => {
    const order: TransitionOrderEntity = {
      id: "ord-1",
      status: "IN_PROGRESS",
      requiresFitting: true,
      total: new Prisma.Decimal(200000),
      paidTotalCache: new Prisma.Decimal(0)
    };

    assert.throws(
      () => validateTransition(order, "READY"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /requires fitting/i);
        return true;
      }
    );

    // Allowed when requiresFitting is false
    assert.doesNotThrow(() => validateTransition({ ...order, requiresFitting: false }, "READY"));
  });

  await t.test("Order Transition Guards: FITTING->READY is blocked if open revisions exist", () => {
    const order: TransitionOrderEntity = {
      id: "ord-1",
      status: "FITTING",
      requiresFitting: true,
      total: new Prisma.Decimal(200000),
      paidTotalCache: new Prisma.Decimal(0),
      revisions: [{ status: "OPEN" }]
    };

    assert.throws(
      () => validateTransition(order, "READY"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /open revisions exist/i);
        return true;
      }
    );

    // When all revisions resolved -> allowed
    assert.doesNotThrow(() =>
      validateTransition({ ...order, revisions: [{ status: "RESOLVED" }] }, "READY")
    );
  });

  await t.test("Order Transition Guards: READY->COMPLETED requires remaining balance <= 0", () => {
    const order: TransitionOrderEntity = {
      id: "ord-1",
      status: "READY",
      requiresFitting: true,
      total: new Prisma.Decimal(300000),
      paidTotalCache: new Prisma.Decimal(200000) // 100,000 remaining
    };

    assert.throws(
      () => validateTransition(order, "COMPLETED"),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /outstanding balance/i);
        return true;
      }
    );

    // Fully paid (paidTotal == total) -> allowed
    assert.doesNotThrow(() =>
      validateTransition({ ...order, paidTotalCache: new Prisma.Decimal(300000) }, "COMPLETED")
    );
  });

  await t.test("Order Transition Guards: Cancellations and READY->REVISION require non-empty reason", () => {
    const order: TransitionOrderEntity = {
      id: "ord-1",
      status: "CONFIRMED",
      requiresFitting: true,
      total: new Prisma.Decimal(100000),
      paidTotalCache: new Prisma.Decimal(0)
    };

    // No reason on cancellation
    assert.throws(
      () => validateTransition(order, "CANCELLED", ""),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /Reason is required/i);
        return true;
      }
    );

    // With reason -> allowed
    assert.doesNotThrow(() =>
      validateTransition(order, "CANCELLED", "Customer cancelled event")
    );

    // Reopen READY to REVISION requires reason
    const readyOrder: TransitionOrderEntity = { ...order, status: "READY" };
    assert.throws(
      () => validateTransition(readyOrder, "REVISION", "   "),
      (err: unknown) => {
        assert.ok(err instanceof BusinessRuleViolationError);
        assert.match(err.message, /Reason is required when reopening/i);
        return true;
      }
    );
  });

  // 3. Revision State Machine (validateRevisionTransition)
  await t.test("Revision State Machine: validates transition matrix", () => {
    // OPEN -> IN_PROGRESS, RESOLVED, CANCELLED
    assert.doesNotThrow(() => validateRevisionTransition("OPEN", "IN_PROGRESS"));
    assert.doesNotThrow(() => validateRevisionTransition("OPEN", "RESOLVED"));
    assert.doesNotThrow(() => validateRevisionTransition("OPEN", "CANCELLED"));

    // IN_PROGRESS -> RESOLVED, CANCELLED
    assert.doesNotThrow(() => validateRevisionTransition("IN_PROGRESS", "RESOLVED"));
    assert.doesNotThrow(() => validateRevisionTransition("IN_PROGRESS", "CANCELLED"));

    // Terminal states cannot transition
    assert.throws(() => validateRevisionTransition("RESOLVED", "OPEN"));
    assert.throws(() => validateRevisionTransition("RESOLVED", "IN_PROGRESS"));
    assert.throws(() => validateRevisionTransition("CANCELLED", "OPEN"));
  });

  // 4. Payment Balance Math
  await t.test("Payment Balance: accurately evaluates remaining balance and payment status", () => {
    const orderTotal = round(toMoney(500000));

    // Case 1: No payments -> UNPAID
    let paidTotal = round(toMoney(0));
    let remaining = round(subtract(orderTotal, paidTotal));
    assert.equal(formatMoney(remaining), "500000.00");
    assert.ok(isZero(paidTotal));

    // Case 2: Down payment of 200,000 -> PARTIAL
    const dp = round(toMoney(200000));
    paidTotal = add(paidTotal, dp);
    remaining = round(subtract(orderTotal, paidTotal));
    assert.equal(formatMoney(paidTotal), "200000.00");
    assert.equal(formatMoney(remaining), "300000.00");

    // Case 3: Final payment of 300,000 -> PAID
    const finalPmt = round(toMoney(300000));
    paidTotal = add(paidTotal, finalPmt);
    remaining = round(subtract(orderTotal, paidTotal));
    assert.equal(formatMoney(paidTotal), "500000.00");
    assert.equal(formatMoney(remaining), "0.00");
    assert.ok(isZero(remaining));

    // Case 4: Overpayment prevention calculation
    const overpayment = round(toMoney(50000));
    const isExceeding = isPositive(subtract(add(paidTotal, overpayment), orderTotal));
    assert.ok(isExceeding, "Amount exceeding total must be detected");
  });
});
