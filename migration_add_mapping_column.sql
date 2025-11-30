-- Migration: Add mapping column to gunapad_logs table
-- Date: 2025-11-27
-- Purpose: Store child name mapping for anonymization tracking

ALTER TABLE gunapad_logs
ADD COLUMN IF NOT EXISTS mapping jsonb;

-- Add comment to document the column structure
COMMENT ON COLUMN gunapad_logs.mapping IS 'Stores child anonymization mapping: { "childIdMap": { "RealName": "Child_1" }, "reverseMap": { "Child_1": "RealName" } }';
