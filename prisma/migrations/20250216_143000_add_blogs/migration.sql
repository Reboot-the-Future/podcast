-- CreateTable
CREATE TABLE "Blog" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "excerpt" TEXT NOT NULL,
    "date" VARCHAR(50) NOT NULL,
    "tags" TEXT NOT NULL,
    "link" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blog_createdAt_idx" ON "Blog"("createdAt");