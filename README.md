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
| Practice tracks on the Scenes page's Songs tab | `data/songs.json` |

Publishing is deliberate. The pages read `data/sheet-cache/`, never the Sheet itself, so an
editor's work in progress stays off the site. Choosing **Website → Publish changes to the
website** in the Sheet stamps the date and time onto its Publish tab; the **Publish the Google
Sheet to the website** workflow checks that stamp every five minutes, and when it changes it
copies the three tabs into `data/sheet-cache/` and commits them, which redeploys the site.

The Sheet is published to the web as CSV. The web addresses of its tabs, including the Publish
tab the workflow reads the stamp from, sit in the `sheet` block of `data/site.json`. The button
itself is an Apps Script bound to the Sheet (Extensions → Apps Script from the Sheet); a copy
of its source is kept here in `apps-script/website-publish-button.gs`. Editing that file does
not change the Sheet: paste it into the Sheet's script editor and save.

If a published copy is missing or unreadable, the page falls back to `data/calendar.json` and
`data/cast.json`, which are out of date and kept only as a last resort, and shows a short note.

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
data/songs.json     Practice tracks for the Songs tab on the Scenes page
data/sheet-cache/   Saved copy of the Sheet's tabs, written by the snapshot workflow
assets/css/site.css Styling (light and dark)
assets/js/site.js   Reads the Sheet and the JSON files and draws the pages
assets/img/         Logos and page scenery
apps-script/        Copy of the Sheet's Publish button script
.github/workflows/  validate.yml checks the JSON; sheet-snapshot.yml publishes the Sheet
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
- The publish workflow needs **Settings → Actions → General → Workflow permissions** set to
  **Read and write**, so it can commit the published copy.
- GitHub pauses scheduled workflows after 60 days without repository activity. After a long
  quiet spell, open the **Actions** tab and re-enable **Publish the Google Sheet to the
  website**, or the Publish button will appear to do nothing.

## Running it locally

The pages fetch their content, so opening `index.html` straight from disk will not work.
Serve the folder instead:

```bash
python -m http.server 8765
```

Then visit <http://localhost:8765>. It reads the published copy in `data/sheet-cache/`.

## Notes

- A push or pull request that changes a `data/*.json` file is checked by
  `.github/workflows/validate.yml`, which fails if the JSON has a typo.
- `site.css` and `site.js` are loaded with a `?v=` stamp. Raise it in all five HTML files
  after a style or script change so browsers do not serve a stale copy.
- Dates drive the display: past events are dimmed, the next one gets a gold outline, finished
  months fold shut, and the "Coming up" cards on the home page come from the calendar.
- Sections fed by the Sheet show grey loading placeholders until their content arrives.
- `data/sheet-cache/meta.json` records the last publish stamp and time. The Sheet's **Check
  publishing status** menu item reads it from the live site.
- Source content came from the Drama Club Boosters entry page, the Shrek cast list, and the
  Join Drama Boosters documents.
