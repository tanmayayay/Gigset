-- Collab: connections-only opportunities, and the press-kit style sent with a booking request. Safe to run more than once.
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "visibility"  TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Booking"     ADD COLUMN IF NOT EXISTS "epkTemplate" TEXT NOT NULL DEFAULT 'classic';
CREATE INDEX IF NOT EXISTS "Opportunity_visibility_idx" ON "Opportunity"("visibility");
