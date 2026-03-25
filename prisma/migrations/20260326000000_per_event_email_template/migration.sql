-- Add email template fields to Event
ALTER TABLE "Event" ADD COLUMN "emailSubject" TEXT;
ALTER TABLE "Event" ADD COLUMN "emailContent" TEXT;

-- Remove templateId FK and column from EmailCampaign
ALTER TABLE "EmailCampaign" DROP CONSTRAINT IF EXISTS "EmailCampaign_templateId_fkey";
ALTER TABLE "EmailCampaign" DROP COLUMN IF EXISTS "templateId";

-- Drop EmailTemplate table (campaigns no longer reference it)
DROP TABLE IF EXISTS "EmailTemplate";
