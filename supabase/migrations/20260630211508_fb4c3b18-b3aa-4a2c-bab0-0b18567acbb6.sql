
ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS place_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locality text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS place_id text;

CREATE INDEX IF NOT EXISTS intents_city_idx ON public.intents (city);
CREATE INDEX IF NOT EXISTS intents_locality_idx ON public.intents (locality);
CREATE INDEX IF NOT EXISTS intents_state_idx ON public.intents (state);
CREATE INDEX IF NOT EXISTS intents_place_id_idx ON public.intents (place_id);
