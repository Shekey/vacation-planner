-- Approver and read-only roles (#77). Adding enum values is backwards compatible: old code never sees them until someone is given one.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'APPROVER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';
