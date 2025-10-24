/*
  Warnings:

  - Made the column `link` on table `Blog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Blog" ALTER COLUMN "link" SET NOT NULL;

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "buzzsprout_episode_id" VARCHAR(255);
