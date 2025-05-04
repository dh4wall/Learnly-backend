-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "provider" TEXT,
    "provider_id" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding" (
    "user_id" INTEGER NOT NULL,
    "education_level" TEXT,
    "username" TEXT,
    "interests" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_username_key" ON "onboarding"("username");

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
