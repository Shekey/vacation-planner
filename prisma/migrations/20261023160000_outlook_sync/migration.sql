-- Approved time off in the person's own Outlook calendar, and the automatic reply (#35). Opt-in per person.
CREATE TABLE "OutlookConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountEmail" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "autoReply" BOOLEAN NOT NULL DEFAULT false,
    "autoReplyStart" TIMESTAMP(3),
    "autoReplyEnd" TIMESTAMP(3),
    "brokenAt" TIMESTAMP(3),
    "syncingUntil" TIMESTAMP(3),
    "syncAskedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutlookConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutlookEvent" (
    "connectionId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "endDate" DATE NOT NULL,

    CONSTRAINT "OutlookEvent_pkey" PRIMARY KEY ("connectionId","bookingId")
);

CREATE UNIQUE INDEX "OutlookConnection_userId_key" ON "OutlookConnection"("userId");

ALTER TABLE "OutlookConnection" ADD CONSTRAINT "OutlookConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OutlookEvent" ADD CONSTRAINT "OutlookEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OutlookConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
