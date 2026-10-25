-- ============================================================
-- GIGSET — Performance indexes
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
-- Speeds up follower counts, notification lists, chat history,
-- "my applications" and newest-first opportunity lists.
-- ============================================================
create index if not exists "Connection_followeeId_idx"        on "Connection"("followeeId");
create index if not exists "Notification_userId_createdAt_idx" on "Notification"("userId", "createdAt");
create index if not exists "Application_applicantId_idx"      on "Application"("applicantId");
create index if not exists "Opportunity_createdAt_idx"        on "Opportunity"("createdAt");
create index if not exists "Message_conversationId_createdAt_idx" on "Message"("conversationId", "createdAt");
analyze;
