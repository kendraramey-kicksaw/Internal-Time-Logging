# Internal Time Logging

Calendar-assisted TaskRay time entry review and import for Kicksaw users.

The repository is public:

```text
https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git
```

The repo being public does not expose anyone's Salesforce or Google Calendar
data. Each user authenticates locally with their own Salesforce CLI login and
their own Codex Google Calendar integration.

## Start Here

For a non-developer setup, use
[docs/internal-user-onboarding.md](docs/internal-user-onboarding.md). It includes
one Codex prompt that can clone the public repo, check prerequisites, authenticate
Salesforce, sync Google Calendar data, and launch the local app.

For the technical reference behind that flow, use
[docs/local-cli-setup.md](docs/local-cli-setup.md).

## Prerequisites

- Node.js `22.13.0` or newer.
- Salesforce CLI.
- Git.
- Kicksaw Salesforce access.
- Codex with the Google Calendar integration connected for the user's Kicksaw
  calendar.

## Developer Quick Start

```bash
git clone https://github.com/kendraramey-kicksaw/Internal-Time-Logging.git
cd Internal-Time-Logging
npm install
npm run local:proxy
npm run dev -- --port 3001
```

Open:

```text
http://localhost:3001
```

Run the proxy and the app at the same time. If the local task or terminal stops,
the localhost link will stop working and the services need to be started again.

## How Data Moves

- Salesforce reads and imports go through the local proxy at
  `http://127.0.0.1:8789`.
- Salesforce records are imported as the user authenticated in Salesforce CLI.
- Google Calendar suggestions are read from `.local/calendar-events.json`.
- `.local/` is ignored by Git, so personal calendar data stays local.
- The app's `Refresh Suggestions` button rereads the local calendar file. If a
  user adds a new calendar event, Codex must sync the calendar file again first.
- The `Refresh Salesforce` and `Refresh Projects` buttons reread live Salesforce
  data through the local proxy.
- The app sends an anonymous setup check-in when it loads so Kendra can estimate
  unique devices/users using the app.

## Setup Tracking

Setup tracking is intentionally minimal. It stores:

- A random local install id from `.local/setup-telemetry.json`.
- A hashed Salesforce username when Salesforce CLI is connected.
- The user's email domain, such as `kicksaw.com`.
- App version, source, first seen, last seen, and check-in count.

It does not store calendar event details, Salesforce time entries, project names,
notes, access tokens, or raw Salesforce usernames.

To disable setup tracking locally:

```bash
TIME_LOGGING_TELEMETRY_DISABLED=1 npm run local:proxy
```

To send setup check-ins somewhere other than the default hosted endpoint:

```bash
TIME_LOGGING_TELEMETRY_ENDPOINT=https://example.com/api/telemetry/setup npm run local:proxy
```

## Salesforce Auth

Use the shared org alias expected by the local proxy:

```bash
sf org login web --alias KicksawProd --instance-url https://login.salesforce.com --set-default
sf org display --target-org KicksawProd
```

## Calendar Sync File

Codex should write calendar events to:

```text
.local/calendar-events.json
```

The file must be JSON with a top-level `records` array. Each record should
include:

```text
id, title, start, end, project, activityType, billable, responseStatus, transparency, attendeeEmails
```

For best project matching, `attendeeEmails` should include every non-resource
attendee email available from the Google Calendar event.

## App Rules

- Declined events are excluded.
- `Focus Time` events are excluded.
- OOO/out-of-office events are excluded.
- Transparent, birthday, and FYI events are excluded.
- Same-day calendar entries with the same title are consolidated.
- Meetings with DJ and the user only are treated as internal.
- Kicksaw internal time tracking is non-billable and the billable checkbox is
  locked.
- Non-internal rows require Date, Project, TaskRay Task, Hours, Activity Type,
  and Notes before import.
- Delivery Team is selected in the app and is used when matching active
  Salesforce projects.
- A user's Default Project can fill otherwise blank non-internal suggestions.

## Useful Commands

- `npm run local:proxy`: start the local Salesforce proxy.
- `npm run dev -- --port 3001`: start the local app preview.
- `npm run build`: verify the Vinext build output.
- `npm test`: build the app and verify the rendered loading skeleton.
- `npm run db:generate`: generate Drizzle migrations after schema changes.
