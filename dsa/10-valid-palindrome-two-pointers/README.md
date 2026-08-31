# 10 — Valid Palindrome (Two Pointers)

A string is a **palindrome** if it reads the same forwards and backwards
once you ignore everything that isn't a letter or a digit, and ignore
case. Return `true` or `false`.

Use **two pointers**, one starting at each end, walking toward the middle.
Building a cleaned, reversed copy also works — but the point of this
problem is the pointer walk, which needs no extra string at all.

## Signature

```js
/**
 * @param {string} s - any string (may be empty)
 * @returns {boolean} true if s is a palindrome ignoring case and all
 *                    non-alphanumeric characters
 */
export function isPalindrome(s) { ... }
```

## Worked examples

| Input | Output | Why |
|-------|--------|-----|
| `isPalindrome("A man, a plan, a canal: Panama")` | `true` | cleans to `amanaplanacanalpanama` |
| `isPalindrome("race a car")` | `false` | cleans to `raceacar` — `r` vs `r`, then `a` vs `a`, then `c` vs `c`, then `e` vs `a` ✗ |
| `isPalindrome(" ")` | `true` | no alphanumerics at all — vacuously a palindrome |
| `isPalindrome("0P")` | `false` | `0` and `P` are both alphanumeric and differ (case-folding must not turn `0` into `p`) |

## Constraints & edge cases

- Empty string → `true`. A string of only punctuation/spaces → `true`.
- Single alphanumeric character → `true`.
- "Alphanumeric" means `a`–`z`, `A`–`Z`, `0`–`9`. Everything else
  (spaces, commas, `_`, `'`, `?`) is skipped entirely.
- Case-insensitive: `"Aa"` → `true`.
- Digits participate: `"12321"` → `true`, `"12345"` → `false`.
- Don't mutate anything; the input is a string, so you can't anyway.
- Target: O(n) time and **O(1) extra space** — no cleaned copy of the
  string.

## Hints (take them one at a time!)

1. If you *could* assume the string was already stripped and lowercased,
   how would you check it? Compare the first character with the last, the
   second with the second-to-last, and so on. When do you stop?
2. Two indexes: `left = 0` and `right = s.length - 1`. Loop while
   `left < right`. Compare `s[left]` and `s[right]` (case-folded); if they
   differ, return `false`; otherwise move both inward. If the loop
   finishes, return `true`. That handles the clean case.
3. Now add the skipping. *Before* each comparison, advance `left` past any
   non-alphanumeric character (`while (left < right && !isAlnum(s[left]))
   left++;`) and pull `right` back the same way. Keep the `left < right`
   guard inside those inner loops so an all-punctuation string can't run
   off the end. Write a tiny `isAlnum(ch)` helper — a regex like
   `/[a-z0-9]/i.test(ch)` is fine.

## Run it

```
node --test dsa/10-valid-palindrome-two-pointers/attempt.test.js
```
