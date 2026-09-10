# TASK-030 — WhatsApp Link Helper

## Objective
Implement the WhatsApp deep-link generator for outbound communication.

## Scope
- `GET /api/orders/:orderId/whatsapp-link?template=` per `API.md#whatsapp`.
- Message templates for: order confirmation, ready notification, payment reminder — each pulling relevant order data (order number, deadline, remaining balance as applicable) into a filled template string.
- Frontend button(s) on order detail ("Send confirmation via WhatsApp" etc.) opening the returned URL in a new tab.

## Out of Scope
Any actual message-sending automation (per `DECISIONS.md#D-007`, explicit non-goal).

## Dependencies
TASK-016, TASK-018.

## Architecture Context
`DECISIONS.md#D-007`; `BUSINESS-RULES.md#customer` (phone normalization).

## Requirements
- Phone number normalized to international format for the `wa.me` link (leading `0` → `62`, strip non-digits) using the same normalization logic referenced in `BUSINESS-RULES.md#customer`.
- Message text URL-encoded correctly.

## Implementation Notes
Keep templates as simple string-interpolation functions; no templating engine needed for three short templates.

## Files / Modules
`backend/src/modules/whatsapp/*`, `frontend/src/features/orders/*` (buttons).

## Validation
Manual test: generated links open WhatsApp with the correct pre-filled message for a real test number.

## Acceptance Criteria
All three templates produce correct, correctly-encoded links.

## Definition of Done
Feature implemented and verified manually.
