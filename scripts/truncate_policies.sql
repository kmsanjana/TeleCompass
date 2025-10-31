-- Truncate all policy-related tables in correct order (respects foreign key constraints)
-- This will remove all policies, chunks, facts, comparisons, and query logs

TRUNCATE "PolicyFact", "PolicyChunk", "Policy", "Comparison", "QueryLog" CASCADE;

-- Optionally, also truncate states if you want to start completely fresh
-- TRUNCATE "State" CASCADE;
