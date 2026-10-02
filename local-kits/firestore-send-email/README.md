# Self-managed Firestore email function kit

This directory contains the local replacement for the deprecated
`firebase/firestore-send-email` Firebase Extension used by the
`newsletter-35ff2` project.

It is based on Trigger Email from Firestore 0.2.10 and is being migrated to
standard Cloud Functions for Firebase (2nd gen) before the Firebase Extensions
service is decommissioned.

## Current behavior

- Watches the configured Firestore mail collection with a 2nd-gen
  `onDocumentWritten` trigger.
- Preserves the existing Firestore database and database-region parameters.
- Binds `SMTP_PASSWORD` as a Cloud Functions secret.
- Preserves the extension's 120-second timeout.
- Declares `roles/datastore.user` in code for the kit runtime service account.
- Keeps the original parameter names so exported extension configuration can be
  reused during migration.

## Authentication scope

This project currently uses **Username & Password** SMTP authentication.
`SMTP_PASSWORD` is therefore the only secret parameter declared by this local
kit.

The original extension also offered optional OAuth2 secret parameters
(`CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN`). They are intentionally
not declared as Functions secrets here because optional Extension secrets become
required when converted to Functions secrets. If this project is changed to
OAuth2 later, migrate and bind those secrets before selecting OAuth2.

## Secrets and local configuration

Do not commit any `.env`, `.env.<project-id>`, or secret values. The repository
root `.gitignore` excludes them.

The existing extension remains the production mail sender until the replacement
kit has been installed, configured from the exported extension configuration,
deployed, and verified end-to-end.

## Migration sequence

1. Install this directory as a local function kit with `--no-configure`.
2. Export the existing `firestore-send-email` extension configuration into the
   new kit instance.
3. Deploy only the new kit instance.
4. Verify mail delivery and Firestore delivery-state updates.
5. Only after successful verification, uninstall the old Extension instance.

Never deploy the replacement and old extension against the same live mail
collection for an uncontrolled period, because both can react to the same
documents.
