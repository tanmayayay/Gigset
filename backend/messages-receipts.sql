-- ============================================================
-- GIGSET — Message receipts (sent / delivered / read ticks) + live inbox
-- Run ONCE in the Supabase SQL editor BEFORE deploying the new backend.
-- Idempotent: safe to re-run.
-- ============================================================

alter table "Message" add column if not exists "deliveredAt" timestamp(3);
alter table "Message" add column if not exists "readAt" timestamp(3);

-- Messages that already exist count as delivered and read (no surprise unread badges).
update "Message" set "deliveredAt" = "createdAt", "readAt" = "createdAt" where "readAt" is null;

-- Fast "what is unread?" lookups.
create index if not exists "Message_unread_idx" on "Message"("conversationId") where "readAt" is null;
create index if not exists "Message_undelivered_idx" on "Message"("conversationId") where "deliveredAt" is null;
