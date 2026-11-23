# TMS – Specification Approval Workflow

A small static web app (HTML, CSS, plain JavaScript, no build step) where a specification is written as a draft, submitted for approval, approved or rejected, and needs approving again when its requirements change.

## Statuses

| Status | Meaning | Next |
|---|---|---|
| Draft | Newly created; the author can edit it | Submit → Pending approval |
| Pending approval | Waiting for an approver; editing is locked | Approve → Approved, Reject (comment required) → Rejected |
| Approved | Agreed requirements | Requirements changed → Re-approval required |
| Rejected | Sent back with a comment; the author can edit it | Submit → Pending approval |
| Re-approval required | Requirements changed after approval; the version goes up by 1 | Submit → Pending approval |

Rules:
- Only the author edits or submits a specification. Only a user with the **Approver** role who is not the author approves or rejects it.
- Only a change to the requirements text revokes approval. A title change, or a change of surrounding whitespace only, keeps the specification approved.
- Every action is added to the specification's history (action, user, time, version, comment). History entries are never changed.
- When re-approval is needed, the previously approved requirements are shown next to the current ones.

## Files

- `approval.js`: the workflow rules as pure functions (`createSpec`, `editSpec`, `submitSpec`, `approveSpec`, `rejectSpec`).
- `app.js`, `index.html`, `styles.css`: the user interface. Data is saved in `localStorage` (`tms.specs.v1`, `tms.user.v1`).
- `tests/approval.test.js`: unit tests, run with `npm test` (Node 18+).

## Limitations

There is no backend or sign-in. The user switcher (name + role) stands in for the signed-in user, and the data stays in the browser, so roles are not a security boundary.
