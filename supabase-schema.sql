-- Project Buzz - Multi-tenant booking system for barbers & hairdressers
-- Single Supabase instance, all tables keyed by shop_id

-- Enable PostGIS for location-based queries (chair rental, discovery)
create extension if not exists postgis;

-- ============================================================
-- SHOPS
-- ============================================================
create table shops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id),
  name text not null,
  slug text unique not null,
  description text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  country text default 'GB',
  location geography(point, 4326),  -- lat/lng for proximity search
  phone text,
  email text,
  whatsapp_number text,             -- for WhatsApp Business API
  website_url text,
  logo_url text,
  cover_image_url text,
  plan text default 'solo' check (plan in ('solo', 'shop')),
  stripe_customer_id text,
  stripe_subscription_id text,
  is_active boolean default true,
  has_website boolean default false, -- £150 website add-on
  opening_hours jsonb default '{
    "monday":    {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday":   {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday":  {"open": "09:00", "close": "18:00", "closed": false},
    "friday":    {"open": "09:00", "close": "18:00", "closed": false},
    "saturday":  {"open": "09:00", "close": "17:00", "closed": false},
    "sunday":    {"open": null, "close": null, "closed": true}
  }'::jsonb
);

create index idx_shops_slug on shops(slug);
create index idx_shops_location on shops using gist(location);
create index idx_shops_owner on shops(owner_id);

-- ============================================================
-- STAFF
-- ============================================================
create table staff (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  shop_id uuid references shops(id) on delete cascade not null,
  user_id uuid references auth.users(id),  -- optional, for staff login
  name text not null,
  role text default 'barber' check (role in ('barber', 'hairdresser', 'manager', 'owner')),
  email text,
  phone text,
  whatsapp_number text,
  avatar_url text,
  is_active boolean default true,
  sort_order int default 0
);

create index idx_staff_shop on staff(shop_id);

-- ============================================================
-- STAFF SUBSTITUTIONS (if Janice is off, suggest Cheryl)
-- ============================================================
create table staff_substitutions (
  id uuid primary key default gen_random_uuid(),
  primary_staff_id uuid references staff(id) on delete cascade not null,
  substitute_staff_id uuid references staff(id) on delete cascade not null,
  priority int default 1,  -- 1 = first choice, 2 = second, etc.
  unique(primary_staff_id, substitute_staff_id)
);

-- ============================================================
-- SERVICES
-- ============================================================
create table services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  description text,
  duration_mins int not null default 30,
  price_pence int not null,           -- store in pence to avoid float issues
  is_active boolean default true,
  sort_order int default 0
);

create index idx_services_shop on services(shop_id);

-- ============================================================
-- STAFF AVAILABILITY (recurring weekly schedule)
-- ============================================================
create table staff_availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade not null,
  day_of_week int not null check (day_of_week between 0 and 6),  -- 0=Mon, 6=Sun
  start_time time not null,
  end_time time not null,
  unique(staff_id, day_of_week)
);

create index idx_availability_staff on staff_availability(staff_id);

-- ============================================================
-- TIME OFF (holidays, sick days)
-- ============================================================
create table time_off (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  staff_id uuid references staff(id) on delete cascade not null,
  shop_id uuid references shops(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  type text not null check (type in ('holiday', 'sick', 'personal', 'other')),
  reason text,
  notify_customers boolean default true,
  customers_notified boolean default false
);

create index idx_timeoff_staff on time_off(staff_id);
create index idx_timeoff_dates on time_off(start_date, end_date);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text,
  email text,
  whatsapp_number text,
  notes text,
  preferred_staff_id uuid references staff(id) on delete set null,
  auto_rebook_weeks int,  -- null = no auto rebook, e.g. 6 = every 6 weeks
  unique(phone)
);

create index idx_customers_phone on customers(phone);
create index idx_customers_whatsapp on customers(whatsapp_number);

-- ============================================================
-- CUSTOMER <-> SHOP relationship (a customer can visit multiple shops)
-- ============================================================
create table customer_shops (
  customer_id uuid references customers(id) on delete cascade not null,
  shop_id uuid references shops(id) on delete cascade not null,
  first_visit timestamptz default now(),
  last_visit timestamptz,
  visit_count int default 0,
  primary key (customer_id, shop_id)
);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  shop_id uuid references shops(id) on delete cascade not null,
  staff_id uuid references staff(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'confirmed' check (status in (
    'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
  )),
  is_recurring boolean default false,
  recurrence_weeks int,           -- e.g. 6 for every 6 weeks
  parent_booking_id uuid references bookings(id) on delete set null,  -- links recurring bookings
  gift_voucher_id uuid,           -- references gift_vouchers if used
  customer_name text,             -- denormalised for quick display
  customer_phone text,
  notes text,
  price_pence int,                -- price at time of booking
  whatsapp_confirmed boolean default false,
  whatsapp_reminder_sent boolean default false,
  cancelled_at timestamptz,
  cancellation_reason text
);

create index idx_bookings_shop on bookings(shop_id);
create index idx_bookings_staff on bookings(staff_id);
create index idx_bookings_customer on bookings(customer_id);
create index idx_bookings_time on bookings(start_time);
create index idx_bookings_status on bookings(status);

-- ============================================================
-- NO-SHOW TRACKING (aggregated view for owner/manager dashboard)
-- ============================================================
create view no_show_stats as
select
  b.shop_id,
  count(*) as total_no_shows,
  sum(b.price_pence) as total_lost_revenue_pence,
  date_trunc('month', b.start_time) as month,
  b.customer_id,
  c.name as customer_name,
  c.phone as customer_phone
from bookings b
left join customers c on c.id = b.customer_id
where b.status = 'no_show'
group by b.shop_id, date_trunc('month', b.start_time), b.customer_id, c.name, c.phone;

-- No-show repeat offenders view
create view no_show_repeat_offenders as
select
  cs.shop_id,
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  count(*) as no_show_count,
  sum(b.price_pence) as total_lost_pence,
  max(b.start_time) as last_no_show
from bookings b
join customers c on c.id = b.customer_id
join customer_shops cs on cs.customer_id = c.id and cs.shop_id = b.shop_id
where b.status = 'no_show'
group by cs.shop_id, c.id, c.name, c.phone
having count(*) >= 2
order by count(*) desc;

-- ============================================================
-- CHAIRS (for chair rental marketplace)
-- ============================================================
create table chairs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,                 -- e.g. "Chair 3"
  is_available_for_rent boolean default false,
  rent_price_pence_daily int,
  rent_price_pence_weekly int,
  rent_price_pence_monthly int,
  available_days jsonb,               -- e.g. ["monday", "tuesday"]
  description text,
  is_active boolean default true
);

create index idx_chairs_shop on chairs(shop_id);
create index idx_chairs_rental on chairs(is_available_for_rent) where is_available_for_rent = true;

-- ============================================================
-- CHAIR RENTALS (agreed bookings)
-- ============================================================
create table chair_rentals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  chair_id uuid references chairs(id) on delete cascade,  -- null if matched from a wanted ad
  renter_id uuid references auth.users(id) not null,      -- freelance barber
  shop_id uuid references shops(id) on delete cascade not null,
  start_date date not null,
  end_date date,
  rental_type text check (rental_type in ('daily', 'weekly', 'monthly')),
  price_pence int not null,
  status text default 'active' check (status in ('pending', 'active', 'completed', 'cancelled'))
);

create index idx_chair_rentals_chair on chair_rentals(chair_id);
create index idx_chair_rentals_renter on chair_rentals(renter_id);

-- ============================================================
-- CHAIR WANTED ADS (barbers looking for a chair)
-- ============================================================
create table chair_wanted (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,                       -- barber's name
  phone text,
  email text,
  location_text text,                       -- e.g. "East London", "Camden area"
  location geography(point, 4326),          -- lat/lng for proximity matching
  search_radius_miles float default 5.0,
  days_wanted jsonb,                        -- e.g. ["monday", "wednesday", "friday"]
  rental_type_preferred text check (rental_type_preferred in ('daily', 'weekly', 'monthly', 'any')),
  max_budget_pence_daily int,               -- what they're willing to pay per day
  max_budget_pence_weekly int,
  max_budget_pence_monthly int,
  bio text,                                 -- short intro about themselves
  experience_years int,
  specialities text,                        -- e.g. "fades, skin fades, beard trims"
  has_own_tools boolean default true,
  has_own_clients boolean default false,    -- bringing existing clientele
  avatar_url text,
  status text default 'active' check (status in ('active', 'matched', 'paused', 'closed')),
  is_visible boolean default true
);

create index idx_chair_wanted_location on chair_wanted using gist(location);
create index idx_chair_wanted_status on chair_wanted(status) where status = 'active';
create index idx_chair_wanted_user on chair_wanted(user_id);

-- ============================================================
-- CHAIR MATCHES (when a wanted ad and an available chair connect)
-- ============================================================
create table chair_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  chair_id uuid references chairs(id) on delete cascade not null,
  wanted_id uuid references chair_wanted(id) on delete cascade not null,
  initiated_by text not null check (initiated_by in ('owner', 'barber')),
  message text,                             -- intro message
  status text default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  responded_at timestamptz,
  unique(chair_id, wanted_id)
);

create index idx_chair_matches_chair on chair_matches(chair_id);
create index idx_chair_matches_wanted on chair_matches(wanted_id);

-- ============================================================
-- GIFT VOUCHERS
-- ============================================================
create table gift_vouchers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  shop_id uuid references shops(id) on delete cascade not null,
  code text unique not null,
  value_pence int not null,
  remaining_pence int not null,
  purchased_by_name text,
  purchased_by_email text,
  recipient_name text,
  recipient_email text,
  message text,
  is_redeemed boolean default false,
  redeemed_by uuid references customers(id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz,
  stripe_payment_id text
);

create index idx_vouchers_shop on gift_vouchers(shop_id);
create index idx_vouchers_code on gift_vouchers(code);

-- ============================================================
-- WAITLIST (for when fully booked - supports aggregation)
-- ============================================================
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  shop_id uuid references shops(id) on delete cascade,  -- null = any shop nearby
  customer_id uuid references customers(id) on delete cascade,
  desired_date date not null,
  desired_time_start time,
  desired_time_end time,
  service_id uuid references services(id) on delete set null,
  preferred_staff_id uuid references staff(id) on delete set null,
  search_radius_miles float default 1.0,  -- for aggregation/discovery
  status text default 'waiting' check (status in ('waiting', 'offered', 'booked', 'expired')),
  notified_at timestamptz
);

create index idx_waitlist_shop on waitlist(shop_id);
create index idx_waitlist_date on waitlist(desired_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table shops enable row level security;
alter table staff enable row level security;
alter table services enable row level security;
alter table bookings enable row level security;
alter table customers enable row level security;
alter table customer_shops enable row level security;
alter table chairs enable row level security;
alter table chair_rentals enable row level security;
alter table gift_vouchers enable row level security;
alter table time_off enable row level security;
alter table staff_availability enable row level security;
alter table staff_substitutions enable row level security;
alter table waitlist enable row level security;
alter table chair_wanted enable row level security;
alter table chair_matches enable row level security;

-- Shop owners can manage their own shop
create policy "Shop owners can manage their shop"
  on shops for all
  using (auth.uid() = owner_id);

-- Staff belonging to a shop can view their shop
create policy "Staff can view their shop"
  on shops for select
  using (id in (select shop_id from staff where user_id = auth.uid()));

-- Shop owners/staff can manage their shop's data
create policy "Shop members can manage staff"
  on staff for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage services"
  on services for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage bookings"
  on bookings for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage customers"
  on customers for all
  using (id in (
    select customer_id from customer_shops
    where shop_id in (select id from shops where owner_id = auth.uid())
  ));

create policy "Shop members can manage customer_shops"
  on customer_shops for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage chairs"
  on chairs for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage chair_rentals"
  on chair_rentals for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage vouchers"
  on gift_vouchers for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage time_off"
  on time_off for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

create policy "Shop members can manage availability"
  on staff_availability for all
  using (staff_id in (
    select id from staff
    where shop_id in (select id from shops where owner_id = auth.uid())
  ));

create policy "Shop members can manage substitutions"
  on staff_substitutions for all
  using (primary_staff_id in (
    select id from staff
    where shop_id in (select id from shops where owner_id = auth.uid())
  ));

-- Public can view available chairs for rental
create policy "Public can view available chairs"
  on chairs for select
  using (is_available_for_rent = true and is_active = true);

-- Public can view active shops (for discovery)
create policy "Public can view active shops"
  on shops for select
  using (is_active = true);

-- Public can view services (for booking pages)
create policy "Public can view services"
  on services for select
  using (is_active = true);

-- Public can view staff (for booking pages)
create policy "Public can view active staff"
  on staff for select
  using (is_active = true);

create policy "Shop members can manage waitlist"
  on waitlist for all
  using (shop_id in (select id from shops where owner_id = auth.uid()));

-- Chair wanted ads: barbers manage their own, everyone can browse active ads
create policy "Barbers can manage their own wanted ads"
  on chair_wanted for all
  using (auth.uid() = user_id);

create policy "Public can view active wanted ads"
  on chair_wanted for select
  using (status = 'active' and is_visible = true);

-- Chair matches: both parties can see their matches
create policy "Chair owners can view matches for their chairs"
  on chair_matches for all
  using (chair_id in (
    select id from chairs
    where shop_id in (select id from shops where owner_id = auth.uid())
  ));

create policy "Barbers can view their own matches"
  on chair_matches for all
  using (wanted_id in (select id from chair_wanted where user_id = auth.uid()));
