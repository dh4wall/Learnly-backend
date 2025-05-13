/*
  Warnings:

  - Added the required column `category` to the `Content` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('LECTURES', 'NOTES', 'RESOURCES');

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "category" "ContentCategory" NOT NULL;
