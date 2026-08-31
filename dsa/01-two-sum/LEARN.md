# 📘 Learning Guide: Two Sum

The "hello world" of interview problems — and your first taste of the most
useful trick in all of DSA: trading memory for speed.

## 1. The problem in plain words

You get a list of numbers and a target. Somewhere in that list, exactly two
of the numbers add up to the target. Your job: say *where* they are — their
positions (indices), not their values.

```
nums = [2, 7, 11, 15], target = 9
        ↑  ↑
     index 0 + index 1  →  2 + 7 = 9  →  answer: [0, 1]
```

That's it. The whole challenge is doing it *fast* when the list is huge.

## 2. Concepts you need first

### Indices vs values

`nums[3]` is the *value* stored at *index* 3. This problem returns indices.
If you ever catch yourself returning `[2, 7]` instead of `[0, 1]`, you've
mixed them up.

### The Map — a lookup table

A `Map` stores key → value pairs and can answer "do you have this key?"
essentially instantly, no matter how many entries it holds:

```js
const m = new Map();
m.set("apple", 3);     // remember: "apple" is at 3
m.has("apple");        // true
m.get("apple");        // 3
m.has("banana");       // false
m.set("apple", 99);    // setting again OVERWRITES
m.get("apple");        // 99
```

Run that in a Node REPL (`node`, then paste). The magic phrase: `has`,
`get`, and `set` are all **O(1)** — constant time. A 10-entry map and a
10-million-entry map answer equally fast.

Contrast with an array, where "have I seen 7?" means `nums.includes(7)` —
which *walks the whole array* to find out. That's O(n) per question.

### Why not a plain object `{}`?

You could write `seen[value] = index`. It mostly works, but object keys
are silently converted to strings (`seen[7]` is really `seen["7"]`), and
objects come with inherited surprise keys like `"constructor"`. `Map` has
none of that baggage. For lookup tables, reach for `Map`.

## 3. How to think about it

Say the slow plan out loud first: "for every element, look at every other
element and check the sum." Two nested loops. It works. Now *listen* to
what the inner loop is doing: at element `2` (target 9) it scans the rest
of the array hunting for a `7`.

But you *know* what you're hunting for! `target - x` is one specific
number. Scanning for one specific number is exactly what a Map does in
O(1). So the plan becomes:

> Walk the array once. At each element, ask the map "have you seen my
> partner?" If yes — done. If no — tell the map about *me* and step
> forward.

One pass. Each element is asked about once and recorded once. Say this
plan out loud before coding it — if you can say it, you can code it.

## 4. Common wrong turns

- **Recording yourself before asking about your partner.** If
  `target = 8` and you're standing on a `4`, you'd find *yourself* in the
  map and answer `[0, 0]`. Always check first, store second.
- **Sorting the array.** Sorting helps many problems, but it shuffles
  positions — and positions are the answer here.
- **Breaking on duplicates.** `[3, 3]` with target 6 is legal. Trace it by
  hand with the check-first plan: it just works. If your version fails it,
  you're probably storing before checking.
- **Forgetting negative numbers.** `target - x` can be negative; the map
  doesn't care, but a mental model of "counting up" might.

## 5. The solution, step by step

```js
export function twoSum(nums, target) {
  const seen = new Map();                 // value -> index

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];        // my partner's exact value

    if (seen.has(need)) {                 // partner already walked past?
      return [seen.get(need), i];         // earlier index first: sorted free
    }

    seen.set(nums[i], i);                 // introduce myself, move on
  }

  throw new Error("no two numbers add up to the target");
}
```

Trace `twoSum([3, 2, 4], 6)` by hand:

| i | nums[i] | need | map has need? | map after |
|---|---------|------|---------------|-----------|
| 0 | 3 | 3 | no | {3→0} |
| 1 | 2 | 4 | no | {3→0, 2→1} |
| 2 | 4 | 2 | **yes** (at 1) | → return [1, 2] |

Hand-tracing like this is a skill worth practicing — it's how you debug
without a debugger.

## 6. Complexity, gently

"O(n)" answers: *if the input doubles, how much longer do I take?*

- **Naive (two loops): O(n²).** Double the input → four times the work.
  1,000 elements ≈ 500,000 pair checks.
- **Map version: O(n) time.** Double the input → double the work. 1,000
  elements ≈ 1,000 steps. Each step's map operations are O(1), so they
  don't multiply.
- **Space: O(n)** for the map — up to one entry per element. The naive
  version used no extra memory. You *bought* speed *with* memory. This
  exact trade shows up in problems 06, 07, 08, and 09 — it is the single
  highest-value move in this track.

## 7. Words you learned

- **Index** — a position in an array (0-based).
- **Hash map / `Map`** — key→value store with O(1) lookup.
- **O(1) / constant time** — cost doesn't grow with input size.
- **O(n) / linear time** — cost grows in step with input size.
- **O(n²) / quadratic time** — cost grows with the *square* of input size.
- **Time–space tradeoff** — spending memory to avoid repeated work.

## 8. Variations to try

1. **twoSumValues(nums, target)** — return the two *values* instead of
   indices, sorted ascending. `twoSumValues([3,2,4], 6)` → `[2, 4]`.
2. **twoSumAll(nums, target)** — drop the "exactly one answer" promise and
   return *all* index pairs, e.g. `twoSumAll([1,2,3,4,5], 6)` →
   `[[1,3],[0,4]]` (each pair found when its second element is reached).
3. **twoSumOrNull(nums, target)** — return `null` instead of throwing when
   no pair exists. One-line change; find it.
4. **countPairs(nums, target)** — just count how many pairs sum to target
   (careful: duplicates like `[2,2,2]`, target 4 → 3 pairs). Harder than
   it looks; try brute force first, then a count-map.
