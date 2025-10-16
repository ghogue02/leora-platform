-- Add verification and reset token columns for portal users
BEGIN;

ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS "emailVerificationToken" text,
  ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "passwordResetToken" text,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiry" timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_portal_users_email_verification_token
  ON portal_users("emailVerificationToken");

CREATE INDEX IF NOT EXISTS idx_portal_users_password_reset_token
  ON portal_users("passwordResetToken");

COMMIT;
