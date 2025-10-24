-- CreateTable
CREATE TABLE "Trailer" (
    "id" SERIAL NOT NULL,
    "audio_url" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);
