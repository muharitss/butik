# TASK-025 — Attachment UI

## Objective
Build the attachment upload/gallery UI on the order detail page.

## Scope
- Upload control (camera/file picker, mobile-friendly) that: requests a signature, uploads directly to Cloudinary, then registers metadata.
- Gallery grid of attachments grouped by type, with delete action.

## Out of Scope
None beyond standard scope.

## Dependencies
TASK-003, TASK-017, TASK-024.

## Architecture Context
`DECISIONS.md#D-006` (direct-upload flow).

## Requirements
- Upload progress indicator; graceful error handling if the direct Cloudinary upload fails (metadata is never registered in that case, so no orphaned DB row).

## Implementation Notes
None.

## Files / Modules
`frontend/src/features/attachments/*`, updates to `frontend/src/features/orders/*`.

## Validation
Manual walkthrough: upload a photo from a phone browser, confirm it appears in the gallery, delete it, confirm removal.

## Acceptance Criteria
Attachment section fully functional.

## Definition of Done
UI implemented and manually verified.
