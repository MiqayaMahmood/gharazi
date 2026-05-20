-- Sprint 12 launch readiness indexes for geo-assisted search and map previews.
CREATE INDEX IF NOT EXISTS "listings_latitude_longitude_idx" ON "listings" ("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "projects_latitude_longitude_idx" ON "projects" ("latitude", "longitude");
