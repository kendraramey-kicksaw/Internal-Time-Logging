# Local Salesforce Authentication Review Note Design

## Purpose

Give a non-developer reviewer a short explanation of the local Salesforce
authentication reliability fix on this branch.

## Audience and scope

The audience is a repository owner reviewing the branch. The note explains the
reason for the change, the user-visible effect, and the validation performed.
It does not document implementation details, expose credentials, or change the
application's setup instructions.

## Chosen approach

Add `docs/local-salesforce-auth-reliability.md` as a standalone, plain-language
note. This keeps the targeted explanation easy to find without overloading the
README or technical setup guide.

## Success criteria

- A non-developer can understand why the change exists and what it improves.
- The note clearly states that credentials and Salesforce data are not stored or
  sent anywhere new.
- The note links the change to its automated verification.
