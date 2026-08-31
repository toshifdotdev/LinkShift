-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "androidPackage" TEXT,
ADD COLUMN     "androidStoreUrl" TEXT,
ADD COLUMN     "appDeepLink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "appPath" TEXT,
ADD COLUMN     "appScheme" TEXT,
ADD COLUMN     "deepLink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iosStoreUrl" TEXT;
