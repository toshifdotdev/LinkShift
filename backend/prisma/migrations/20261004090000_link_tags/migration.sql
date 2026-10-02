-- Campaign tags.
--
-- An owner labels links so a growing account stays navigable. Dub reports
-- 283,000 links grouped across 25,000 tags, so this is a feature people
-- actually reach for rather than a checkbox.
--
-- Tag is scoped to the user and unique by name per user, so two people using
-- the same account cannot collide on "launch" and the picker cannot accumulate
-- duplicates that then need disambiguating everywhere they appear.
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- Enforced by the database rather than only by application code, because a
-- race between two concurrent "create launch" requests would otherwise produce
-- a duplicate the user sees in their sidebar.
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- Tag listings are always per-user and ordered by name.
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- Explicit join rather than an implicit many-to-many, so filtering links by
-- tag is an indexed lookup on a composite primary key instead of a scan.
CREATE TABLE "LinkTag" (
    "linkId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "LinkTag_pkey" PRIMARY KEY ("linkId", "tagId")
);

-- Leads with tagId because the access pattern is "all links for this tag",
-- whereas the primary key serves "which tags does this link carry".
CREATE INDEX "LinkTag_tagId_idx" ON "LinkTag"("tagId");