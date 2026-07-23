# Local CLI Setup

Phase 1 runs the Time Logging app locally and uses each user's own Salesforce CLI
login. Google Calendar events come from a local file that Codex can refresh from
the user's connected Google Calendar integration.

## One-Time Setup for You

1. Install Salesforce CLI if it is not already installed:

   ```bash
   npm install --global @salesforce/cli
   ```

2. Authenticate Salesforce:

   ```bash
   sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default
   ```

3. Confirm Salesforce is connected:

   ```bash
   sf org display --target-org KicksawProd
   ```

4. Install app dependencies from this project folder:

   ```bash
   npm install
   ```

5. Start the local Salesforce proxy in one terminal:

   ```bash
   npm run local:proxy
   ```

6. Start the app in another terminal:

   ```bash
   npm run dev
   ```

7. Open the local app:

   ```text
   http://localhost:3000
   ```

8. To sync calendar suggestions, make sure your Google Calendar integration is
   connected in Codex, then ask Codex:

   ```text
   Using my Google Calendar integration, fetch my primary calendar events from YYYY-MM-DD to YYYY-MM-DD.
   Write them to /Users/kendraramey/Documents/Time Logging/.local/calendar-events.json as JSON with a top-level "records" array.
   Each record must have: id, title, start, end, project, activityType, billable, responseStatus, transparency.
   Use the Crisis24 - OnSolve Migration - (SOPS) project for Meetings and Coding and Configuration.
   Use Kicksaw - Internal Time Tracking for People and Team Activities.
   Exclude declined, Focus Time, OOO/out-of-office, transparent, birthday, and FYI events.
   ```

9. In the app, click `Refresh Calendar`. The local proxy rereads
   `.local/calendar-events.json` each time, so any new Codex sync will appear
   after refresh.

## Setup for Other Kicksaw Users

1. Give the user access to this project folder or repo.

2. Have them install Node.js `22.13.0` or newer.

3. Have them install Salesforce CLI:

   ```bash
   npm install --global @salesforce/cli
   ```

4. Have them authenticate their own Salesforce user:

   ```bash
   sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default
   ```

5. Have them confirm the org is connected:

   ```bash
   sf org display --target-org KicksawProd
   ```

6. From the project folder, have them install dependencies:

   ```bash
   npm install
   ```

7. Have them start the local proxy:

   ```bash
   npm run local:proxy
   ```

8. In a second terminal, have them start the app:

   ```bash
   npm run dev
   ```

9. Have them open:

   ```text
   http://localhost:3000
   ```

10. For calendar suggestions, have them connect Google Calendar in Codex and ask
    Codex to sync their events into their local `.local/calendar-events.json`
    file using the prompt from the previous section, with their own project path.

## Notes

- The local proxy listens on `http://127.0.0.1:8789`.
- If a user wants a different Salesforce CLI alias, start the proxy with:

  ```bash
  SF_ORG_ALIAS=MyAlias npm run local:proxy
  ```

- If port `8789` is busy, start the proxy with:

  ```bash
  LOCAL_PROXY_PORT=8790 npm run local:proxy
  ```

  The app currently expects port `8789`, so only change this if the app is
  updated to match.

- The app imports time entries as the Salesforce user authenticated in that
  local CLI session. It does not use Kendra's Salesforce owner id in local mode.
- Local calendar events are ignored by Git via `.local/` so personal calendar
  data does not get committed.
