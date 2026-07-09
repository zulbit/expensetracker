
-- 1. Add kind to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'expense'
  CHECK (kind IN ('expense', 'income'));

-- 2. Backfill "Pay" income category for existing users
INSERT INTO public.categories (user_id, name, color, icon, sort_order, kind)
SELECT p.id, 'Pay', '#39ff14', 'Wallet', 0, 'income'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = p.id AND c.kind = 'income'
);

-- 3. Update handle_new_user to also seed the Pay income category
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.categories (user_id, name, color, icon, sort_order, kind) VALUES
    (NEW.id, 'Pay',         '#39ff14', 'Wallet', 0, 'income'),
    (NEW.id, 'Outing',      '#00e5ff', 'PartyPopper', 1, 'expense'),
    (NEW.id, 'Dinner',      '#ff2bd6', 'UtensilsCrossed', 2, 'expense'),
    (NEW.id, 'Lunch',       '#39ff14', 'Utensils', 3, 'expense'),
    (NEW.id, 'Petrol',      '#f59e0b', 'Fuel', 4, 'expense'),
    (NEW.id, 'Online Ride', '#8b5cf6', 'Car', 5, 'expense'),
    (NEW.id, 'Shopping',    '#22d3ee', 'ShoppingBag', 6, 'expense'),
    (NEW.id, 'Clothing',    '#f472b6', 'Shirt', 7, 'expense');
  RETURN NEW;
END; $function$;

-- 4. Incomes table
CREATE TABLE IF NOT EXISTS public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount >= 0),
  note text,
  received_at date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc'))::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own incomes all" ON public.incomes
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_incomes_updated_at
BEFORE UPDATE ON public.incomes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_incomes_user_received ON public.incomes(user_id, received_at DESC);
