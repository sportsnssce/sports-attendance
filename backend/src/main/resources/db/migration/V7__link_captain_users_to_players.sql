-- V7__link_captain_users_to_players.sql
-- Link captain login accounts (users) directly to their player record instead of relying
-- on the email/fullName heuristic. Fixes the "captain sees the wrong sport" bug that occurs
-- when a username/email account is reused across players or the player has no email.

ALTER TABLE users ADD COLUMN IF NOT EXISTS player_id BIGINT REFERENCES players(id) ON DELETE SET NULL;

-- Backfill: best-effort link existing ROLE_CAPTAIN accounts to their player record by email.
UPDATE users u
SET player_id = p.id
FROM players p
WHERE u.player_id IS NULL
  AND u.role = 'ROLE_CAPTAIN'
  AND p.email IS NOT NULL
  AND LOWER(p.email) = LOWER(u.email);