# Practice toward mid-level CRUD development

Complete these tasks in order. Keep each change small enough to explain in a code review. Before coding, write the expected success state and at least one failure state. The current implementation is a reference for local boundaries, not a completed backend architecture.

## 1. Improve journal navigation

Add a mission filter beside the text search. Filtering should combine both conditions, reset the displayed page when the filter changes, and show an informative empty state. Test a note that matches the text but belongs to a different mission. Then delete the last note on the final page and verify that pagination stays valid. This exercise teaches derived state and collection boundaries without introducing a server.

## 2. Add an explicit archive operation

Design `archivedAt` for notes. Existing saves should load without the field. Decide whether archived notes appear in search by default and whether editing restores them. Add Restore as a separate action. Preserve note identity and use the existing revision boundary. Verify that an archive operation from a stale editor cannot overwrite another tab's edit. Explain why archive and delete have different user expectations.

## 3. Implement an HTTP note repository

Create a separate practice backend and substitute an adapter behind the UI. Define request and response DTOs for create, list, update, and delete. Include a stable identifier and version in returned records. Use appropriate success statuses and documented validation, missing-record, and conflict responses. Keep the editor open when a request fails. Add an abortable list request so a slow older search cannot replace newer results. Do not hard-code success data into the component.

## 4. Move invariants into SQL transactions

Create users, notes, and note audit tables. An update must change the note and insert an audit row in one transaction. Inject an audit insertion failure and prove that the note remains unchanged. Use a conditional version update and run two competing requests against the same row. Assert one winner and one conflict, not merely two HTTP responses. Add a uniqueness constraint where the business rule actually requires uniqueness; note titles need not be unique just because identifiers are.

## 5. Add ownership and operational evidence

Introduce authenticated users using a deliberate learning setup. Every read and write must constrain ownership server-side. Try another user's identifier and prove that the API does not leak the record. Add request identifiers and structured error logs without recording note bodies or credentials. Document how you would diagnose “Save failed” from the browser to the database.

Finish by reviewing the tradeoffs: whole-document revisions versus row versions, local backups versus server backups, offset pagination versus cursors, and a synchronous audit transaction versus asynchronous notifications. Give a concrete trigger for changing each design. Avoid adding infrastructure only because a tutorial mentions it.
