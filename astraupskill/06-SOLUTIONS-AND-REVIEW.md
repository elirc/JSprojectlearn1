# Review guide and solution reasoning

Use this page after attempting the exercises. There is no single correct framework choice. A strong solution keeps business rules explicit, demonstrates failure behavior, and explains which assumptions make the design safe.

For the mission filter, derive one filtered collection from accepted notes, the normalized text query, and the selected mission. Calculate the page count from that collection. Clamp the current page before slicing, and reset the requested page when either filter changes. A common mistake is filtering only the twenty visible records, which hides matching records on later pages and reports an incorrect total. Test at least twenty-one notes to expose that bug.

For note archiving, put compatibility defaults at the runtime boundary. A migration that assumes every imported object already has `archivedAt` is incomplete. Preserve the identifier on archive and restore. The write must still use the editor's captured revision and epoch. If your archive button uses a fresh snapshot while an older editor is open, either disable that competing action or define how the draft is reconciled; silently rebasing the old draft is not a solution.

For an HTTP adapter, a useful update contract is an identifier in the route, a version in the request, and only editable fields in the body. Reject unknown or server-owned fields. The server returns the committed representation with its new version. The UI adopts that response after success. A network timeout creates uncertainty: the server might already have committed. Explain how a reread, operation identifier, or idempotency design resolves that uncertainty before adding automatic retries to mutations.

For SQL, the note update and audit insertion belong in the same transaction if the requirement is “every accepted update has an audit record.” Test rollback using a real database constraint or injected failure after the update but before commit. A mock that always returns success cannot establish rollback. An affected-row count of zero in a versioned update should follow a documented missing-versus-conflict policy. Ownership constraints must be part of the database query, not a hidden button in React.

In review, ask the author to trace one rejected save. Which object changes? Which object stays unchanged? What can the learner export? What happens after reload? Then ask them to trace a reset while an older tab remains open. They should explain why a new epoch prevents an old-generation write even if revision numbers coincide.

Mid-level readiness means handling those questions without depending on happy-path demonstrations. Look for focused tests, readable names, bounded inputs, explicit compatibility decisions, and honest limits. A polished screenshot supports usability review, but it cannot establish authorization, transaction correctness, or recovery from an interrupted deployment.
