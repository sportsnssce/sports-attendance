-- V8__allow_multi_sport_captaincy.sql
-- A player may now captain multiple sports at once. This drops the schema-level constraint
-- that previously limited a player to captaining at most one sport; the composite PRIMARY KEY
-- (sport_id, player_id) still prevents duplicate rows.

ALTER TABLE sport_captains DROP CONSTRAINT IF EXISTS uk_captain_single_sport;