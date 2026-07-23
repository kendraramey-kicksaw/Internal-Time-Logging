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

5. Clone the repo locally, or have Codex clone/open it for you:

   ```bash
   git clone https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git
   cd Internal-Time-Logging
   ```

6. Open the cloned folder in Codex.

## One Prompt Setup

After the repo is open in Codex, paste this prompt:

```text
Set up the Internal Time Logging app for my user from start to finish.

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

Then use my connected Google Calendar integration to fetch my primary calendar events for the suggested-entry date range I request.
Write the events to .local/calendar-events.json in this repo as JSON with a top-level "records" array.
Each record must have: id, title, start, end, project, activityType, billable, responseStatus, transparency.
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

4. Ask Codex to refresh your calendar file for the dates you want.
5. Click `Refresh Calendar` in the app.
6. Review, edit, remove, or add suggested rows.
7. Click `Import to Salesforce`.

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
