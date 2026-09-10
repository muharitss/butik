# TASK-024 — Attachment Schema, Cloudinary Integration, and API

## Objective
Add the `order_attachments` table and implement the Cloudinary-backed upload flow.

## Scope
- Add `OrderAttachment` model per `database/ERD.md`; migrate.
- Cloudinary SDK integration in `infrastructure/cloudinary/`.
- `POST /api/orders/:orderId/attachments/upload-signature`, `POST /api/orders/:orderId/attachments`, `GET /api/orders/:orderId/attachments`, `DELETE /api/orders/:orderId/attachments/:id` per `API.md#attachments`.

## Out of Scope
UI (Task 025).

## Dependencies
TASK-004, TASK-013.

## Architecture Context
`DECISIONS.md#D-006`; `BUSINESS-RULES.md#attachments`.

## Requirements
- Upload-signature endpoint returns a Cloudinary-signed payload scoped to a folder convention (e.g., `jahitflow/orders/<orderId>/`).
- Metadata-registration endpoint validates the `type` enum and stores the `secure_url`/`public_id`/optional dimensions.
- Delete: soft-deletes the row (`deleted_at`) and attempts a Cloudinary destroy call; logs (does not throw) on Cloudinary-side failure, per `DECISIONS.md#D-006`.
- File type/size validation server-side (accept jpg/png/webp, cap ~10MB) even though the actual bytes never pass through the backend — validate based on the metadata reported at registration time (format, and rely on Cloudinary's own upload preset constraints for size, configured as part of this task's Cloudinary setup).

## Implementation Notes
- Configure a Cloudinary upload preset (or signed params) enforcing the size/format constraints server-side at the Cloudinary layer, not just trusting client-reported metadata.

## Files / Modules
`backend/src/infrastructure/cloudinary/*`, `backend/prisma/schema.prisma` (OrderAttachment model, migrate), `backend/src/modules/attachments/*`.

## Validation
Integration tests: get signature, register metadata, list, soft-delete (mock or sandbox Cloudinary call for tests to avoid hitting the real service).

## Acceptance Criteria
Full direct-upload flow works end-to-end against a real Cloudinary sandbox account; soft-deleted attachments excluded from list.

## Definition of Done
Schema, Cloudinary integration, and API implemented and tested; audit entries verified.
