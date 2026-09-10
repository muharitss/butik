# TASK-007 — Customer UI

## Objective
Build the customer list/search, detail, create, and edit screens.

## Scope
- `features/customers/` with: list view (search box + paginated table/cards), detail view (contact info, notes, placeholder "order history" section to be filled once orders exist), create form, edit form.
- Mobile-first layout for the create/edit forms; desktop-friendly table for the list.

## Out of Scope
- Order history content (populated once Orders UI exists — this task only reserves the section with a placeholder).
- Measurement display (Task 012).

## Dependencies
TASK-003, TASK-006.

## Architecture Context
`ARCHITECTURE.md` §4 (Frontend Architecture, UI principles).

## Requirements
- List view: search input debounced against `GET /api/customers?q=`, paginated results.
- Create/edit forms: client-side validation mirroring server rules (required name), submits via `lib/apiClient`, surfaces the `meta.possibleDuplicate` warning from the API on create if present, allowing the operator to proceed or cancel.
- Detail view: shows contact info/notes, an "Edit" action, and a reserved `<OrderHistorySection customerId={id} />` placeholder component.

## Implementation Notes
- Keep the duplicate-warning UI simple: a dismissible banner, not a blocking modal.

## Files / Modules
`frontend/src/features/customers/*`.

## Validation
Manual walkthrough: create with a duplicate phone triggers the warning; search filters correctly; edit persists; soft-deleted customer disappears from list.

## Acceptance Criteria
- All four screens functional against the real API.
- Mobile layout usable on a narrow viewport for the forms.

## Definition of Done
- UI implemented and manually verified against TASK-006's API.
