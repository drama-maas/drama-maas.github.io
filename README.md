# Mesa Academy Drama Club website

A static site for GitHub Pages. No build step, no framework, no dependencies. The pages are
plain HTML, drawn at load time from a published Google Sheet and the JSON files in `data/`.

**Admins: see [EDITING.md](EDITING.md). Most changes happen in the Google Sheet.**

## Where the content comes from

| Content | Source |
| --- | --- |
| Calendar dates, announcements, cast list | The **Drama Club Website Content** Google Sheet, one tab each |
| Calendar headings and intros, footer contacts, feedback link | `data/calendar.json`, `data/site.json` |
| Links & Folders, the Boosters page | `data/links.json`, `data/boosters.json` |

The Sheet is published to the web as CSV. The web addresses of its three tabs sit in the
`sheet` block of `data/site.json`.

If the Sheet cannot be reached, a page shows the most recent saved copy of it: this browser's
copy of the last Sheet it loaded, or the snapshot in `data/sheet-cache/`, whichever is newer.
The snapshot is kept up to date by the **Save a copy of the Google Sheet** workflow. Only if
neither copy exists does the page use `data/calendar.json` and `data/cast.json`, which are now
out of date and kept as a last resort.

## Files

```
index.html          Home: announcements, coming up, links & folders
calendar.html       Calendar, with the "Show rehearsals for" name picker
performances.html   Shows: show dates, built from the calendar's performance dates
cast.html           Cast list with search and a track filter
boosters.html       Join the Boosters: membership, donation, committees
data/site.json      Header, footer contacts, feedback link, Sheet addresses
data/links.json     Links & folders section
data/calendar.json  Calendar headings and intros; last-resort copy of the dates
data/cast.json      Cast list intro and closing; last-resort copy of the cast
data/boosters.json  Boosters page
data/sheet-cache/   Saved copy of the Sheet's tabs, written by the snapshot workflow
assets/css/site.css Styling (light and dark)
assets/js/site.js   Reads the Sheet and the JSON files and draws the pages
assets/img/         Logos and page scenery
.github/workflows/  validate.yml checks the JSON; sheet-snapshot.yml saves the Sheet
STILL-TO-BE-CONFIRMED.md  Boosters' running to-do list, repo only
.nojekyll           Tells GitHub Pages to serve the files as-is
```

## Hosting

The site is served by GitHub Pages from the `main` branch, root folder
(**Settings → Pages**), at <https://drama-maas.github.io/>. Every push to `main` redeploys it
within a minute or two.

The repository belongs to the drama club's own GitHub account, `drama-maas`, and is named
`drama-maas.github.io`. That name is what puts the site at the root address, so renaming the
repository would move the site.

- Give anyone who edits the JSON files **Write** access under **Settings → Collaborators**.
  People who only edit the Google Sheet need edit access to the Sheet, not the repository.
- The snapshot workflow needs **Settings → Actions → General → Workflow permissions** set to
  **Read and write**, so it can commit the saved copy.
- GitHub pauses scheduled workflows after 60 days without repository activity. After a long
  quiet spell, open the **Actions** tab and re-enable **Save a copy of the Google Sheet**.

## Running it locally

The pages fetch their content, so opening `index.html` straight from disk will not work.
Serve the folder instead:

```bash
python -m http.server 8765
```

Then visit <http://localhost:8765>. The local copy still reads the live Google Sheet.

## Notes

- A push or pull request that changes a `data/*.json` file is checked by
  `.github/workflows/validate.yml`, which fails if the JSON has a typo.
- `site.css` and `site.js` are loaded with a `?v=` stamp. Raise it in all five HTML files
  after a style or script change so browsers do not serve a stale copy.
- Dates drive the display: past events are dimmed, the next one gets a gold outline, finished
  months fold shut, and the "Coming up" cards on the home page come from the calendar.
- Sections fed by the Sheet show grey loading placeholders until their content arrives.
- Source content came from the Drama Club Boosters entry page, the Shrek cast list, and the
  Join Drama Boosters documents.
