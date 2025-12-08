-- Add plan column to users table
alter table public.users add column if not exists plan text default 'FREE';

-- Create index on plan
create index if not exists idx_users_plan on public.users (plan);

-- Add constraint to ensure plan is either FREE or PRO
alter table public.users add constraint check_plan_values check (plan in ('FREE', 'PRO'));
