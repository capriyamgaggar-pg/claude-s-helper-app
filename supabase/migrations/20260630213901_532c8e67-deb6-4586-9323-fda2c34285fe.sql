
-- 1. Extend intent_status enum
ALTER TYPE public.intent_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.intent_status ADD VALUE IF NOT EXISTS 'fulfilled';
ALTER TYPE public.intent_status ADD VALUE IF NOT EXISTS 'expired';
