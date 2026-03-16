-- Drop existing objects if they exist
drop trigger if exists lead_retention_trigger on leads;
drop trigger if exists leads_updated_at on leads;
drop trigger if exists chair_listings_retention on chair_listings;
drop trigger if exists chair_listings_updated_at on chair_listings;
drop trigger if exists chair_wanted_retention on chair_wanted;
drop trigger if exists chair_wanted_updated_at on chair_wanted;

drop policy if exists "Allow anonymous insert on leads" on leads;
drop policy if exists "Allow authenticated read on leads" on leads;
drop policy if exists "Allow authenticated update on leads" on leads;
drop policy if exists "Allow anonymous insert on chair_listings" on chair_listings;
drop policy if exists "Allow authenticated read on chair_listings" on chair_listings;
drop policy if exists "Allow authenticated update on chair_listings" on chair_listings;
drop policy if exists "Public read active chair_listings" on chair_listings;
drop policy if exists "Allow anonymous insert on chair_wanted" on chair_wanted;
drop policy if exists "Allow authenticated read on chair_wanted" on chair_wanted;
drop policy if exists "Allow authenticated update on chair_wanted" on chair_wanted;
drop policy if exists "Public read active chair_wanted" on chair_wanted;

drop table if exists leads cascade;
drop table if exists chair_listings cascade;
drop table if exists chair_wanted cascade;
drop function if exists set_lead_retention();
drop function if exists update_modified_column();

-- Functions
create function set_lead_retention()
returns trigger as $$
begin
  new.data_retention_until := new.created_at + interval '2 years';
  new.gdpr_consent_date := now();
  return new;
end;
$$ language plpgsql;

create function update_modified_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Lead questionnaire submissions
create table leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  business_type text not null,
  business_name text not null,
  locations integer default 1,
  staff integer default 1,
  years_in_business text,
  has_website boolean default false,
  website_url text,
  instagram text,
  facebook text,
  google_maps text,
  name text not null,
  email text not null,
  phone text,
  score_total integer default 0,
  score_digital integer default 0,
  score_business integer default 0,
  score_seo_opportunity integer default 0,
  effort_level text,
  stage text default 'new',
  notes text,
  assigned_to text,
  gdpr_consent boolean default false not null,
  gdpr_consent_date timestamptz,
  gdpr_marketing_consent boolean default false,
  data_retention_until timestamptz,
  deletion_requested_at timestamptz,
  data_source text default 'website_questionnaire'
);

create trigger lead_retention_trigger
  before insert on leads for each row execute function set_lead_retention();
create trigger leads_updated_at
  before update on leads for each row execute function update_modified_column();

-- Chair listings
create table chair_listings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,
  email text not null,
  phone text not null,
  location text not null,
  postcode text not null,
  region text,
  shop_name text not null,
  chairs_available integer default 1,
  available_days jsonb default '[]',
  price_per_day_pence integer default 0,
  description text,
  status text default 'active',
  gdpr_consent boolean default false not null,
  gdpr_consent_date timestamptz default now(),
  data_retention_until timestamptz
);

create trigger chair_listings_retention
  before insert on chair_listings for each row execute function set_lead_retention();
create trigger chair_listings_updated_at
  before update on chair_listings for each row execute function update_modified_column();

-- Chair wanted
create table chair_wanted (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  name text not null,
  email text not null,
  phone text not null,
  location_text text not null,
  postcode text not null,
  region text,
  days_wanted jsonb default '[]',
  max_budget_pence_daily integer default 0,
  experience_years integer default 0,
  specialities text,
  has_own_tools boolean default false,
  has_own_clients boolean default false,
  bio text,
  status text default 'active',
  gdpr_consent boolean default false not null,
  gdpr_consent_date timestamptz default now(),
  data_retention_until timestamptz
);

create trigger chair_wanted_retention
  before insert on chair_wanted for each row execute function set_lead_retention();
create trigger chair_wanted_updated_at
  before update on chair_wanted for each row execute function update_modified_column();

-- RLS
alter table leads enable row level security;
alter table chair_listings enable row level security;
alter table chair_wanted enable row level security;

-- Anonymous inserts (public forms)
create policy "Allow anonymous insert on leads"
  on leads for insert to anon with check (true);
create policy "Allow anonymous insert on chair_listings"
  on chair_listings for insert to anon with check (true);
create policy "Allow anonymous insert on chair_wanted"
  on chair_wanted for insert to anon with check (true);

-- Authenticated full access (admin)
create policy "Allow authenticated read on leads"
  on leads for select to authenticated using (true);
create policy "Allow authenticated update on leads"
  on leads for update to authenticated using (true);
create policy "Allow authenticated read on chair_listings"
  on chair_listings for select to authenticated using (true);
create policy "Allow authenticated update on chair_listings"
  on chair_listings for update to authenticated using (true);
create policy "Allow authenticated read on chair_wanted"
  on chair_wanted for select to authenticated using (true);
create policy "Allow authenticated update on chair_wanted"
  on chair_wanted for update to authenticated using (true);

-- Public read active listings (for map/browse)
create policy "Public read active chair_listings"
  on chair_listings for select to anon using (status = 'active');
create policy "Public read active chair_wanted"
  on chair_wanted for select to anon using (status = 'active');
