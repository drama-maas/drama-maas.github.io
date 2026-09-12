# Mesa Academy Drama Club website

A static site for GitHub Pages. No build step, no framework, no dependencies. The pages are
plain HTML; all content is read at load time from the JSON files in `data/`.

**Admins: see [EDITING.md](EDITING.md). You never need to touch anything else.**

## Files

```
index.html          Home: announcements and links & folders
calendar.html       Drama Club calendar and the spring performance schedule
performances.html   Shows tab: show dates, built from the performance:true events
cast.html           Cast list with search and a track filter
boosters.html       Join the Boosters: membership, donation, committees
data/site.json      Header, contacts, announcements, study hall sign-up address
data/links.json     Links & folders section
data/calendar.json  Both calendars
data/cast.json      Cast list, one entry per person with their roles and tracks
data/boosters.json  Boosters page
assets/css/site.css Styling (light and dark)
assets/js/site.js   Reads the JSON files and draws the pages
assets/img/         Logos
STILL-TO-BE-CONFIRMED.md  Boosters' running to-do list, repo only
.nojekyll           Tells GitHub Pages to serve the files as-is
```

## Publishing to GitHub Pages

1. Create a repository, for example `maas-drama`.
2. Upload the contents of this folder to the repository root (not the folder itself).
3. In the repository, open **Settings → Pages**.
4. Under "Build and deployment", set Source to **Deploy from a branch**, branch `main`,
   folder `/ (root)`. Save.
5. The site appears at `https://<your-account>.github.io/maas-drama/` within a minute or two.

If you would rather keep the files in a `docs/` subfolder, rename this folder to `docs` and
pick `/docs` instead of `/ (root)` in step 4.

Give each drama club admin who will update content **Write** access under
**Settings → Collaborators**. That lets them edit the JSON files in the GitHub web editor
without touching anything else.

## Running it locally

The pages fetch their JSON, so opening `index.html` straight from disk will not work. Serve
the folder instead:

```bash
python -m http.server 8765
```

Then visit <http://localhost:8765>.

## Notes

- A pull request that changes a `data/*.json` file is checked automatically by the workflow
  in `.github/workflows/validate.yml`, which fails if the JSON has a typo.
- The home page carries the full masthead; every other page uses a slim version of it. The
  contacts sit in the footer sitewide.
- `site.css` and `site.js` are loaded with a `?v=` stamp. Raise it in all five HTML files
  after a style or script change so browsers do not serve a stale copy.
- Dates drive the display: events before today are dimmed, the next upcoming event gets a
  gold outline, and the "Coming up" cards on the home page are generated from the calendar.
  Keep the `date` field accurate and the page stays current on its own.
- Study hall entries with no volunteer named render a Sign up button pointing at
  `studyHallSignupUrl` in `data/site.json`. SignUpGenius has no per-slot addresses, so the
  button opens the list rather than a single date.
- Source content came from the Drama Club Boosters entry page, the Shrek cast list, and the
  Join Drama Boosters documents.
