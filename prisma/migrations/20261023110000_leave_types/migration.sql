-- Admin-defined leave types (#34). A new table and a nullable column; existing bookings keep their built-in type.
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "countsAsVacation" BOOLEAN NOT NULL DEFAULT false,
    "allowanceDays" DECIMAL(4,1),
    "needsApproval" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeaveType_workspaceId_idx" ON "LeaveType"("workspaceId");

ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "leaveTypeId" TEXT;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
