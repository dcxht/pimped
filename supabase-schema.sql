-- DailyDx Friends System Schema
-- Run this in Supabase SQL Editor

-- 1. Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  friend_code text unique not null,
  created_at timestamptz default now()
);

-- 2. Friendships table
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  unique (user_id, friend_id)
);

-- 3. Daily scores table
create table public.daily_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date_str text not null,
  score int not null default 0,
  clues_used int not null default 0,
  wrong_guesses int not null default 0,
  won boolean not null default false,
  started_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, date_str)
);

-- 4. User stats table
create table public.user_stats (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  played int not null default 0,
  won int not null default 0,
  streak int not null default 0,
  max_streak int not null default 0,
  avg_score int not null default 0,
  total_score int not null default 0
);

-- 5. Indexes
create index idx_friendships_user on public.friendships(user_id);
create index idx_friendships_friend on public.friendships(friend_id);
create index idx_daily_scores_user_date on public.daily_scores(user_id, date_str);
create index idx_profiles_friend_code on public.profiles(friend_code);

-- 6. Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_code text;
begin
  -- Generate random 8-char friend code
  loop
    new_code := upper(substr(md5(random()::text), 1, 8));
    exit when not exists (select 1 from public.profiles where friend_code = new_code);
  end loop;

  insert into public.profiles (id, display_name, avatar_url, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new_code
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. RLS Policies
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.daily_scores enable row level security;
alter table public.user_stats enable row level security;

-- Profiles: readable by all authenticated users
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Friendships: users see their own
create policy "Users can view own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update friendships sent to them"
  on public.friendships for update
  to authenticated
  using (auth.uid() = friend_id);

create policy "Users can delete own friendships"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Daily scores: own + accepted friends
create policy "Users can view own scores"
  on public.daily_scores for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view friends scores"
  on public.daily_scores for select
  to authenticated
  using (
    exists (
      select 1 from public.friendships
      where status = 'accepted'
        and (
          (user_id = auth.uid() and friend_id = daily_scores.user_id)
          or (friend_id = auth.uid() and user_id = daily_scores.user_id)
        )
    )
  );

create policy "Users can insert own scores"
  on public.daily_scores for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own scores"
  on public.daily_scores for update
  to authenticated
  using (auth.uid() = user_id);

-- User stats: own + friends
create policy "Users can view own stats"
  on public.user_stats for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can view friends stats"
  on public.user_stats for select
  to authenticated
  using (
    exists (
      select 1 from public.friendships
      where status = 'accepted'
        and (
          (user_id = auth.uid() and friend_id = user_stats.user_id)
          or (friend_id = auth.uid() and user_id = user_stats.user_id)
        )
    )
  );

create policy "Users can insert own stats"
  on public.user_stats for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own stats"
  on public.user_stats for update
  to authenticated
  using (auth.uid() = user_id);

-- ─── 8. Duel System ─────────────────────────────────

-- Duels table
create table public.duels (
  id text primary key,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  case_indices int[] not null,
  created_at timestamptz default now()
);

-- Duel scores table
create table public.duel_scores (
  duel_id text references public.duels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  total_score int not null default 0,
  results jsonb not null default '[]',
  completed_at timestamptz default now(),
  primary key (duel_id, user_id)
);

-- Indexes
create index idx_duel_scores_duel on public.duel_scores(duel_id);
create index idx_duels_creator on public.duels(creator_id);

-- RLS
alter table public.duels enable row level security;
alter table public.duel_scores enable row level security;

-- Duels: anyone authenticated can view (needed to join via link)
create policy "Duels are viewable by authenticated users"
  on public.duels for select
  to authenticated
  using (true);

create policy "Users can create duels"
  on public.duels for insert
  to authenticated
  with check (auth.uid() = creator_id);

-- Duel scores: viewable by participants of that duel
create policy "Duel scores viewable by authenticated users"
  on public.duel_scores for select
  to authenticated
  using (true);

create policy "Users can insert own duel scores"
  on public.duel_scores for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Duel invites table
create table public.duel_invites (
  id uuid default gen_random_uuid() primary key,
  duel_id text references public.duels(id) on delete cascade not null,
  from_id uuid references public.profiles(id) on delete cascade not null,
  to_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'completed', 'dismissed')) default 'pending',
  created_at timestamptz default now(),
  unique (duel_id, to_id)
);

create index idx_duel_invites_to on public.duel_invites(to_id, status);

alter table public.duel_invites enable row level security;

create policy "Users can view own duel invites"
  on public.duel_invites for select
  to authenticated
  using (auth.uid() = to_id or auth.uid() = from_id);

create policy "Users can send duel invites"
  on public.duel_invites for insert
  to authenticated
  with check (auth.uid() = from_id);

create policy "Users can update invites sent to them"
  on public.duel_invites for update
  to authenticated
  using (auth.uid() = to_id);

-- ─── 9. Admin Stats Function ────────────────────────
-- Returns aggregate stats for the admin dashboard.
-- SECURITY DEFINER bypasses RLS; admin check is inside the function.
-- Set your admin UUID(s) below.

create or replace function public.get_admin_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  admin_uuids text[] := array['f76f6d6e-b902-41b1-a5cb-df7d5694582e'];
begin
  -- Verify caller is a hardcoded admin
  if not (auth.uid()::text = any(admin_uuids)) then
    raise exception 'Unauthorized';
  end if;

  select json_build_object(
    'total_users', (select count(*) from profiles),
    'total_games', (select count(*) from daily_scores),
    'total_wins', (select count(*) from daily_scores where won = true),
    'avg_score', (select coalesce(round(avg(score)::numeric, 1), 0) from daily_scores),
    'total_hours', (
      select coalesce(round(sum(extract(epoch from (created_at - started_at))) / 3600.0, 1), 0)
      from daily_scores
      where started_at is not null
        and created_at - started_at < interval '30 minutes'
        and created_at > started_at
    ),
    'dau', (
      select count(distinct user_id) from daily_scores
      where date_str = to_char(now() at time zone 'America/Chicago', 'YYYY-MM-DD')
    ),
    'wau', (
      select count(distinct user_id) from daily_scores
      where created_at >= now() - interval '7 days'
    ),
    'mau', (
      select count(distinct user_id) from daily_scores
      where created_at >= now() - interval '30 days'
    ),
    'signup_by_week', (
      select coalesce(json_agg(row_to_json(w)), '[]'::json)
      from (
        select date_trunc('week', created_at)::date as week,
               count(*) as signups
        from profiles
        group by 1 order by 1 desc limit 12
      ) w
    ),
    'daily_activity', (
      select coalesce(json_agg(row_to_json(d)), '[]'::json)
      from (
        select date_str as date,
               count(*) as games,
               count(distinct user_id) as players,
               round(avg(score)::numeric, 1) as avg_score
        from daily_scores
        group by date_str order by date_str desc limit 30
      ) d
    ),
    'category_breakdown', (
      select coalesce(json_agg(row_to_json(c)), '[]'::json)
      from (
        select key as category,
               count(*) as users,
               round(avg((value->>'correct')::int::float / nullif((value->>'played')::int, 0) * 100)::numeric, 1) as avg_accuracy
        from user_stats, jsonb_each(category_stats) as kv(key, value)
        where category_stats is not null
        group by key order by count(*) desc
      ) c
    ),
    'games_per_user', (
      select coalesce(round(avg(cnt)::numeric, 1), 0)
      from (select count(*) as cnt from daily_scores group by user_id) sub
    )
  ) into result;

  return result;
end;
$$;
