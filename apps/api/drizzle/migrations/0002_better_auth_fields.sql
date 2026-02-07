-- Better Auth schema update
-- Adds required fields for Better Auth compatibility

-- Add email_verified column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Add image column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS image text;

-- Create index on email_verified for performance
CREATE INDEX IF NOT EXISTS users_email_verified_idx ON users(email_verified);
