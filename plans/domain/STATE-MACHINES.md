# JahitFlow — State Machines

## Order

### States
`DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `FITTING`, `REVISION`, `READY`, `COMPLETED`, `CANCELLED`

### Transition Table

| From | To | Trigger | Guard / Side Effect |
|---|---|---|---|
| `DRAFT` | `CONFIRMED` | Operator confirms order | Requires ≥1 order item, a customer, and an existing measurement snapshot. |
| `CONFIRMED` | `IN_PROGRESS` | Operator marks production started | No additional guard. |
| `IN_PROGRESS` | `FITTING` | Operator schedules/records a fitting | Creates or links a `Fitting` row (fitting creation is what drives this transition, not a separate manual toggle). |
| `FITTING` | `REVISION` | Fitting recorded with `result=NEEDS_REVISION` | Expects an associated `Revision` (soft rule, see `BUSINESS-RULES.md#fitting`). |
| `FITTING` | `READY` | Fitting recorded with `result=APPROVED` | No open (`OPEN`/`IN_PROGRESS`) revisions may exist. |
| `REVISION` | `FITTING` | All open revisions resolved and a new fitting is recorded | Loop back to re-fit after alteration. |
| `READY` | `COMPLETED` | Operator marks order complete | Requires `remaining_balance <= 0`. |
| `READY` | `REVISION` | Reopen: customer requests further alteration before handover | Requires a reason; logged in `order_status_histories`. |
| `DRAFT`/`CONFIRMED`/`IN_PROGRESS`/`FITTING`/`REVISION` | `CANCELLED` | Operator cancels | Requires a reason. Does not auto-reverse payments (see `BUSINESS-RULES.md#payment`). |
| any other pair | — | — | **Forbidden.** Includes: `COMPLETED → *` (final), `CANCELLED → *` (final), skipping states (e.g., `DRAFT → READY` directly), `READY → CANCELLED` (must reopen to `REVISION` first if cancellation is genuinely needed at that stage — treated as an edge case requiring manual audit review rather than a one-click transition). |

### Notes
- Transitions are never skipped even when an intermediate step feels redundant for a simple order (e.g., an order with no fitting needed still passes through `FITTING` implicitly is **not** required — see next point).
- **Simple orders without fitting:** Some small orders may not need a fitting at all. In that case the allowed path is `IN_PROGRESS → READY` directly, treated as a distinct transition guarded by an explicit "no fitting required" flag set at order confirmation time (`order.requires_fitting: boolean`, default `true`). If `requires_fitting=false`, `IN_PROGRESS → READY` is legal without a `Fitting` row; if `true`, `READY` is only reachable via `FITTING`.
- All transitions write an `OrderStatusHistory` row with `from_status`, `to_status`, `changed_by` (actor), optional `reason`, `changed_at`.

## Fitting

### States
`SCHEDULED`, `DONE`, `CANCELLED`

### Transitions
| From | To | Trigger | Guard |
|---|---|---|---|
| `SCHEDULED` | `DONE` | Operator records outcome | Requires `result` ∈ {`APPROVED`, `NEEDS_REVISION`} to be set at the same time. |
| `SCHEDULED` | `CANCELLED` | Fitting cancelled/no-show | Optional note. |
| `DONE` | — | — | Terminal; no further transition. A mistaken result is corrected by recording a new `Fitting` row referencing the old one via note, not by editing the terminal record. |

## Revision

### States
`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`

### Transitions
| From | To | Trigger | Guard |
|---|---|---|---|
| `OPEN` | `IN_PROGRESS` | Operator begins work on the alteration | — |
| `IN_PROGRESS` | `RESOLVED` | Alteration completed | Sets `resolved_at`. |
| `OPEN` | `RESOLVED` | Alteration completed without an intermediate "in progress" step | Sets `resolved_at`. Allowed since small shops may resolve immediately. |
| `OPEN`/`IN_PROGRESS` | `CANCELLED` | Revision determined unnecessary | Optional note. |
| `RESOLVED`/`CANCELLED` | — | — | Terminal. |

## Payment (Rules, Not a Formal State Machine)

Payments do not have a lifecycle state — each row is a single immutable fact (`type`, `amount`, timestamp). What *does* have state is the **order's derived payment status**, computed (not stored as an independently-editable field, though cached for query performance):

```
paid_total = sum(payments.amount) for the order
remaining_balance = order.total - paid_total

payment_status =
  UNPAID      if paid_total <= 0
  PARTIAL     if 0 < paid_total < order.total
  PAID        if paid_total >= order.total
```

`order.paid_total_cache` and `order.payment_status_cache` are denormalized columns recomputed inside the same transaction as any payment insert, purely for read performance — the summed-payments calculation above remains the authoritative definition and is what integration tests must validate against, not the cache in isolation.
