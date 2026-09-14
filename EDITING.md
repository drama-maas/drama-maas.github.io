# How to update the Drama Club website

No coding needed.

## Most changes: the Google Sheet

The calendar, the announcements and the cast list live in the
**[Drama Club Website Content](https://docs.google.com/spreadsheets/d/1li5XvEky6UglRdMSMkIrX8us44wkxp-PwYyw0nvNJC8/edit)**
Google Sheet. Edit a tab and the website picks it up within about five minutes. The Sheet's
**Read me** tab explains every column.

| I want to change... | Sheet tab |
| --- | --- |
| Rehearsal and show dates, notes, who is called, study hall | Calendar |
| The notices at the top of the Home page | Announcements |
| The cast list | Cast |

If the website ever cannot reach the Sheet, it shows the most recent saved copy of it, with a
short note at the top of the page. Two copies are kept: each visitor's browser remembers the
last Sheet it loaded, and a scheduled GitHub job saves a snapshot into `data/sheet-cache/` every
half hour whenever the Sheet has changed. Whichever copy is newer is shown. Only if neither
exists does the site fall back to the older files described below.

The snapshot job lives in the repository's **Actions** tab as **Save a copy of the Google
Sheet**. Click **Run workflow** there to save a copy straight away. GitHub pauses scheduled
jobs in a repository with no activity for 60 days, so after a long quiet spell, such as the
summer, check that tab and re-enable it.

## Everything else: the files on GitHub

The rest lives in text files in the `data` folder. You edit them right on GitHub in your web
browser, click Save, and the website updates itself a minute or two later.

| I want to change... | Edit this file |
| --- | --- |
| The footer contacts, the feedback link, and the Sheet connection | `data/site.json` |
| The "Links & Folders" buttons (Google Drive folders, SignUpGenius, etc.) | `data/links.json` |
| Calendar headings and intros, and the fallback copy of the dates | `data/calendar.json` |
| The cast list introduction and closing, and the fallback copy of the cast | `data/cast.json` |
| The Join the Boosters page | `data/boosters.json` |

The site has five pages: Home, Calendar, Shows, Cast and Boosters. The Shows page builds
itself from the calendar, listing every date marked `"performance": true`, so there is no
separate file to keep in step. The school sponsor, boosters and questions contacts sit in
the footer of every page.

The boosters' running to-do list is no longer on the website. It lives in
`STILL-TO-BE-CONFIRMED.md` in the repository, where you can tick items off.

## Making an edit, step by step

1. Go to the repository on GitHub and open the `data` folder.
2. Click the file you want to change.
3. Click the pencil icon (**Edit this file**) in the upper right.
4. Change the text **between the quotation marks**. Leave everything else alone.
5. Scroll down, type a short note like "added Nov 4 rehearsal", and click **Commit changes**.
6. Wait about a minute, then reload the website. Your change is live.

If the website ever shows a red error box, the last edit has a typo. Undo it: on GitHub open
the file, click **History**, find the previous version, and restore it. Then try again.

## The five rules that keep the file valid

1. Every piece of text sits inside `"double quotes"`.
2. Every line inside a `{ }` block ends with a comma, **except the last one**.
3. Never delete a `{`, `}`, `[` or `]` unless you delete its matching partner too.
4. `true`, `false` and `null` are typed without quotes.
5. When in doubt, copy an entry that already works and change the words in it.

## What updates itself

You do not have to maintain these by hand:

- **Coming up** on the home page always shows the next few calendar events, counted from
  today's date. Keep the calendar right and this stays right.
- **Past dates** fade out and the next date coming up gets a gold "Next up" badge.
- **Finished months** fold themselves shut once every date in them has passed. Anyone can
  click the month heading to open it again.

## Common jobs

### Change the Announcements boxes

In `data/site.json`, find `"announcements"`. These are the hand-written notices that sit
above "Coming up". Each one looks like this:

```json
{
  "date": "September 16",
  "icon": "📢",
  "title": "Mandatory parent meeting",
  "detail": "5:00-5:30 p.m., MAAS MPR, right after the whole cast rehearsal."
}
```

`date` is optional and prints in pink above the title. To add a notice, copy an existing one,
paste it after the comma, and edit the words. To remove one, delete it along with its comma.
Change `"upcomingCount"` if you want more or fewer automatic "Coming up" cards than three.

### Add a rehearsal date

In `data/calendar.json`, find the right month and copy an existing event:

```json
{
  "date": "2026-11-04",
  "day": "4",
  "month": "Nov",
  "weekday": "Wed",
  "performance": false,
  "title": "Whole Cast Rehearsal",
  "track": "",
  "blocks": [
    { "time": "2:00-3:30pm", "what": "6th grade" },
    { "time": "3:30-5:30pm", "what": "Everyone else" }
  ],
  "studyHall": {
    "time": "12:45-2:00pm",
    "volunteer": "",
    "note": ""
  }
}
```

- `date` must be in year-month-day order. It is what dims dates that have passed, picks the
  next one coming up, and fills the "Coming up" boxes on the home page. Get it right and the
  rest takes care of itself.
- `day`, `month` and `weekday` are what people actually see on the date chip. Write a range
  like `"15-16"` for a two-night run.
- `performance` set to `true` gives the date the pink show-date styling and a "Performance"
  badge, and puts it on the Shows page. Use it for Mystery Dinner and the April shows.
- `track` puts a coloured Castle or Storybook pill next to the title, the same pills used on
  the cast list. Leave it as `""` for a date that involves everybody.
- `blocks` is the schedule. Each one is a time and what happens then. Add or remove as many
  as you need.

### Say who is called and what happens

Each rehearsal also carries `notes` and `cast`:

```json
"blocks": [ { "time": "2:00-5:00pm", "what": "" } ],
"notes": [
  "2:00-3:30pm",
  "Mrs. Decker: In Duloc",
  "3:30-5:00pm",
  "Mrs. Manley: Duloc choreography"
],
"cast": "Human Fiona, Teen Fiona, Lord Farquaad, Storytellers, Gingy"
```

- `notes` prints as bullets under the time. A line that is only a time, like `"2:00-3:30pm"`,
  becomes a small heading for the bullets after it.
- `cast` lists who is called, and the page turns it into a row of names. Hover over or tap a
  name to see the role that put them there. It also feeds the **Show rehearsals for** picker
  at the top of the Calendar page: pick a name and the rehearsals they are not called to fade
  out and say so.

**List roles, not names.** Write the roles as they appear on the cast list, separated by
commas. `Donkey` brings in both Donkeys, one from each track, so there is no need to know who
plays what.

| What you write in `cast` | Who is called |
| --- | --- |
| `"All"` | Everyone |
| `"Donkey, Shrek, Dragon"` | Everyone who plays any of those roles, on either track |
| `"Fionas, Storytellers"` | A plural covers the whole group: every kind of Fiona, all six Storytellers |
| `"Storyteller 3"` | Just that one numbered role |
| `"None"` | Nobody, such as a day off |
| `""` | Cast list not posted yet. **Nobody is told to stay home.** |

- An exact role wins over a group, so `Shrek` or `Shreks` means the two Shreks and not Little
  Shrek.
- A role that has not been cast yet shows as "not cast yet" and starts showing the student
  automatically once the Cast tab names them.
- A word that matches no role shows in italics with a dashed outline, which is how a typo
  gives itself away.
- Names still work too, such as `Clara D` for one particular student.
- A student listed in study hall `students` is never told to stay home, even if they are not
  in `cast`. The students list itself is not shown on the page.

Leave `cast` blank until the list is final. A wrong list tells a student to skip a rehearsal
they should be at; a blank one just says the list is not posted yet.

### Study hall

Study hall only shows on a date when a volunteer is named in `volunteer`, for example
`Study hall 12:45-2:00pm  Jane Smith`. Leave `volunteer` blank and nothing shows for that date.
With only a few students in study hall, parents no longer sign up.

The students attending go in `"students"`, separated by commas, like
`"students": "Clara D, Lydia"`. They are not shown on the page; the list only stops the name
picker from telling those students to stay home.

### Add or change a link

In `data/links.json`, copy an existing link block. Paste the web address between the quotes
for `url`. Links under `"Boosters members only"` appear in the second group.

### Update the cast list

In `data/cast.json`, each person has one or more `parts`:

```json
{
  "actor": "Jane Smith",
  "parts": [
    { "role": "Human Fiona", "track": "Castle", "description": "She may appear to be..." },
    { "role": "Flora", "track": "Storybook", "description": "Sleeping Beauty's entourage." }
  ]
}
```

`track` must be exactly one of these four words:

| Track | Meaning |
| --- | --- |
| `Castle` | Leads April 15-16, 2027 |
| `Storybook` | Leads April 22-23, 2027 |
| `Both` | Played both weekends. Use this for any role that is not track-specific. |
| `TBD` | Not settled yet |

Each role gets its own line in the table, lined up with its own track and its own
description, so a student with three roles reads as three separate lines under their name.

The **Castle Track** and **Storybook Track** buttons above the table keep everybody on
screen and simply hide the other track's version of a role. Pick Castle and a double-cast
student shows their Castle role, with their Storybook role tucked away. Roles played both
weekends stay put under either button.

When a `TBD` role is cast, put the student's name in the Actor column of the Sheet's Cast tab.

### Update the Boosters page

`data/boosters.json` holds the join and donate buttons, the mission statement, and the
committee list. A button with an empty `"url"` shows as a grey placeholder instead of a link,
which is how the Donate button is set right now. Paste the donation address into its `url`
and it turns into a working button.

## If a change does not show up

Browsers hold on to the stylesheet and the script for a while. The five HTML files load
them with a version number on the end, like `site.css?v=5`. If you change the look of the
site and someone still sees the old version, raise that number in all five files and every
browser will fetch fresh copies. Changes to the files in `data` appear straight away and
need none of this.

## Photos and logos

Logos live in `assets/img`. To swap one, upload a file with the same name through GitHub's
**Add file → Upload files** button. Keep the transparent PNG format so it sits nicely on the
green header.

## Checking your work before you publish

Paste the whole file into <https://jsonlint.com>, click Validate, and it will point at any
missing comma. This is the fastest way to avoid breaking the page.
