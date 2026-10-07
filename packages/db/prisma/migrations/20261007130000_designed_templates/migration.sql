-- The designed templates replace the first nine (October 2026). Each stored
-- key moves to the design that took its place, in the same plan.
UPDATE "lodge" SET "template" = CASE "template"
  WHEN 'starter-clear' THEN 'starter-veranda'
  WHEN 'starter-simple' THEN 'starter-rondavel'
  WHEN 'starter-compact' THEN 'starter-shade'
  WHEN 'growth-classic' THEN 'growth-shoreline'
  WHEN 'growth-panorama' THEN 'growth-wordmark'
  WHEN 'growth-journal' THEN 'growth-overlap'
  WHEN 'pro-signature' THEN 'pro-escarpment'
  WHEN 'pro-safari' THEN 'pro-courtyard'
  WHEN 'pro-horizon' THEN 'pro-canopy'
  ELSE "template"
END
WHERE "template" IS NOT NULL;
