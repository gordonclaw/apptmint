-- Shop onboarding tables

-- Shops
create table if not exists shops (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  postcode text not null,
  phone text not null,
  email text not null,
  whatsapp_number text,
  business_type text not null, -- barber, hairdresser, both
  status text default 'onboarding', -- onboarding, active, paused, closed
  plan text default 'solo', -- solo, shop
  gdpr_consent boolean default false not null,
  gdpr_consent_date timestamptz default now()
);

create trigger shops_updated_at
  before update on shops for each row execute function update_modified_column();

-- Opening hours (one row per day per shop)
create table if not exists opening_hours (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references shops(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Mon, 6=Sun
  is_open boolean default true not null,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  unique(shop_id, day_of_week)
);

-- Staff
create table if not exists staff (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  role text default 'barber', -- barber, stylist, manager
  phone text,
  email text,
  is_active boolean default true
);

-- Staff working pattern (one row per day per staff)
create table if not exists staff_hours (
  id uuid default gen_random_uuid() primary key,
  staff_id uuid references staff(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_working boolean default true not null,
  start_time time,
  end_time time,
  unique(staff_id, day_of_week)
);

-- Services
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  duration_mins integer not null default 30,
  base_price_pence integer not null default 0,
  is_active boolean default true,
  sort_order integer default 0
);

-- Which staff can do which service
create table if not exists staff_services (
  staff_id uuid references staff(id) on delete cascade not null,
  service_id uuid references services(id) on delete cascade not null,
  primary key (staff_id, service_id)
);

-- Pricing rules (surcharge/discount per time window)
create table if not exists pricing_rules (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null, -- e.g. "Early bird", "Late night", "Weekend"
  rule_type text not null, -- discount, surcharge
  amount_type text not null, -- percentage, fixed
  amount integer not null, -- percentage (e.g. 20) or pence (e.g. 500)
  applies_to text default 'all', -- all, or service_id
  service_id uuid references services(id) on delete cascade,
  -- When does this rule apply?
  days jsonb default '[]', -- [0,1,2,3,4,5,6] Mon=0 Sun=6
  time_start time,
  time_end time,
  is_active boolean default true
);

-- RLS
alter table shops enable row level security;
alter table opening_hours enable row level security;
alter table staff enable row level security;
alter table staff_hours enable row level security;
alter table services enable row level security;
alter table staff_services enable row level security;
alter table pricing_rules enable row level security;

-- Anonymous inserts (onboarding forms)
create policy "anon insert shops" on shops for insert to anon with check (true);
create policy "anon insert opening_hours" on opening_hours for insert to anon with check (true);
create policy "anon insert staff" on staff for insert to anon with check (true);
create policy "anon insert staff_hours" on staff_hours for insert to anon with check (true);
create policy "anon insert services" on services for insert to anon with check (true);
create policy "anon insert staff_services" on staff_services for insert to anon with check (true);
create policy "anon insert pricing_rules" on pricing_rules for insert to anon with check (true);

-- Authenticated read/update (admin)
create policy "auth read shops" on shops for select to authenticated using (true);
create policy "auth update shops" on shops for update to authenticated using (true);
create policy "auth read opening_hours" on opening_hours for select to authenticated using (true);
create policy "auth read staff" on staff for select to authenticated using (true);
create policy "auth read staff_hours" on staff_hours for select to authenticated using (true);
create policy "auth read services" on services for select to authenticated using (true);
create policy "auth read staff_services" on staff_services for select to authenticated using (true);
create policy "auth read pricing_rules" on pricing_rules for select to authenticated using (true);
