# MIP Europe 2026 — Best Poster Voting
Private links, no registration and no passwords.

**Live web page:** https://fabiofurini.github.io/mip-poster-awards/

Each jury member gets an individual `/#key=... ` link that identifies them. They see only their assigned posters, score the five agreed criteria from 1–5, optionally comment, and click **Save vote**. Each poster is evaluated by three judges. Only 15 presenters who registered as Ph.D. students are included. Non-Ph.D. posters are excluded. Judges can report a conflict rather than vote.

Two organizer-only private links reveal every score and comment, the live ranking, an Excel-compatible CSV export, voting opening/closing controls, and assignments. There are 2 panels of 3, with 8/7 posters. **A private link is an access credential**: do not publish, forward, or place these links in GitHub. Their SHA-256 digests are stored in Supabase `poster_portal_access`, and a minimal set of SECURITY DEFINER RPC functions validate each token. All application tables have row-level security enabled and no direct grants to anonymous users. Neither scores nor names are stored in the public repository.

The site is generated from source `static/mip-poster-awards` and deployed from `docs/mip-poster-awards` by GitHub Pages. Both copies must remain in sync. `build.py` preserves the folder.

**Administration:** Use either organizer link to view all results. Check conflicts and reassign judges when needed. The prefilled allocations are **provisional**: known separation Helber/Lübbecke and Cohadari/Mutzel; verify additional supervisor/coauthor ties manually. Voting starts CLOSED so it can be opened when the poster session begins. Raw scores from separate panels might need a cross-panel normalization/discussion for choosing winners.

**Security note:** Anyone possessing a valid link can act as that person. Links are 256-bit random tokens and are placed in URL fragments so they are not sent to GitHub Pages on HTTP requests. Use direct email to deliver them. If a link is accidentally disclosed, revoke it by changing that person's token digest and issue a new private link.
