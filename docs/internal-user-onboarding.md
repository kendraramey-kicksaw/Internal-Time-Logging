# Internal User Onboarding

Use these steps after Kendra shares the GitHub repo with you and you receive the
repository invitation email.

## What You Need

- Access to the Kicksaw Salesforce org.
- Access to your Kicksaw Google Calendar through Codex.
- Node.js `22.13.0` or newer.
- Salesforce CLI.
- Codex with access to clone or open GitHub repositories.

## Start From the Repo Invitation

1. Open the GitHub invitation email.
2. Click the invitation link and accept access to
   `kendraramey-kicksaw/Internal-Time-Logging`.
3. Sign in to GitHub if prompted.
4. Open the repo:

   ```text
   https://github.com/kendraramey-kicksaw/Internal-Time-Logging
   ```

5. Open Codex and paste the setup prompt below. The prompt includes the clone
   command, so Codex can clone/open the repo if you have not already done that.

## One Prompt Setup

After accepting the GitHub repo invite, paste this prompt into Codex:

```text
Set up the Internal Time Logging app for my user from start to finish.

If the repo is not already cloned locally, clone it from:
https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git

Use this command if you need to clone it:
git clone https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git

After cloning, open or switch into the Internal-Time-Logging project folder before running setup commands.
Use the repo README and docs/local-cli-setup.md as the source of truth.
If Node.js 22.13.0 or newer is not available, tell me exactly what to install.
If Salesforce CLI is not available, install it or give me the exact command to install it.
If my Google Calendar integration is not connected in Codex, pause and tell me how to connect it.
Authenticate my Salesforce user with alias KicksawProd using:
sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default

After Salesforce auth succeeds:
1. Run npm install.
2. Start the local Salesforce proxy with npm run local:proxy.
3. Start the app with npm run dev.
4. Tell me the local URL to open.

Then have me select my Delivery Team in the app: AOD, SOPS, COPS, MOPS, or Engineering.
Use my connected Google Calendar integration to fetch my primary calendar events for the suggested-entry date range I request.
Write the events to .local/calendar-events.json in this repo as JSON with a top-level "records" array.
Each record must have: id, title, start, end, project, activityType, billable, responseStatus, transparency, and attendeeEmails.
attendeeEmails should include every non-resource attendee email when available so the app can match external client domains to active Salesforce projects for my selected Delivery Team.
Use the app rules for categorizing calendar time:
- Exclude declined events.
- Exclude Focus Time.
- Exclude OOO/out-of-office events.
- Exclude transparent, birthday, and FYI events.
- Meetings and Coding and Configuration default to the relevant client/project work.
- People and Team Activities use Kicksaw - Internal Time Tracking.
- Meetings with DJ and me only are internal.

Once the file is written, have me click Refresh Calendar in the app.
Do not use Kendra's Salesforce credentials or owner id. The imported Salesforce records must use my authenticated Salesforce CLI user.
```

## Daily Use

1. Start the local proxy:

   ```bash
   npm run local:proxy
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Open the local URL, usually:

   ```text
   http://localhost:3000
   ```

4. Confirm your Delivery Team is selected at the top of the app.
5. Ask Codex to refresh your calendar file for the dates you want, including attendee emails.
6. Click `Refresh Calendar` in the app.
7. Review, edit, remove, or add suggested rows.
8. Click `Import to Salesforce`.

## Troubleshooting

- If Salesforce shows disconnected, run:

  ```bash
  sf org display --target-org KicksawProd
  ```

- If Salesforce auth expired, run:

  ```bash
  sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default
  ```

- If calendar rows do not update, ask Codex to rewrite
  `.local/calendar-events.json`, then click `Refresh Calendar` again.
- Personal calendar data lives under `.local/` and is ignored by Git.
