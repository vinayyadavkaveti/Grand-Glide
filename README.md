# GrantGlide: ScholarQuest

Discover Opportunities. Unlock Your Future.

## Run
    npm install
    npm start        # http://localhost:3000
    npm test         # rule engine tests (Node built-in test runner)

## Layout
- `src/engine.js`        JSON predicate-tree engine (all/any/not, 3-valued logic), scoring, ranking, conflicts
- `src/scholarships.js`  31 schemes with structured rules
- `server.js`            Express REST API + SQLite (better-sqlite3)
- `public/`              Vanilla JS single-page app (hash routing, Chart.js)

## Data accuracy warning
Every scheme has `verified: false`. Amounts, income caps and deadlines are approximations.
Verify each against the official portal before relying on it. Two entries at the end of the list
are demo/indicative placeholders, not real schemes: replace or remove them.

## Not built yet
Login/bcrypt (the app is single-user per database), rate limiting, API tests with Supertest,
conflict rules beyond `exclusiveGroup`, full translation of page content (nav is translated).
