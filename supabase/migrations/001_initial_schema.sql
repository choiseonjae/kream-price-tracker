-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create custom types
create type price_source as enum ('KREAM', 'JP_RETAIL', 'JP_RESALE');
create type alert_direction as enum ('KR_MORE_EXPENSIVE', 'JP_MORE_EXPENSIVE');

-- Users table
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Items table
create table public.items (
  id uuid primary key default uuid_generate_v4(),
  kream_url text unique not null,
  title text,
  brand text,
  model_code text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Price snapshots table
create table public.price_snapshots (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.items(id) on delete cascade,
  source price_source not null,
  price numeric not null,
  currency text not null,
  captured_at timestamptz not null default now()
);

-- Watch items table
create table public.watch_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  jp_reference_price numeric,
  currency text default 'JPY',
  created_at timestamptz default now(),
  unique (user_id, item_id)
);

-- Price alerts table
create table public.price_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  direction alert_direction not null,
  threshold_percent numeric not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Indexes
create index idx_price_snapshots_item_source_captured
  on public.price_snapshots (item_id, source, captured_at desc);

create index idx_watch_items_user_id
  on public.watch_items (user_id);

create index idx_price_alerts_user_id_active
  on public.price_alerts (user_id, is_active);

-- Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.watch_items enable row level security;
alter table public.price_alerts enable row level security;

-- RLS Policies

-- Users: users can read their own data
create policy "Users can read own data"
  on public.users
  for select
  using (auth.uid() = id);

-- Items: everyone can read items
create policy "Items are publicly readable"
  on public.items
  for select
  using (true);

-- Items: service role can insert/update
create policy "Service role can insert items"
  on public.items
  for insert
  with check (true);

create policy "Service role can update items"
  on public.items
  for update
  using (true);

-- Price snapshots: everyone can read
create policy "Price snapshots are publicly readable"
  on public.price_snapshots
  for select
  using (true);

-- Price snapshots: service role can insert
create policy "Service role can insert price snapshots"
  on public.price_snapshots
  for insert
  with check (true);

-- Watch items: users can only access their own watch items
create policy "Users can read own watch items"
  on public.watch_items
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own watch items"
  on public.watch_items
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watch items"
  on public.watch_items
  for delete
  using (auth.uid() = user_id);

-- Price alerts: users can only access their own alerts
create policy "Users can read own price alerts"
  on public.price_alerts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own price alerts"
  on public.price_alerts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own price alerts"
  on public.price_alerts
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own price alerts"
  on public.price_alerts
  for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_items_updated_at
  before update on public.items
  for each row
  execute function update_updated_at_column();
