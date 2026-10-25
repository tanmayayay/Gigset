-- Community wall: subreddit-style posts, threaded comments and votes. Safe to run more than once.
ALTER TABLE "CommunityGroup"
  ADD COLUMN IF NOT EXISTS "slug"     TEXT,
  ADD COLUMN IF NOT EXISTS "rules"    TEXT,
  ADD COLUMN IF NOT EXISTS "color"    TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "CommunityGroup_slug_key" ON "CommunityGroup"("slug");

CREATE TABLE IF NOT EXISTS "CommunityPost" (
  "id"           TEXT PRIMARY KEY,
  "groupId"      TEXT NOT NULL REFERENCES "CommunityGroup"("id") ON DELETE CASCADE,
  "authorId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title"        TEXT NOT NULL,
  "body"         TEXT,
  "mediaUrl"     TEXT,
  "flair"        TEXT,
  "pinned"       BOOLEAN NOT NULL DEFAULT false,
  "removed"      BOOLEAN NOT NULL DEFAULT false,
  "score"        INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CommunityPost_groupId_createdAt_idx" ON "CommunityPost"("groupId", "createdAt");
CREATE INDEX IF NOT EXISTS "CommunityPost_groupId_score_idx" ON "CommunityPost"("groupId", "score");
CREATE INDEX IF NOT EXISTS "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

CREATE TABLE IF NOT EXISTS "CommunityComment" (
  "id"        TEXT PRIMARY KEY,
  "postId"    TEXT NOT NULL REFERENCES "CommunityPost"("id") ON DELETE CASCADE,
  "authorId"  TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "parentId"  TEXT REFERENCES "CommunityComment"("id") ON DELETE CASCADE,
  "body"      TEXT NOT NULL,
  "score"     INTEGER NOT NULL DEFAULT 0,
  "removed"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

CREATE TABLE IF NOT EXISTS "CommunityVote" (
  "userId"     TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId"   TEXT NOT NULL,
  "value"      INTEGER NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "targetType", "targetId")
);
CREATE INDEX IF NOT EXISTS "CommunityVote_target_idx" ON "CommunityVote"("targetType", "targetId");

-- Lock the new tables away from Supabase's public API (the backend uses its own connection).
ALTER TABLE "CommunityPost"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunityComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommunityVote"    ENABLE ROW LEVEL SECURITY;
