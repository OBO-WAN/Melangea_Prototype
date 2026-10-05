# Self-managed Firestore email function kit

This directory contains the local replacement for the deprecated
`firebase/firestore-send-email` Firebase Extension used by the
`newsletter-35ff2` project.

It is based on Trigger Email from Firestore 0.2.10 and now runs as a standard
Cloud Functions for Firebase (2nd gen) Function Kit.

## Production status

The migration is complete.

- Production queue: `mail_v2`
- Production validation: the admin notification and subscriber confirmation
  were both delivered successfully.
- The legacy `firebase/firestore-send-email` Extension instance has been
  uninstalled.
- The temporary `mail_migration_test` Firestore collection was used only for
  migration testing and can be deleted from Firestore.

## Current behavior

- Watches the configured Firestore mail collection with a 2nd-gen
  `onDocumentWritten` trigger.
- Preserves the existing Firestore database and database-region parameters.
- Binds `SMTP_PASSWORD` as a Cloud Functions secret.
- Preserves the extension's 120-second timeout.
- Declares the required Firestore, Eventarc, and Cloud Run runtime roles for the
  kit service account.
- If an exported `EVENTARC_CHANNEL` is present, also declares the Eventarc
  publisher role and publishing API required by the original optional
  lifecycle-event feature.
- Keeps the original parameter names so the migrated configuration remains
  compatible.

## Authentication scope

This project currently uses **Username & Password** SMTP authentication.
`SMTP_PASSWORD` is therefore the only secret parameter declared by this local
kit.

The original extension also offered optional OAuth2 secret parameters
(`CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN`). They are intentionally
not declared as Functions secrets here because optional Extension secrets become
required when converted to Functions secrets. If this project is changed to
OAuth2 later, migrate and bind those secrets before selecting OAuth2.

## Optional Eventarc events

The original extension can publish lifecycle events when events are enabled.
This project currently does not rely on those events. If a migrated
configuration contains `EVENTARC_CHANNEL`, the kit conditionally requests
`roles/eventarc.publisher` and the Eventarc Publishing API so the behavior is
preserved.

## Secrets and local configuration

Do not commit any `.env`, `.env.<project-id>`, or secret values. The
repository root `.gitignore` excludes them.

The local `.env.<project-id>` file supplies the production queue and SMTP
parameters. It is intentionally ignored by Git and must not be committed.

## Completed migration sequence

The project was migrated by installing this local kit, exporting the old
Extension configuration, validating the new function first on the isolated
`mail_migration_test` queue, moving production newsletter mail to `mail_v2`,
and only then uninstalling the old Extension instance.

Do not point another mail processor at `mail_v2` while this Function Kit is
active, otherwise the same queued message could be processed more than once.
