# Backups and restore

All customer data lives in one Neon database. Two safety nets protect it:

1. **Neon's history** (point-in-time restore). Instant, but only as far back as the Neon plan allows, and it lives in the same account as the database.
2. **A nightly encrypted copy outside Neon** (`.github/workflows/backup.yml`). A GitHub Action dumps the database at 02:30 UTC, encrypts it with [age](https://age-encryption.org) to the public key in `.github/backup-recipients.txt`, and uploads it to a private storage bucket in the EU. The bucket deletes copies after 30 days. Only the offline private key can decrypt them, so neither GitHub nor the storage provider can read the data.

At 12:00 UTC the same workflow checks that the newest copy is less than 26 hours old and fails (GitHub emails you) when it isn't.

## Setup (owner, once)

### 1. Neon: at least 7 days of history

Neon console → the project → *Settings* → *Storage* / *Instant restore* (the name moves around): pick a plan whose restore window is 7 days or more and set the window to at least 7 days. The free plan keeps only hours.

### 2. A private bucket in the EU

Any S3-compatible storage works. Two good choices:

- **Hetzner Object Storage** (Germany, German company: simplest story for the privacy policy). Endpoint like `https://fsn1.your-objectstorage.com`, region `fsn1`.
- **AWS S3** in `eu-central-1` (Frankfurt). Leave the endpoint empty.

In the provider's console:

1. Create a **private** bucket, e.g. `vacation-planner-backups`.
2. Add a **lifecycle rule**: delete objects under `db/` 30 days after they were created. The privacy policy and DPA promise that deleted data leaves the backups after 30 days at the latest, so don't keep them longer.
3. Create an access key that can only **write and list this bucket**, without delete if the provider allows it. Then a leaked GitHub secret can't wipe the backups.

### 3. GitHub secrets

GitHub → the repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*:

| Secret | Value |
|---|---|
| `BACKUP_DATABASE_URL` | Neon's **direct** connection string (the host without `-pooler`), the same as `DATABASE_URL_UNPOOLED` in Vercel |
| `BACKUP_S3_BUCKET` | the bucket name |
| `BACKUP_S3_REGION` | e.g. `fsn1` or `eu-central-1` |
| `BACKUP_S3_ENDPOINT` | e.g. `https://fsn1.your-objectstorage.com`; not needed for AWS |
| `BACKUP_S3_ACCESS_KEY_ID` | from step 2.3 |
| `BACKUP_S3_SECRET_ACCESS_KEY` | from step 2.3 |
| `BACKUP_HEARTBEAT_URL` | optional: a Healthchecks.io or Better Stack heartbeat URL (expected daily, grace 2 hours). It alerts when the check stops running at all, e.g. when GitHub pauses scheduled workflows in a repo without commits for 60 days. |

Optional, for least privilege: a read-only Neon role just for backups. In the Neon SQL editor: `create role backup with login password '…'; grant pg_read_all_data to backup;` and use that role in `BACKUP_DATABASE_URL`.

### 4. The encryption key

On your own computer (`brew install age`, or `apt install age`):

```sh
age-keygen -o vacation-planner-backup.key
```

It prints `Public key: age1…`. Put that line (just the `age1…` part) into `.github/backup-recipients.txt` and commit it. Store `vacation-planner-backup.key` **offline**: a password manager entry plus a printed copy or a USB stick in a drawer. Never put it in GitHub, Vercel or the bucket. Without it the backups can't be read by anyone, including you.

You can add a second public key line (e.g. a business partner's) so either key can decrypt.

### 5. First run

GitHub → *Actions* → *Database backup* → *Run workflow*. Both jobs should be green and the bucket should hold `db/<date>.dump.age`. Then do the restore drill below once.

## Restore drill (do once, then yearly)

Tried on: _not yet_ (fill in the date when done).

You need `age` and the PostgreSQL tools (`pg_restore`, `psql`) on your computer, version equal to or newer than Neon's Postgres (Neon console shows it; `brew install postgresql@17`).

1. Download the newest `db/….dump.age` from the bucket (provider console, *Download*).
2. Decrypt it: `age --decrypt -i vacation-planner-backup.key -o backup.dump db-….dump.age`
3. In Neon: *Branches* → *New branch* `restore-drill` from `main`. In that branch, *Databases* → *New database* `restore_drill`. Copy its **direct** connection string.
4. Restore: `pg_restore --no-owner --no-acl --exit-on-error -d "<restore_drill URL>" backup.dump`
5. Compare a few counts with production (run the same query in both):
   ```sql
   select (select count(*) from "Workspace") workspaces, (select count(*) from "Membership") memberships,
          (select count(*) from "Booking") bookings, (select max("createdAt") from "Booking") newest_booking;
   ```
   The numbers should match production as of last night.
6. Delete the `restore-drill` branch and the local `backup.dump` (it is unencrypted).
7. Write the date into "Tried on" above.

## When something goes wrong

**A bad migration or a wrong delete, noticed within Neon's window** (7 days): use Neon's restore. Neon console → *Branches* → `main` → *Restore* → pick a time just before the mistake. Neon keeps the state from before the restore as a backup branch, so this is undoable. Every booking or change since that time is lost; tell affected customers.

**Older than the window, or the Neon project/account is gone:** restore the nightly copy into a new Neon project.

1. Create a Neon project in *AWS Europe Central 1 (Frankfurt)*.
2. Decrypt the newest copy (steps 1 and 2 of the drill) and restore it into the new project's database (step 4, with the new project's direct URL).
3. In Vercel → *Storage* connect the new database (or set `DATABASE_URL` and `DATABASE_URL_UNPOOLED` by hand), redeploy, sign in and check your workspace.
4. Update `BACKUP_DATABASE_URL` in GitHub.

Data written after last night's copy is lost.

**One customer's workspace, beyond the in-app 30-day undo:** restore a copy into a `restore-drill` branch as in the drill and copy that workspace's rows back by hand (`Workspace`, `WorkspaceSettings`, `Membership`, `Booking`, … filtered by `workspaceId`). Ask Claude for the exact statements; check them on a branch before running them on `main`.
