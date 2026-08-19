-- CreateEnum
CREATE TYPE "FilmmakerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "filmmaker_applications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "FilmmakerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filmmaker_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "filmmaker_applications_user_id_key" ON "filmmaker_applications"("user_id");

-- CreateIndex
CREATE INDEX "filmmaker_applications_status_idx" ON "filmmaker_applications"("status");

-- AddForeignKey
ALTER TABLE "filmmaker_applications" ADD CONSTRAINT "filmmaker_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
