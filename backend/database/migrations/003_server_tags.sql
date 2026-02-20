-- Server tags: short 2-4 letter identifier per server, shown next to display names
ALTER TABLE servers ADD COLUMN IF NOT EXISTS tag VARCHAR(4);

DO $$ BEGIN
  ALTER TABLE servers ADD CONSTRAINT server_tag_length
    CHECK (tag IS NULL OR (char_length(tag) >= 2 AND char_length(tag) <= 4));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE servers ADD CONSTRAINT server_tag_alpha
    CHECK (tag IS NULL OR tag ~ '^[A-Za-z]+$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Members can toggle whether to show a server's tag next to their name
ALTER TABLE server_members
  ADD COLUMN IF NOT EXISTS show_tag BOOLEAN NOT NULL DEFAULT true;
