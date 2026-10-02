-- Social / chat link preview.
--
-- A short link answers with a redirect, and a redirect body carries no
-- metadata. Crawlers for Slack, WhatsApp, Discord, LinkedIn and X fetch the
-- short URL themselves and therefore had nothing to render, so a shared link
-- showed as a bare URL. These columns let an owner set the title, description
-- and image that a crawler will read.
--
-- Nullable with no default: a link without them keeps its current behaviour
-- exactly, which is to redirect. No backfill, because inventing titles for
-- existing links would be worse than showing nothing.
ALTER TABLE "Link"
    ADD COLUMN "ogTitle" TEXT,
    ADD COLUMN "ogDescription" TEXT,
    ADD COLUMN "ogImageUrl" TEXT;