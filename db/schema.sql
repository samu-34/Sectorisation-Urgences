CREATE TABLE IF NOT EXISTS source_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS official_subquarters (
  name TEXT PRIMARY KEY,
  quartier TEXT NOT NULL,
  commune TEXT NOT NULL,
  medimap_subzone_id TEXT NOT NULL,
  geometry_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS address_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cle_interop TEXT NOT NULL,
  street_name TEXT NOT NULL,
  street_key TEXT NOT NULL,
  house_number TEXT,
  suffix TEXT,
  full_address TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  official_subquarter_name TEXT,
  medimap_subzone_id TEXT,
  lieudit_complement TEXT,
  source TEXT,
  source_updated_at TEXT,
  FOREIGN KEY (official_subquarter_name) REFERENCES official_subquarters(name)
);

CREATE INDEX IF NOT EXISTS idx_address_points_street_key
  ON address_points(street_key);

CREATE INDEX IF NOT EXISTS idx_address_points_cle_interop
  ON address_points(cle_interop);

CREATE INDEX IF NOT EXISTS idx_address_points_subzone
  ON address_points(medimap_subzone_id);

CREATE TABLE IF NOT EXISTS street_index (
  street_key TEXT PRIMARY KEY,
  street_label TEXT NOT NULL,
  medimap_subzone_id TEXT NOT NULL,
  official_subquarter_name TEXT NOT NULL,
  address_count INTEGER NOT NULL,
  confidence REAL NOT NULL,
  is_ambiguous INTEGER NOT NULL,
  alternatives_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_street_index_subzone
  ON street_index(medimap_subzone_id);
