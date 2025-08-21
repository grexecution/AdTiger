/*
  Warnings:

  - You are about to drop the column `budget` on the `AdGroup` table. All the data in the column will be lost.
  - You are about to drop the column `budget` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `clicks` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `conversions` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `cpa` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `cpc` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `cpm` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `ctr` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `impressions` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `revenue` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `roas` on the `Insight` table. All the data in the column will be lost.
  - You are about to drop the column `spend` on the `Insight` table. All the data in the column will be lost.
  - Made the column `metrics` on table `Insight` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."AdGroup" DROP COLUMN "budget",
ADD COLUMN     "budgetAmount" DOUBLE PRECISION,
ADD COLUMN     "budgetCurrency" TEXT;

-- AlterTable
ALTER TABLE "public"."Campaign" DROP COLUMN "budget",
ADD COLUMN     "budgetAmount" DOUBLE PRECISION,
ADD COLUMN     "budgetCurrency" TEXT;

-- AlterTable
ALTER TABLE "public"."Insight" DROP COLUMN "clicks",
DROP COLUMN "conversions",
DROP COLUMN "cpa",
DROP COLUMN "cpc",
DROP COLUMN "cpm",
DROP COLUMN "ctr",
DROP COLUMN "impressions",
DROP COLUMN "revenue",
DROP COLUMN "roas",
DROP COLUMN "spend",
ALTER COLUMN "metrics" SET NOT NULL;
