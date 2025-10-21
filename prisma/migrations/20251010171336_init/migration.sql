-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date_published" TIMESTAMP(3) NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT,
    "duration" INTEGER NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "hero_image_url" TEXT,
    "thumb_image_url" TEXT,
    "audio_url" TEXT,
    "spotify_url" TEXT,
    "apple_url" TEXT,
    "webplayer_url" TEXT,
    "is_hero" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayEvent" (
    "id" SERIAL NOT NULL,
    "episode_id" INTEGER NOT NULL,
    "user_session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "duration_played" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadioPlaylist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "source_url" TEXT,
    "start_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadioPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_slug_key" ON "Episode"("slug");

-- CreateIndex
CREATE INDEX "Episode_slug_idx" ON "Episode"("slug");

-- CreateIndex
CREATE INDEX "Episode_date_published_idx" ON "Episode"("date_published");

-- CreateIndex
CREATE INDEX "Episode_is_hero_idx" ON "Episode"("is_hero");

-- CreateIndex
CREATE INDEX "PlayEvent_episode_id_idx" ON "PlayEvent"("episode_id");

-- CreateIndex
CREATE INDEX "PlayEvent_user_session_id_idx" ON "PlayEvent"("user_session_id");

-- CreateIndex
CREATE INDEX "PlayEvent_timestamp_idx" ON "PlayEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSettings_key_key" ON "GlobalSettings"("key");

-- AddForeignKey
ALTER TABLE "PlayEvent" ADD CONSTRAINT "PlayEvent_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
