# 🏋️ Practice: Component Extraction

Do these after reading LEARN.md and the README. Solutions are at the bottom — try each exercise before peeking. (Everything here is checkable by reading and reasoning about your code — run the page later when you have internet, since React loads from a CDN.)

All exercises modify `refactored/index.html` unless they say otherwise.

## Exercises

### ⭐ 1. Give every member a role (warm-up)

The `TEAM` array knows each member's name, bio, and online status — but not their job title. Add a `role` field to every member (say Ada is `'Analyst'`, Grace is `'Compiler engineer'`, Alan is `'Theorist'`) and show it in gray right after the name in `MemberCard`. Because content is data here, this should touch exactly two places: the data rows and the one card template.

**Practices:** content-as-data — new information means a new field, not new markup.

**Hint:** `MemberCard` already reads `member.name`; the role travels the same road.

**Expected:** every card shows "Name Role" (role in gray), then the badge for online members, then the bio — and you never edited per-member markup, because there is none.

### ⭐⭐ 2. Show how many cards survived the filter (core)

Add a line under the input that reads like "Showing 2 of 3 members" and updates as you type. Rule: no new `useState` — both numbers must be computed during render from things `App` already has. This is the same *derived value* idea as `visibleMembers` itself.

**Practices:** derived values — never store what you can compute.

**Hint:** `visibleMembers.length` and `TEAM.length` already exist by the time you return JSX.

**Expected:** on load it says "Showing 3 of 3 members"; type "ada" and it says "Showing 1 of 3 members"; clear the box and it goes back to 3 of 3 — with zero extra state.

### ⭐⭐ 3. Fix the backwards filter (core)

A teammate "cleaned up" the filter line and now the page loads with the heading and the input but **zero cards**, even before anyone types. Here is their version:

```jsx
const visibleMembers = TEAM.filter((member) =>
  filter.toLowerCase().includes(member.name.toLowerCase()),
);
```

Explain why every card disappears on load, then fix the line.

**Practices:** reading `includes` carefully — which string is the haystack, which is the needle.

**Hint:** on load, `filter` is `''`. Ask: does the empty string contain "ada lovelace"?

**Expected:** after your fix, all three cards show on load, and typing "gra" leaves only Grace's card.

### ⭐⭐ 4. Predict what renders (core)

Without running anything, predict exactly what this shows on screen. Assume `Avatar` and `MemberCard` are defined exactly as in `refactored/index.html`. Note that `online` here is the *number* `0`, not `false`.

```jsx
const mystery = { id: 'zed', name: 'Zed', online: 0, bio: 'Keeps to themselves.' };

ReactDOM.createRoot(document.getElementById('root')).render(
  <MemberCard member={mystery} />,
);
```

Write down everything that appears inside the card, in order, and why.

**Practices:** what `&&` really returns, and which values React renders vs skips.

**Hint:** `0 && anything` doesn't evaluate to `false` — it evaluates to `0`. Is `0` on React's skip-list?

**Expected:** your written prediction matches the solution — including one character on screen most people don't expect.

### ⭐⭐⭐ 5. Online members first (challenge)

Sort the visible cards so online members appear above offline ones, while keeping the filter working. Rule: don't mutate `TEAM`, and don't add state — sorting is another derived step, downstream of the filter.

**Practices:** deriving a sorted list during render without mutating the source array.

**Hint:** `sort` rearranges the array it is called on, so copy first: `[...list].sort(...)`; a comparator can subtract two `online ? 1 : 0` scores.

**Expected:** on load the cards read Ada, Alan, Grace (online, online, offline); with "a" typed, the matching cards keep online-first order.

### ⭐⭐⭐ 6. A badge that guards itself (challenge)

Extract the online badge into its own component, `OnlineBadge`, which decides *by itself* whether to appear: it renders the badge for online members and renders nothing otherwise. After the extraction, `MemberCard` should contain no `&&` at all — just `<OnlineBadge online={member.online} />`.

**Practices:** component extraction plus `return null` — a component owning its own "should I appear?" logic.

**Hint:** a component that returns `null` puts nothing on the page (project 04 makes this a headline lesson).

**Expected:** the page looks identical to before — badges only on Ada and Alan — and as a bonus, the exercise-4 surprise can no longer happen, whatever weird `online` value the data carries.

## Solutions

### 1. Give every member a role

```jsx
const TEAM = [
  { id: 'ada', name: 'Ada Lovelace', online: true, role: 'Analyst',
    bio: 'First programmer. Writes notes longer than the program.' },
  { id: 'grace', name: 'Grace Hopper', online: false, role: 'Compiler engineer',
    bio: 'Invented the compiler. Found the first actual bug.' },
  { id: 'alan', name: 'Alan Turing', online: true, role: 'Theorist',
    bio: "Decides whether things halt. Usually they don't." },
];

function MemberCard({ member }) {
  return (
    <div className="card">
      <Avatar userId={member.id} />
      <strong style={{ marginLeft: 8 }}>{member.name}</strong>
      <span style={{ marginLeft: 8, color: '#666' }}>{member.role}</span>
      {member.online && <span style={{ marginLeft: 8 }} className="badge">online</span>}
      <p>{member.bio}</p>
    </div>
  );
}
```

**Why:** the facts live in `TEAM` and the look lives in `MemberCard`, so a new fact is one field per data row plus one line in one template. Compare the original file, where "add a role" would be three separate markup edits that could each drift — this is exactly the copy-paste tax the refactor eliminated.

### 2. Show how many cards survived the filter

```jsx
<input
  placeholder="filter by name..."
  value={filter}
  onChange={(e) => setFilter(e.target.value)}
/>
<p>Showing {visibleMembers.length} of {TEAM.length} members</p>
```

**Why:** both numbers already exist during render — `visibleMembers` is recomputed from `TEAM` and `filter` on every keystroke, so `.length` is always current. Storing a count in state would be a second copy of the truth that could disagree with the list; deriving it makes disagreement impossible.

### 3. Fix the backwards filter

```jsx
const visibleMembers = TEAM.filter((member) =>
  member.name.toLowerCase().includes(filter.toLowerCase()),
);
```

**Why:** `a.includes(b)` asks "does `a` contain `b`?" — the buggy version asked whether the *filter text* contains the member's *whole name*. On load `filter` is `''`, and `''.includes('ada lovelace')` is `false` for everyone, so every card vanished. The correct direction asks whether the name contains the typed text, and `'ada lovelace'.includes('')` is `true`, so an empty box shows all cards.

### 4. Predict what renders

The card shows: the avatar image, **Zed** in bold, then a bare **0**, then the bio "Keeps to themselves." There is no blue badge.

**Why:** `MemberCard` renders `{member.online && <span ...>online</span>}`. With `online` being `0`, the expression `0 && <span>...</span>` short-circuits and evaluates to `0` itself — `&&` returns its left side when that side is falsy. React skips `false`, `null`, and `undefined`, but `0` is *not* on the skip-list, so a literal `0` is printed as text (unstyled — the badge span never rendered, only the number did). This is the same famous gotcha project 04 demonstrates with `messages.length`.

### 5. Online members first

```jsx
const visibleMembers = TEAM.filter((member) =>
  member.name.toLowerCase().includes(filter.toLowerCase()),
);
const sortedMembers = [...visibleMembers].sort(
  (a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0),
);
```

Then map over the sorted list:

```jsx
{sortedMembers.map((member) => (
  <MemberCard key={member.id} member={member} />
))}
```

**Why:** each member gets a score (online = 1, offline = 0) and the comparator `b - a` puts higher scores first; JavaScript's sort is stable, so Ada stays ahead of Alan among the online members. `sort` mutates the array it runs on — here `filter` already produced a fresh array, but the `[...visibleMembers]` copy is the habit that protects you when there's no filter step in front (mutating `TEAM` would reorder it for every later render). It's still a plain derived value: filter state in, sorted list out, nothing stored.

### 6. A badge that guards itself

```jsx
function OnlineBadge({ online }) {
  if (!online) return null;
  return <span style={{ marginLeft: 8 }} className="badge">online</span>;
}

function MemberCard({ member }) {
  return (
    <div className="card">
      <Avatar userId={member.id} />
      <strong style={{ marginLeft: 8 }}>{member.name}</strong>
      <OnlineBadge online={member.online} />
      <p>{member.bio}</p>
    </div>
  );
}
```

**Why:** `return null` is a component's official way to render nothing, so the "should I appear?" decision now lives inside the badge instead of at every call site. `MemberCard` got simpler and can't get the condition wrong. And because the guard is `if (!online)` — a real truthiness check that returns `null` — a member with `online: 0` now renders no stray `0`: the number never reaches JSX at all.
