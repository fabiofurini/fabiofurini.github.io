# MIP Europe 2026 — Poster Awards portal

Online frontend at https://fabiofurini.github.io/mip-poster-awards/

This frontend requires a Supabase backend: authentication and evaluations cannot run until activated. It never writes votes or passwords to GitHub.

## Already implemented
- Two panels of 3 judges: Panel 1 Andrea Lodi, Petra Mutzel, Bissan Ghaddar; Panel 2 Jon Lee, Marco Lübbecke, Ruth Misener.
- Exactly 15 eligible Ph.D. posters (8 + 7), excluding 6 non-Ph.D. presenters.
- Individual email/password authentication with Supabase Auth.
- Five 1–5 scores per poster, comments, mandatory conflict confirmation.
- Conflict reporting, vote saving/editing, restricted per-judge views.
- Organizers-only admin dashboard for rankings, status, conflicts, assignments, CSV download and close/reopen voting.
- Supabase row-level security: users cannot access other jurors' reviews.

## How to activate
1. Create a Supabase project at https://supabase.com/dashboard and copy Project URL and anon/publishable key.
2. Run schema.sql once in SQL Editor, on a NEW project.
3. Disable public signup in Authentication settings. Manually create/invite exactly eight users (6 judges + Fabio and Veronica). Use individual strong temporary passwords and require password changes. Enter proper full_name user metadata if possible.
4. Execute the three UPDATE statements commented at the bottom of schema.sql, after users exist. Verify two admin accounts and two panels with exactly 3 judges each.
5. Add the public Project URL and anon/publishable key (NOT service_role or database password!) to config.js in both static/mip-poster-awards and docs/mip-poster-awards. Publish via GitHub.
6. Log in as Fabio or Veronica, check the supervisor and coauthor relations for ALL 15 Ph.D. presenters. IMPORTANT: the proposed distribution is not independently certified conflict-free. Do not pair Alexander Helber with Marco Lübbecke; check Chris Cohadari / Petra Mutzel, and independently verify all other relations.
7. When conflict checks are complete, click Assign both panels in the admin dashboard, or individually select the three judges for each poster to avoid conflicts.
8. Test from a different browser logged in as a judge: it must see ONLY its assigned posters, and its saved votes must be visible ONLY to that judge and the two admins.
9. Send personal sign-in details to the judges only after testing. Close voting from the organizer dashboard after the poster session; download CSV for records.

## Operation
Do not commit real passwords, reviews, secret tokens or a Supabase service_role key. Only the public anon key may go in config.js, guarded by SQL RLS. The organizer dashboard displays provisional raw averages; two panels may use different grading scales, so deliberation before announcing winners is needed.

Source files live in static/mip-poster-awards. docs/mip-poster-awards is the published copy. The main site's build.py preserves this directory during rebuilds. Keep both copies synchronized when manually updating.
