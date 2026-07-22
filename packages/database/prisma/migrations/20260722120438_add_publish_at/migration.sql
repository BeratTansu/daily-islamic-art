-- AlterTable
ALTER TABLE "Artwork" ADD COLUMN     "publishAt" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "Artwork_publishAt_idx" ON "Artwork"("publishAt");
