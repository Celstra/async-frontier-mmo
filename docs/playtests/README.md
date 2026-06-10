# Playtest notes

Local-only evidence for Decision 013. No external analytics.

| Artifact | Purpose |
|----------|---------|
| `post-test-comprehension-template.md` | Copy per session; fill after the tester finishes the first-session loop |
| `playtest_events` table (Postgres) | Server-side funnel + comprehension signals keyed by pilot id |

## After a session

1. Copy `post-test-comprehension-template.md` to `YYYY-MM-DD-<tester-initials>.md`.
2. Query events for the pilot (see Lesson 29).
3. Attach friction notes from observation directly in the copied file.
