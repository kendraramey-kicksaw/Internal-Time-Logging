# Local Salesforce Connection Reliability Fix

## Why this change exists

The Time Logging app uses the Salesforce command-line tool installed on each
person's computer. Salesforce now hides the temporary sign-in token in one of
the commands the app previously used. Without this change, the app can look
connected but fail when it tries to read or save time entries.

## What improves for users

- The app gets a fresh, local Salesforce session in the supported way.
- Starting the app no longer starts the same Salesforce sign-in check several
  times at once.
- If a session has expired, the app refreshes its local connection once before
  showing an error.
- If a person needs to sign in again, the app gives a clear command to use.

## What does not change

- Everyone continues to use their own Salesforce CLI login.
- The app does not store or send Salesforce passwords, access tokens, time
  entries, or project data anywhere new.
- This is a reliability fix only; it does not change how time is entered or
  which Salesforce records are used.

## Checks completed

Six automated tests pass, including tests for expired sessions, unavailable
Salesforce CLI authentication, and multiple requests arriving at the same time.
The app build also passes. Existing lint errors in an unrelated screen were not
changed by this work.
