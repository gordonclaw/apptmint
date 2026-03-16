-- Lead questionnaire submissions
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,

  -- Business info
  business_type text not null, -- barber, hairdresser, both
  business_name text not null,
  locations integer default 1,
  staff integer default 1,
  years_in_business text,

  -- Online presence
  has_website boolean default false,
  website_url text,
  instagram text,
  facebook text,
  google_maps text,

  -- Contact
  name text not null,
  email text not null,
  phone text,

  -- Scores
  score_total integer default 0,
  score_digital integer default 0,
  score_business integer default 0,
  score_seo_opportunity integer default 0,
  effort_level text, -- High, Medium, Low

  -- Pipeline
  stage text default 'new', -- new, contacted, quoted, won, lost
  notes text,
  assigned_to text
);

-- Chair listings (shops with available chairs)
create table if not exists chair_listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  email text not null,
  phone text not null,
  location text not null,
  postcode text not null,
  shop_name text not null,
  chairs_available integer default 1,
  available_days jsonb default '[]',
  price_per_day_pence integer default 0,
  description text,
  status text default 'active' -- active, matched, paused, closed
);

-- Chair wanted (freelancers looking for chairs)
create table if not exists chair_wanted (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  name text not null,
  email text not null,
  phone text not null,
  location_text text not null,
  postcode text not null,
  days_wanted jsonb default '[]',
  max_budget_pence_daily integer default 0,
  experience_years integer default 0,
  specialities text,
  has_own_tools boolean default false,
  has_own_clients boolean default false,
  bio text,
  status text default 'active' -- active, matched, paused, closed
);

-- Enable RLS
alter table leads enable row level security;
alter table chair_listings enable row level security;
alter table chair_wanted enable row level security;

-- Allow anonymous inserts (public forms)
create policy "Allow anonymous insert on leads"
  on leads for insert
  to anon
  with check (true);

create policy "Allow anonymous insert on chair_listings"
  on chair_listings for insert
  to anon
  with check (true);

create policy "Allow anonymous insert on chair_wanted"
  on chair_wanted for insert
  to anon
  with check (true);

-- Allow authenticated users to read all (for admin dashboard)
create policy "Allow authenticated read on leads"
  on leads for select
  to authenticated
  using (true);

create policy "Allow authenticated update on leads"
  on leads for update
  to authenticated
  using (true);

create policy "Allow authenticated read on chair_listings"
  on chair_listings for select
  to authenticated
  using (true);

create policy "Allow authenticated read on chair_wanted"
  on chair_wanted for select
  to authenticated
  using (true);
