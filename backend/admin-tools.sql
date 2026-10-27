-- Admin tools: roles, suspension, activity tracking, audit log and announcements. Safe to run more than once.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role"          TEXT NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS "suspendedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendReason" TEXT;

CREATE TABLE IF NOT EXISTS "ActiveDay" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "day"    TEXT NOT NULL,
  PRIMARY KEY ("userId", "day")
);
CREATE INDEX IF NOT EXISTS "ActiveDay_day_idx" ON "ActiveDay"("day");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT PRIMARY KEY,
  "adminId"    TEXT NOT NULL,
  "adminName"  TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "targetType" TEXT,
  "targetId"   TEXT,
  "summary"    TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id"        TEXT PRIMARY KEY,
  "title"     TEXT NOT NULL,
  "body"      TEXT,
  "tone"      TEXT NOT NULL DEFAULT 'info',
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Announcement_active_createdAt_idx" ON "Announcement"("active", "createdAt");
