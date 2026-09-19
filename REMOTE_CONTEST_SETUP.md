# Remote contest repair

## Production activation — 18 September 2026

Activated at https://psr-gamification-app.vercel.app. Migration 004 and the
958-question import are applied. The production Supabase environment variables
are configured in Vercel. Deployment: dpl_4aW7YaTXkDGMwy9CohxUWMYdwFSN.

Verified the public URL serves the new contest code. A live PostgreSQL test using
two temporary user identities passed shared membership, presence, identical
questions/deadlines, host authorization, idempotent server scoring and persisted
results; the entire test transaction was rolled back. There are zero leftover
test users, and the existing four games and four registrations were preserved.
Two independent realtime connections also passed participant join/leave sync.
Physical two-device browser testing still needs the acceptance check below.


The source now uses one Supabase game directory, authenticated membership, shared
question snapshots, a host-controlled start, server deadlines and server scoring.
The lobby shows distinct connected people, supports reconnects and invitation
links, and saves final scores, accuracy and ranks. Capacity is configurable from
2 to 1,000 (default 200); hosting limits still depend on your Supabase plan.
Realtime presence follows the [Supabase Presence API](https://supabase.com/docs/guides/realtime/presence),
with database heartbeat recovery when the realtime connection is unavailable.

## Host, invitation, administration and portrait update

Deployed to production: dpl_N4NHRio7HUBqu38m4CPcoYCPDC6V. The live URL
serves the new host, admin, link and welcome components. The portrait returns
HTTP 200 with image/webp and its SHA-256 matches the supplied dg.webp exactly.
The anonymous administrator API access check is denied as expected.

Migration 005_host_and_admin.sql adds protected administrator roles outside
editable profiles, reversible member/tournament deletion, suspension/restoration,
question management and an audit trail. Apply 005 once after 004; do not rerun
004 after 005 because it would replace the protected function wrappers.
Administrator access has been assigned to the owner-selected existing account;
its password was not changed. Sign in normally and use the Admin Portal tab.

Scheduling now automatically enters the creator's lobby as host and participant
one. The host can start once one other active member is connected, including
before the scheduled time. Guests cannot start the match. The Copy room link
button and selectable URL contain the tournament's exact ?match= identifier.
Signup confirmation redirects also retain the tournament link.

The Official Executive Welcome banner is restored to the tournament page with
the supplied Director General/CEO portrait stored in src/assets/dg_photo.webp.

Changed files: App.tsx, AdminDashboard.tsx, AuthPage.tsx,
ScheduleTournamentPage.tsx, ScheduleTournamentModal.tsx, RemoteMatchRoom.tsx,
Navbar.tsx, services/admin.ts, services/roomLinks.ts, services/supabase.ts,
dg_photo.webp, migration 005, test-remote-contests.mjs, test-room-links.mjs,
and package.json (test:links script).

Checks: production build; npm run test:remote; npm run test:links; live
rollback-only SQL tests of host counting, early host-only start, protected admin
actions, reversible deletion and denied direct role changes. Temporary test
users and contests were rolled back. No existing member or tournament was deleted.
Browser visual verification was unavailable in this session; the deployed image
is checked directly against the supplied file.

## Activation reference

Before activation, the database contained four games and zero questions, and
the public Vercel deployment served the old code. The following steps document
the completed activation and can be used for future installations.

1. In Supabase project `ksothbeqmxguyxygfzeu`, back up the database, then run
   `supabase/migrations/004_remote_contests.sql` in the SQL Editor. Existing
   installations already containing migrations 001–003 only need 004. A new
   database needs 001–004 in order. Do not rerun migration 002 after 004: it
   restores the insecure prototype permissions.
2. Run `supabase/seed_remote_questions.sql`. This imports the existing 958 PSR
   questions with stable identifiers; rerunning it does not duplicate them.
3. Verify `games` and `game_players` are enabled in the `supabase_realtime`
   publication (004 does this). Keep email/password authentication enabled.
4. In the Vercel project `psr-gamification-app`, set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` to that same project for the deployment environment.
   These are public browser credentials. Never use a service-role key there.
5. Deploy this project, then reload both devices. Both must use the same deployed
   URL and their own registered accounts. The shared demo identity is for practice
   only and cannot join remote contests.

## Run checks

```sh
npm install
npm run test:remote
npm run build
```

The database test executes the real migrations and question seed using PGlite,
an isolated PostgreSQL engine. It tests separate user identities, identical
questions/deadlines, membership uniqueness, capacity, host authorization, early
and late answer rejection, forged client timing, duplicate answer retries,
multi-tab connections, disconnect expiry, final results and write restrictions.
It also exercises a 200-person department. This is a functional database test,
not a production concurrency/load benchmark or a real websocket/browser test.

## Two-device acceptance check

1. Sign in as different registered users on devices A and B.
2. On A schedule a tournament a few minutes in the future. Set registration cutoff
   equal to the start time and capacity to the department size.
3. B should see it automatically, or within 10 seconds if realtime is unavailable.
   Click **Join match / Enter lobby** on B and **Enter host lobby** on A.
4. Both show two connected participants. A second tab for the same account must
   not count as a third person. More department members can join until cutoff or
   capacity. Each account registers once.
5. When the host and at least one guest are connected, the host clicks **Start contest for everyone**.
   Both devices receive a five-second countdown and the same ten questions, each
   with 15 seconds to answer and a three-second transition. Skipping a question
   scores zero; clients cannot advance questions independently.
6. Submit correct and incorrect answers from both devices. Scores should update
   remotely. Refresh a device: its saved answer and current shared round recover.
7. Close a device: presence removes it; when realtime is unavailable, the database
   heartbeat expires within 25 seconds plus the next five-second refresh.
8. At the end verify both devices show the same persisted ranks, scores and
   accuracy. Open the invitation link again to recover the results.

## Files and limits

- `src/App.tsx`, `src/pages/ScheduleTournamentPage.tsx`, and
  `src/components/ScheduleTournamentModal.tsx`: shared discovery, invitations,
  publish/join errors, dates and department capacity.
- `src/components/quiz/RemoteMatchRoom.tsx`, `src/services/remoteContest.ts`:
  lobby, presence, reconnection, shared timer, server answers and results.
- `src/services/supabase.ts`, `src/store/useStore.ts`,
  `src/pages/AuthPage.tsx`, `src/services/cloudSync.ts`: authenticated RPCs,
  explicit backend configuration, logout and retirement of legacy Gist syncing.
- `supabase/migrations/001_initial_schema.sql`: corrected an existing variable
  typo so a fresh schema installation compiles.
- `supabase/migrations/004_remote_contests.sql`,
  `supabase/seed_remote_questions.sql`: server state, protected writes and questions.
- `test-remote-contests.mjs`, `package.json`, `package-lock.json`: repeatable tests.

The host must be present to start; the host can start with one guest at any time. Scheduled time alone does not auto-start.
Existing hostless prototype games should be replaced with a newly scheduled
hosted game. The target organization is a label; this repair does not add private
department invitations or organization-based eligibility. Tournament discovery
is shared across authenticated users.

Finalization runs when any registered participant retrieves the room after its
deadline, including a later revisit if everyone disconnected. Offline gaps do
not pause the shared clock. Speed uses server receipt time, so network latency
can affect close scores. The browser still contains the existing practice bank;
use a separate private question bank for high-stakes competitions.

The retired Gist implementation contained an embedded GitHub token. It has been
removed from source and new builds; revoke that old token in GitHub because old
deployments and repository history can still contain it.
