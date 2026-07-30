# Internal User Onboarding

Use this guide to set up the public Internal Time Logging repo for a Kicksaw
user.

The repository is public, but the app data is not public. Each user must use
their own Salesforce CLI login and their own Codex Google Calendar connection.

## What You Need

- A computer that can run Codex.
- Git.
- Node.js `22.13.0` or newer.
- Salesforce CLI.
- Access to the Kicksaw Salesforce org.
- Codex connected to your Kicksaw Google Calendar.

## Privacy And Setup Tracking

Setup tracking is separate from the app UI. The setup script can post one
anonymous setup-attempt marker to GitHub when GitHub CLI authentication or a
GitHub token is available.

The marker includes only an anonymous install id hash, timestamp, platform,
repository, and app version. It does not collect calendar event details,
Salesforce time entries, project names, notes, access tokens, raw usernames, or
Salesforce usernames. If GitHub authentication is unavailable, setup continues
and tracking is skipped.

## Public Repo

Open or clone:

```text
https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git
```

Clone command:

```bash
git clone https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git
```

No GitHub invitation is required for read access because the repo is public.

## One Prompt Setup

Paste this into Codex:

```text
Set up the Internal Time Logging app for my user from start to finish.

Clone or open the public repo:
https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git

If it is not already cloned locally, use:
git clone https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git

After cloning, open or switch into the Internal-Time-Logging project folder before running setup commands.
Use README.md and docs/local-cli-setup.md as the source of truth.

Check my prerequisites:
- Node.js 22.13.0 or newer.
- Salesforce CLI.
- Git.
- Codex Google Calendar integration connected for my Kicksaw calendar.

If Node.js or Salesforce CLI is missing, tell me the exact install step before continuing.
If my Google Calendar integration is not connected in Codex, pause and tell me how to connect it.

Authenticate my Salesforce user with alias KicksawProd:
sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default

Confirm the org:
sf org display --target-org KicksawProd

After Salesforce auth succeeds:
1. Run npm install.
2. Run npm run track:setup. This is outside the app UI and should only send the anonymous setup-attempt marker described in the docs. If GitHub authentication is unavailable, continue setup.
3. Start the local Salesforce proxy with npm run local:proxy.
4. Start the app with npm run dev -- --port 3001.
5. If port 3001 is unavailable, use the port printed by the app and tell me the exact local URL.
6. Keep the local services running while I validate.

Setup tracking is separate from the app UI. Do not send calendar event details, Salesforce records, project names, notes, access tokens, raw usernames, or Salesforce usernames as tracking data.

Then help me configure the app:
1. Have me select my Delivery Team: AOD, SOPS, COPS, MOPS, or Engineering.
2. Have me optionally choose a Default Project.
3. Use my connected Google Calendar integration to fetch my primary calendar events for the full current calendar month using my current timezone.
4. Write the events to .local/calendar-events.json in this repo.
5. Tell me to click Refresh Suggestions in the app after the calendar file is written.

The calendar file must be JSON with a top-level "records" array.
Each record must include:
id, title, start, end, project, activityType, billable, responseStatus, transparency, attendeeEmails

attendeeEmails should include every non-resource attendee email when available so the app can match external client domains to active Salesforce projects for my selected Delivery Team.

Use these calendar rules:
- Exclude declined events.
- Exclude Focus Time.
- Exclude OOO/out-of-office events.
- Exclude transparent, birthday, and FYI events.
- Consolidate same-day calendar entries with the same title.
- Meetings with DJ and me only are internal.
- People and Team Activities use Kicksaw - Internal Time Tracking.
- Kicksaw internal time tracking is non-billable and locked.
- Non-internal blank suggestions can use my Default Project.
- Do not use Kendra's Salesforce credentials, owner id, or local calendar data.
- Imported Salesforce records must use my authenticated Salesforce CLI user.

Set up or confirm weekday-only Codex automations using my current timezone from this Codex session or my device locale. Do not hardcode any timezone:
- 4:00 PM local time: remind me to log my time.
- 4:15 PM local time: sync the current month of Google Calendar events into .local/calendar-events.json for this repo, including attendee emails.
- 4:30 PM local time: show or relaunch the local app so I can review and submit time.

If an automation already exists, update or reuse it instead of creating a duplicate.
Use the same Codex task/chat for the 4:00 PM reminder and 4:30 PM app launch when possible.
If Codex only allows one same-task heartbeat, combine 4:00 PM and 4:30 PM into one weekday heartbeat and use a separate weekday cron for the 4:15 PM calendar sync.
Skip weekends.
```

## Daily Use

1. Start the local proxy:

   ```bash
   npm run local:proxy
   ```

2. Start the app:

   ```bash
   npm run dev -- --port 3001
   ```

3. Open the local app:

   ```text
   http://localhost:3001
   ```

4. Confirm your Delivery Team and Default Project.
5. If calendar events changed, use `Sync Calendar with Codex` or ask Codex to
   sync the full current month into `.local/calendar-events.json`.
6. Click `Refresh Suggestions`.
7. Review suggested rows. Fill any missing required fields.
8. Remove any row you do not want to import.
9. Click `Import to Salesforce`.
10. Click `Refresh Salesforce` to verify the new records.

## Required Fields Before Import

Suggested and manual rows require:

- Date.
- Project.
- TaskRay Task.
- Hours.
- Activity Type.
- Notes.

Billable is not required from the user. It defaults to true unless the project is
Kicksaw internal time tracking, where it is false and locked.

## Troubleshooting

- If `localhost` cannot be reached, the local app is not running. Start both
  `npm run local:proxy` and `npm run dev -- --port 3001` again.
- If the app uses a port other than `3001`, use the exact URL printed by the app.
- If Salesforce shows disconnected, run
  `sf org display --target-org KicksawProd`.
- If Salesforce auth expired, run
  `sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default`.
- If calendar rows do not update, Codex must rewrite
  `.local/calendar-events.json`, then you must click `Refresh Suggestions`.
- If a calendar event was added after the last sync, sync the calendar file again
  before refreshing suggestions.
- If an import fails, read the row-level error shown under Suggested Time Entries,
  fill missing required fields, and import again.
- If `Update App` reports local changes, ask Codex to inspect the changes before
  updating. The update button is safest when the local repo is clean.
- Personal calendar data lives under `.local/` and is ignored by Git.
