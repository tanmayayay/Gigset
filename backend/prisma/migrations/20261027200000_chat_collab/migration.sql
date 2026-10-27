-- Messages: requests + group chats. Collab: relaxed collab requests with shared times. Safe to run more than once.
ALTER TABLE "Conversation"
  ADD COLUMN IF NOT EXISTS "kind"        TEXT NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;
-- Existing conversations with more than two people are groups.
UPDATE "Conversation" c SET "kind" = 'GROUP' WHERE (SELECT COUNT(*) FROM "ConversationMember" m WHERE m."conversationId" = c."id") > 2;

CREATE TABLE IF NOT EXISTS "CollabRequest" (
  "id"             TEXT PRIMARY KEY,
  "requesterId"    TEXT NOT NULL,
  "hostId"         TEXT NOT NULL,
  "vibe"           TEXT NOT NULL DEFAULT 'JAM',
  "note"           TEXT,
  "epkTemplate"    TEXT NOT NULL DEFAULT 'classic',
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "options"        JSONB,
  "chosen"         JSONB,
  "conversationId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CollabRequest_hostId_status_idx"      ON "CollabRequest"("hostId", "status");
CREATE INDEX IF NOT EXISTS "CollabRequest_requesterId_status_idx" ON "CollabRequest"("requesterId", "status");
