-- AlterEnum: additive only — existing stored values (square/dots/rounded)
-- remain valid; the new labels map to qr-code-styling DotType values in
-- generateQr.ts (extraRounded -> "extra-rounded", classyRounded -> "classy-rounded").

ALTER TYPE "PatternStyle" ADD VALUE IF NOT EXISTS 'classy';
ALTER TYPE "PatternStyle" ADD VALUE IF NOT EXISTS 'extraRounded';
ALTER TYPE "PatternStyle" ADD VALUE IF NOT EXISTS 'classyRounded';