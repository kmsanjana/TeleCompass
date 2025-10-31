-- Reset failed policies back to pending status for re-processing
-- This is useful when policies failed due to temporary issues (like API quota)

UPDATE "Policy" 
SET 
  status = 'pending',
  processedAt = NULL
WHERE status = 'failed';

-- Also clean up any orphaned chunks or facts from failed policies
DELETE FROM "PolicyChunk" 
WHERE policyId IN (
  SELECT id FROM "Policy" WHERE status = 'pending'
);

DELETE FROM "PolicyFact" 
WHERE policyId IN (
  SELECT id FROM "Policy" WHERE status = 'pending'
);
