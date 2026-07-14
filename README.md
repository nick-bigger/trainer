# Trainer

Daily habit tracking + a local AI nutritionist/strength coach, built around a quarterly
DEXA + labs feedback loop.

- **Web app** (GitHub Pages, iPhone standalone web app) - 75-Hard-style card grid: press and
  hold to check off each habit, log the morning weigh-in, get a celebration when the day is
  complete. Streaks and weight trend in History. Writes to a hosted Turso database.
- **Coach** (`npm run coach`, local terminal only) - an agent that knows the plan
  (`plan/plan.md`), remembers everything you tell it (`memory/`), and reads your tracking data
  straight from the same database - so it sees what you logged from your phone. Tell it
  workouts, PRs, DEXA results, labs; it files them away and adjusts the plan when the data
  says so.

`memory/` and `plan/` are personal health data: gitignored, local-only, never in git history.
Back them up with your machine backups.

## Running

```bash
npm install
cp .env.example .env.local   # fill in Turso credentials

npm run dev                  # web app on :5173/trainer/
npm run coach                # coach REPL ("new" resets, "exit" quits)
npm run coach -- -p "..."    # one-shot question
```

The coach uses your local Claude Code login (subscription usage); no API key needed. Set
`COACH_MODEL` to override the model.

## Database

```bash
turso db create trainer
turso db show trainer --url        # -> VITE_TURSO_DB_URL
turso db tokens create trainer     # -> VITE_TURSO_AUTH_TOKEN
```

Tables and the default habit list are created/seeded automatically on first load. The same two
values are GitHub Actions secrets for the Pages deploy.
