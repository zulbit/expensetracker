
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists budgets_user_category_uidx
  on public.budgets (user_id, category_id)
  where category_id is not null;
create unique index if not exists budgets_user_overall_uidx
  on public.budgets (user_id)
  where category_id is null;

grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;

alter table public.budgets enable row level security;

create policy "Users can view own budgets"
  on public.budgets for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own budgets"
  on public.budgets for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own budgets"
  on public.budgets for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budgets"
  on public.budgets for delete to authenticated
  using (auth.uid() = user_id);
