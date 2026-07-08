/*
  Warnings:

  - A unique constraint covering the columns `[sourceId]` on the table `Artwork` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "contributors" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "transcription" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Artwork_sourceId_key" ON "Artwork"("sourceId");
