# QA only: Starfall Lake map-only offline update
Do not merge this draft. No deployment or production saves are involved.
The checked-in text patch and four assets from the pinned source commits
reconstruct the game tree exactly; the staged service worker and all test
data run on loopback in isolated Chromium. Each matrix job reports whether
two disposable saves reopen offline after success or deliberate failure
(corrupt response or insufficient quota). This is not a physical Android
test or an authorization to release. Existing source PRs are not changed.
