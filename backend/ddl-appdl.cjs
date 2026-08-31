require("dotenv").config();
const { prisma } = require("./dist/config/prisma.js");
(async () => {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Link"
      ADD COLUMN IF NOT EXISTS "appDeepLink" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "appScheme" TEXT,
      ADD COLUMN IF NOT EXISTS "androidPackage" TEXT,
      ADD COLUMN IF NOT EXISTS "appPath" TEXT,
      ADD COLUMN IF NOT EXISTS "iosStoreUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "androidStoreUrl" TEXT
  `);
  console.log("DDL applied");
  await prisma.$disconnect();
})();
