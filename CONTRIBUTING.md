# SyncSpace — Team Git Workflow

Read this once, fully, before your first commit. It's short on purpose.

## Branches

- `main` — always working. Only updated by merging `dev` in, weekly, once tested.
- `dev` — integration branch. Everyone's finished work lands here first.
- `feature/<short-name>` — one per task, e.g. `feature/mongo-persistence`,
  `feature/jwt-auth`, `feature/canvas-editing`

**Rule: nobody pushes directly to `main` or `dev`.** Both are protected on
GitHub — a direct push will be rejected. Everything goes through a Pull
Request (PR).

---

## A) One-time setup — every teammate does this once

```bash
git clone https://github.com/Darkstar080/SyncSpace.git
cd SyncSpace
```

That last line turns on a local safety check that blocks accidental direct
pushes to `main`/`dev` before they even leave your machine. Don't skip it.

Then install both projects:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## B) Daily workflow — every task, every person

**1. Start a new task from an up-to-date `dev`:**
```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-task-name
```

**2. Work, commit often, with clear messages:**
```bash
git add .
git commit -m "feat: add shape selection to canvas"
```
Prefixes to use: `feat:` (new functionality), `fix:` (bug fix), `chore:`
(config/cleanup, no feature change).

**3. Push your branch:**
```bash
git push -u origin feature/your-task-name
```
(Only the first push needs `-u`; after that, just `git push`.)

**4. Open a Pull Request on GitHub:**
- Base branch: `dev`  ← Compare branch: `feature/your-task-name`
- Short description of what you changed and why
- Request a review (from the team lead, at least for the first couple of weeks)

**5. Address review feedback by pushing more commits to the same branch** —
the PR updates automatically, no need to open a new one.

**6. Once approved, merge** (usually "Squash and merge," to keep `dev`'s
history clean).

---

## C) If `dev` has moved on while you were working

Before you finish, sync your branch so you're not merging stale code:
```bash
git checkout feature/your-task-name
git fetch origin
git merge origin/dev
```
Resolve any conflicts shown, then:
```bash
git add .
git commit -m "merge dev into feature branch"
git push
```

---

## D) Weekly: promoting `dev` into `main` (team lead does this)

Only after `dev` has been tested and is actually stable:
```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

---

## Hard rules — these are not suggestions

1. **No direct pushes to `main` or `dev`** — always a feature branch + PR.
2. **Never run `git push --no-verify`** — this bypasses the local safety
   hook on purpose. If you're tempted to, that's a sign something's wrong;
   ask instead of forcing it through.
3. **`frontend/src/lib/yjs.js` is a shared contract.** It defines the data
   structure everyone's code depends on. If you need to change it, tell the
   team first — don't quietly edit it inside your own feature branch.
4. **The golden rule for anything touching the whiteboard:** shapes are
   rendered ONLY from the shared Yjs document, never from local
   component state. If your change introduces a separate `useState` holding
   shape data, stop — that's the exact bug this architecture exists to avoid.
5. **Commit often, in small pieces.** A PR that changes 500 lines is much
   harder to review than five PRs that change 100 lines each.

---

## If something breaks

- **Push rejected, "protected branch"** — you tried pushing to `main`/`dev`
  directly. Make a feature branch instead.
- **Merge conflict** — don't panic, don't force anything. Paste the exact
  conflict markers to the team lead if you're not sure how to resolve it.
- **`node_modules` showing up in your `git status`** — something's wrong
  with `.gitignore` recognition; stop and ask before committing.
