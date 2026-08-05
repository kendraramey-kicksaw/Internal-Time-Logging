# Local CLI Setup

Phase 1 runs the Time Logging app locally. Salesforce reads and imports use the
user authenticated in Salesforce CLI. Google Calendar suggestions come from a
local file that Codex writes from the user's connected Google Calendar
integration.

For the simplest user-facing flow, start with
[internal-user-onboarding.md](internal-user-onboarding.md). This file is the
technical reference.

## One-Time Setup

1. Clone the public repo:

   ```bash
   git clone https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git
   cd Internal-Time-Logging
   ```

2. Install Node.js `22.13.0` or newer if needed.

3. Install or update Salesforce CLI. The local proxy uses the current CLI's
   `sf org auth show-access-token` command to obtain a refreshed local session:

   ```bash
   npm install --global @salesforce/cli
   ```

4. Authenticate Salesforce:

   ```bash
   sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default
   ```

5. Confirm Salesforce is connected:

   ```bash
   sf org display --target-org KicksawProd
   ```

6. Install app dependencies:

   ```bash
   npm install
   ```

7. Record the anonymous setup attempt if GitHub authentication is available:

   ```bash
   npm run track:setup
   ```

   This step is outside the app UI and does not block setup if tracking is
   skipped.

8. Start the local Salesforce proxy in one terminal:

   ```bash
   npm run local:proxy
   ```

9. Start the app in another terminal:

   ```bash
   npm run dev -- --port 3001
   ```

10. Open the local app:

   ```text
   http://localhost:3001
   ```

Keep both local processes running while using the app. If either process stops,
the app or Salesforce connection will stop working.

## Setup Tracking

Setup tracking is separate from the app UI. It posts one anonymous setup-attempt
comment to the repo's setup tracking issue when GitHub CLI authentication or a
GitHub token is available:

```bash
npm run track:setup
```

The marker includes only an anonymous install id hash, timestamp, platform,
repository, and app version. It does not collect calendar event details,
Salesforce time entries, project names, notes, access tokens, raw usernames, or
Salesforce usernames.

## Calendar Sync Prompt

Make sure Google Calendar is connected in Codex, then ask Codex to write the
calendar file. Use the user's actual project folder path.

```text
Using my Google Calendar integration, fetch my primary calendar events for the full current calendar month using my current timezone.
Write them to <PROJECT_FOLDER>/.local/calendar-events.json as JSON with a top-level "records" array.
Each record must have: id, title, start, end, project, activityType, billable, responseStatus, transparency, and attendeeEmails.
Use Google Calendar search only to find candidate events, then read or batch-read the full event details before writing the file.
responseStatus must use my_response_status when available, or the response status for the attendee where is_self/self is true.
attendeeEmails should include every non-resource attendee email when available so the app can match external client domains to active Salesforce projects for the selected Delivery Team.
Exclude declined, Focus Time, OOO/out-of-office, transparent, birthday, and FYI events.
Consolidate same-day calendar entries with the same title.
Treat meetings with DJ and me only as internal.
Use Kicksaw - Internal Time Tracking for People and Team Activities.
Use my Default Project only for otherwise blank non-internal suggestions.
Do not use another user's Salesforce credentials, owner id, or local calendar data.
```

After Codex writes the file, click `Refresh Suggestions`. The local proxy rereads
`.local/calendar-events.json` each time suggestions are refreshed.

## Project And Salesforce Refresh

- Select a Delivery Team at the top of the app: AOD, SOPS, COPS, MOPS, or
  Engineering.
- Click `Refresh Projects` to fetch live active Salesforce projects for that
  Delivery Team.
- Click `Refresh Salesforce` to fetch live TaskRay Time records for the selected
  date range.
- Salesforce records are imported as the CLI-authenticated user. The app does
  not use Kendra's owner id in local CLI mode.

## Optional Weekday Schedule

Ask Codex to set up weekday-only automations in the user's current timezone:

```text
Set up or confirm weekday-only Codex automations for this Time Logging app using my current timezone.
At 4:00 PM local time, remind me to log my time.
At 4:15 PM local time, sync the current month of Google Calendar events into this repo's .local/calendar-events.json file, including attendee emails.
At 4:30 PM local time, show or relaunch the local app so I can review and submit time.
Use the same Codex task/chat for the 4:00 PM reminder and 4:30 PM app launch when possible.
If Codex only allows one same-task heartbeat, combine 4:00 PM and 4:30 PM into one weekday heartbeat and use a separate weekday cron for the 4:15 PM calendar sync.
If any automation already exists, update or reuse it instead of creating a duplicate.
Skip weekends.
Do not hardcode a timezone.
```

## Updating The App

Local users can click `Check for Updates` and `Update App` in the app. This uses
Git to pull from the public repo and reinstall dependencies when needed.

If the update fails because of local changes, ask Codex to inspect the repo
before updating. Do not discard local changes unless the user explicitly asks.

## Notes

- The local proxy listens on `http://127.0.0.1:8789`.
- The app expects the proxy on port `8789`.
- If a user wants a different Salesforce CLI alias, start the proxy with:

  ```bash
  SF_ORG_ALIAS=MyAlias npm run local:proxy
  ```

- If port `8789` is busy, start the proxy with:

  ```bash
  LOCAL_PROXY_PORT=8790 npm run local:proxy
  ```

  Only do this if the app is updated to use the same proxy port.

- Local calendar events are ignored by Git via `.local/`, so personal calendar
  data does not get committed.
