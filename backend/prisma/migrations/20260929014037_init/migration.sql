-- CreateEnum
CREATE TYPE "MessageState" AS ENUM ('SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "state" "MessageState" NOT NULL DEFAULT 'SENT';
