-- Data minimization: no sick leave (health data) and no free-text notes are kept.
UPDATE "Booking" SET "type" = 'OTHER' WHERE "type" = 'SICK';
UPDATE "Booking" SET "note" = NULL, "decisionNote" = NULL WHERE "note" IS NOT NULL OR "decisionNote" IS NOT NULL;
