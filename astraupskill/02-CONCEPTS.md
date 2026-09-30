# Five concepts behind trustworthy local CRUD

## Accepted state and draft state

Suppose a saved note says “Validate on the server,” while its editor says “Validate on both client and server.” The second sentence is a proposal. Until storage accepts it, the card and exported accepted progress should still describe the first sentence. This distinction matters when quota is exhausted, another tab has changed the record, or validation rejects the proposal. In this application, note fields and mission responses stay local until an explicit save or checkpoint submission.

```ts
const candidate = updateNote(base, { id, missionId, title, body });
const accepted = await persistProgress(candidate);
// Adopt accepted only after the awaited write succeeds.
```

This abbreviated example omits the catalog validation performed by `App.commitProgress`. In a server application, replace `persistProgress` with a request that returns the committed server representation. Do not assign a new version yourself and call that a successful database update.

## Identity and optimistic concurrency

An identifier answers “which note?” A revision answers “which accepted snapshot did this editor read?” Two tabs can hold the same note identifier and different revisions. SkillForge uses a revision for the entire progress document, so unrelated edits can conflict. This is deliberately simpler than merging notes independently. Web Locks serialize the read-compare-write sequence between cooperating tabs. A lock without a version check would merely serialize two overwrites; a version check without coordination could let both writers observe the same old revision.

An epoch identifies a reset generation. Resetting revision 9 to revision 0 alone could eventually make an old revision-1 tab appear current again. Reset creates a new epoch, so an old-generation proposal remains stale even when its numeric revision matches.

## Runtime boundaries and relationships

JSON is untrusted input even when it came from your own export yesterday. The schema rejects unknown properties, invalid counts, excessive sizes, and inconsistent review records. The catalog check rejects unknown missions and impossible completion relationships. Maximum lengths protect both usability and storage. A four-mebibyte serialized limit is checked in UTF-8 bytes; character count alone differs for emoji and other multibyte text.

## Failure is a state transition

A quota error should produce an unchanged accepted record, a retained candidate, and a visible explanation. It should not become a success toast followed by lost data. Exporting pending data gives the learner an escape route before reloading current progress. Corrupt original data is preserved and can be exported raw before a confirmed reset.

## The server-side analogue of each local mechanism

This is the one on-stack project in its batch, so name the bridge explicitly. The `revision` compare-and-swap in `storage.ts` is `If-Match` with an ETag, or a `version` column with a conditional `UPDATE ... WHERE id = ? AND version = ?` on an Express or Next route; the row count is the answer, and 0 rows is the 409 the local code raises. `navigator.locks` is a database transaction (or a row lock, `SELECT ... FOR UPDATE`) around the read-modify-write. `normalizeProgress` is a Zod schema at the route handler: parse the body, never touch `req.body` directly. "Preserve corrupt raw bytes" is the rule that a server never overwrites a row it failed to parse: read, fail loudly, leave the row, and let a migration or an operator decide. Draft-versus-accepted state is the React form's local state versus the last server response, with the same adoption rule: only adopt what the server accepted. Do the `newcodexJS/07` course next and map each of these five sentences to a line in it.

## Transfer to a CRUD API

A SQL equivalent can use `UPDATE notes SET body = ?, version = version + 1 WHERE id = ? AND version = ?`. Zero affected rows requires distinguishing a missing record from a conflict according to your API contract. Authorization must constrain the same query by owner or tenant. Browser revisions teach concurrency, but they provide no authorization: a user can edit their own local storage directly.
