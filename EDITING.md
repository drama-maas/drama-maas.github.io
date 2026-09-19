# How to update the Drama Club website

No coding needed.

## Most changes: the Google Sheet

The calendar, the announcements and the cast list live in the
**[Drama Club Website Content](https://docs.google.com/spreadsheets/d/1li5XvEky6UglRdMSMkIrX8us44wkxp-PwYyw0nvNJC8/edit)**
Google Sheet. Edit a tab, then publish, and the website updates. The Sheet's
**Read me** tab explains every column, and row 2 of each tab has a short hint under each
heading.

| I want to change... | Sheet tab |
| --- | --- |
| Rehearsal and show dates, notes, who is called, study hall | Calendar |
| The notices at the top of the Home page | Announcements |
| The cast list | Cast |

Three things keep the Sheet working:

- **Do not rename, move or delete the headings in row 1.** The website finds each column by
  its heading.
- **Leave row 2 alone.** It holds the hints and is skipped by the website.
- **Blank rows are fine.** Use them to space things out; the website ignores them.

## Nothing goes live until you publish it

The website does not read the Sheet directly. It shows the last **published** copy, so you can
edit for as long as you like, leave things half finished, and fix your own typos, with none of
it on the website.

When everything is ready, choose **Website → Publish changes to the website** from the menu bar
in the Sheet. Add a short note about what changed if you like, and click OK. The site updates
within about five minutes.

To see where things stand, choose **Website → Check publishing status**. It tells you one of
three things:

- **You have changes that are not on the website yet.** Someone has edited the Sheet since the
  last publish. Publish when the changes are ready.
- **Still publishing.** A publish was asked for and the website has not picked it up yet. Give it
  a few more minutes.
- **The website is up to date.** The last publish went live and nothing has been edited since.

The Sheet also shows a reminder in the corner when you open it if there are unpublished changes.
When you publish, remember to click **OK** in the box that appears; Cancel publishes nothing.

The **Publish** tab records when the last publish was asked for and by whom. Do not rename or
delete that tab, and do not type into cell B4 by hand; the website reads that cell to know
when a publish was requested.

If the menu is missing, reload the Sheet and give it a few seconds to appear.

## Common jobs in the Sheet

### Change the announcements

On the **Announcements** tab, each row is one box at the top of the Home page.

| Column | What it does |
| --- | --- |
| Show | `No` hides the announcement without deleting it |
| Date | Optional, printed in pink above the title |
| Icon | One emoji |
| Title | Shown in bold |
| Detail | The line under the title |
| Link | Optional web address. `cast.html` or `calendar.html` links to a page on the site |

The **Coming up** cards below the announcements fill themselves in from the Calendar tab.

### Add a rehearsal or show date

On the **Calendar** tab, add a row, in date order.

| Column | What it does |
| --- | --- |
| Date | Type it like `2026-11-04`. This dims past dates and picks what is next, so get it right |
| End date | Only for a run of dates, like a two-night show |
| Section | Which heading on the Calendar page it sits under |
| Title | Shown in bold. Extra lines become subtitles, see below |
| Performance | `Yes` gives it the pink show styling and lists it on the Shows page |
| Track | `Castle` or `Storybook` adds the coloured pill. Blank for everybody |
| Time 1-3, What 1-3 | The schedule, such as `2:00-5:00pm`. Most dates need only Time 1 |
| Notes | Bullets under the time, one per line (Ctrl+Enter starts a new line in a cell) |
| Cast needed | Who is called. See below |
| Link, Link label | Optional web address and the words to show for it |

In **Notes**, a line that is only a time, like `2:00-3:30pm`, becomes a small heading for the
bullets after it.

**Subtitles.** Press Alt+Enter inside the **Title** cell to start a new line. The first line is
the title, and every line after it prints underneath in smaller italics, above the times, like
`(Sorry parents, students and volunteers only)`. Add as many lines as you need. These are not
bullets, so use Notes for a list of what happens when.

### Say who is called

**Cast needed** turns into a row of names on the date. Hover over or tap a name to see the
role that put them there. It also feeds the **Show rehearsals for** picker at the top of the
Calendar page: pick a name and the rehearsals they are not called to fade out and say so.

**List roles, not names.** Write roles as they appear on the Cast tab, separated by commas.
`Donkey` brings in both Donkeys, one from each track, so there is no need to know who plays
what.

| What you write in Cast needed | Who is called |
| --- | --- |
| `All` | Everyone |
| `Donkey, Shrek, Dragon` | Everyone who plays any of those roles, on either track |
| `Fionas, Storytellers` | A plural covers the whole group: every kind of Fiona, all six Storytellers |
| `Storyteller 3` | Just that one numbered role |
| `None` | Nobody, such as a day off |
| blank | Cast list not posted yet. **Nobody is told to stay home.** |

- An exact role wins over a group, so `Shrek` or `Shreks` means the two Shreks and not Little
  Shrek.
- A role still marked TBD on the Cast tab shows as "not cast yet", and starts showing the
  student automatically once the Cast tab names them.
- A word that matches no role shows in italics with a dashed outline, which is how a typo
  gives itself away.
- Names still work too, such as `Clara D` for one particular student.

Leave Cast needed blank until the list is final. A wrong list tells a student to skip a
rehearsal they should be at; a blank one just says the list is not posted yet.

### Study hall

The **Study hall volunteer** cell decides what a date shows:

| What you put in it | What the date shows |
| --- | --- |
| A parent's name | `Study hall 12:45-2:00pm  Jane Smith` |
| `Needed` | `Study hall 12:45-2:00pm  Needs a volunteer  Sign up »`, linking to SignUpGenius |
| blank | Nothing at all |

So a date that still needs a parent says so and offers the sign-up link, and whoever is keeping
the list just replaces `Needed` with the parent's name once somebody signs up. Leave it blank
on a date where you do not want to ask, such as one that is still being planned.

The sign-up link disappears by itself once a date has passed. The address it points at is
`studyHallSignupUrl` in `data/site.json`.

Put the students attending in **Study hall students**, separated by commas, like
`Clara D, Lydia`. They are not shown on the page; the list only stops the name picker from
telling those students to stay home.

### Update the cast list

On the **Cast** tab, each row is one role.

| Column | What it does |
| --- | --- |
| Actor | The student. Repeat the name on each of their role rows |
| Role | One role per row |
| Track | `Castle`, `Storybook`, `Both` or `TBD` |
| Description | What the character is like |

A student's rows are gathered under their name in the order they first appear, so a student
with three roles reads as three lines under one name. Use `Both` for any role that is not
track-specific.

When a role is cast, replace `TBD` in the Actor column with the student's name.

The **Castle Track** and **Storybook Track** buttons above the table keep everybody on
screen and simply hide the other track's version of a role. Roles played both weekends stay
put under either button.

### The scene breakdown

The **Scenes** tab feeds the scene page at `scenes.html`, which is not linked from the menu:
you reach it by typing the address. It is one row per student per track, and one column per
scene, in the order the scenes are performed.

| Column | What it does |
| --- | --- |
| Track | `Castle` or `Storybook`. Each student gets one row per track they are in |
| Group | The heading their row sits under in the grid, such as `Leads` or `Storytellers` |
| Student | Their name, spelled as on the Cast tab |
| One column per scene | The costume they wear in that scene. Leave it empty when they are off stage |

Write the costume the way it should read to a student, such as `Duloc` or `Storyteller 3`. To
add what they are doing in that scene, put it in brackets after the costume, like
`Duloc (Guard)`. The page works out the rest: a costume change is any scene where the costume
is different from the one they had on last, and it warns about a quick change when there is no
scene in between.

Renaming a scene column renames it on the page. Moving a column moves the scene in the running
order, and adding a column adds a scene. Everything on the page comes from this tab, so this is
the only place to change it.

## Everything else: the files on GitHub

The rest lives in text files in the `data` folder. You edit them right on GitHub in your web
browser, click Save, and the website updates itself a minute or two later.

| I want to change... | Edit this file |
| --- | --- |
| The footer contacts, the feedback link, and the Sheet connection | `data/site.json` |
| The "Links & Folders" buttons (Google Drive folders, SignUpGenius, etc.) | `data/links.json` |
| The headings and intros on the Calendar page | `data/calendar.json` |
| The introduction and closing on the Cast page | `data/cast.json` |
| The Join the Boosters page | `data/boosters.json` |

`data/calendar.json` and `data/cast.json` also hold an old copy of the dates and the cast. The
website only falls back to it if a published copy goes missing, so there is no need to keep it
up to date.

The boosters' running to-do list is not on the website. It lives in
`STILL-TO-BE-CONFIRMED.md` in the repository, where you can tick items off.

### Making an edit, step by step

1. Go to the repository on GitHub and open the `data` folder.
2. Click the file you want to change.
3. Click the pencil icon (**Edit this file**) in the upper right.
4. Change the text **between the quotation marks**. Leave everything else alone.
5. Scroll down, type a short note like "new Drive folder link", and click **Commit changes**.
6. Wait about a minute, then reload the website. Your change is live.

If the website ever shows a red error box, the last edit has a typo. Undo it: on GitHub open
the file, click **History**, find the previous version, and restore it. Then try again. Paste
the whole file into <https://jsonlint.com> and click Validate to find the missing comma.

### The five rules that keep a file valid

1. Every piece of text sits inside `"double quotes"`.
2. Every line inside a `{ }` block ends with a comma, **except the last one**.
3. Never delete a `{`, `}`, `[` or `]` unless you delete its matching partner too.
4. `true`, `false` and `null` are typed without quotes.
5. When in doubt, copy an entry that already works and change the words in it.

### Add or change a link

In `data/links.json`, copy an existing link block. Paste the web address between the quotes
for `url`. Links under `"Boosters members only"` appear in the second group.

### Update the Boosters page

`data/boosters.json` holds the join and donate buttons, the mission statement, and the
committee list. A button with an empty `"url"` shows as a grey placeholder instead of a link,
which is how the Donate button is set right now. Paste the donation address into its `url`
and it turns into a working button.

## What updates itself

You do not have to maintain these by hand:

- **Coming up** on the Home page always shows the next few calendar dates, counted from
  today. Keep the calendar right and this stays right.
- **Past dates** fade out and the next date coming up gets a gold "Next up" badge.
- **Finished months** fold themselves shut once every date in them has passed. Anyone can
  click the month heading to open it again.
- **The Shows page** lists every date marked `Yes` under Performance.

## If a change does not show up

- **A Sheet change:** did you publish it? Choose **Website → Publish changes to the website**,
  then give it five minutes. **Website → Check publishing status** says whether it has landed.
- **A file change on GitHub:** give it a minute or two, then reload.
- **A change to the look of the site:** browsers hold on to the stylesheet and the script for
  a while. The five HTML files load them with a version number on the end, like
  `site.css?v=5`. Raise that number in all five files and every browser will fetch fresh
  copies.

## Photos and logos

Logos and scenery live in `assets/img`. To swap one, upload a file with the same name through
GitHub's **Add file → Upload files** button. Keep the transparent PNG format so it sits nicely
on the page.
