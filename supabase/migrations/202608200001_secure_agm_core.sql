create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  email text,
  first_name text not null,
  last_name text not null,
  campus text not null,
  joined_at date not null,
  membership_status text,
  rights_suspended boolean not null default false,
  active boolean not null default true,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  imported_at timestamptz not null default now()
);

create unique index if not exists members_email_lower_uq
  on public.members (lower(email)) where email is not null;
create index if not exists members_campus_idx on public.members (campus);
create index if not exists members_auth_user_idx on public.members (auth_user_id);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'admin'
    check (role in ('admin', 'returning_officer'))
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_at timestamptz not null,
  voting_campus text not null default 'CLAYTON',
  eligibility_days integer not null default 14
    check (eligibility_days in (7, 14, 21, 28)),
  quorum_min integer not null default 10,
  quorum_fraction numeric(5, 4) not null default 0.10,
  quorum_cap integer not null default 50,
  is_adjourned boolean not null default false,
  paused boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists one_active_meeting
  on public.meetings (active) where active = true;

create table if not exists public.check_ins (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null default 'self'
    check (method in ('self', 'admin', 'proxy', 'technology')),
  checked_in_by uuid references auth.users(id),
  proxy_holder_member_id uuid references public.members(id),
  primary key (meeting_id, member_id)
);

create index if not exists check_ins_member_idx on public.check_ins (member_id);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'open', 'closed', 'finalised')),
  allow_abstain boolean not null default true,
  winner_rule text not null default 'plurality'
    check (winner_rule in ('plurality', 'absolute_majority')),
  abstain_policy text not null default 'exclude_from_denominator'
    check (abstain_policy in ('exclude_from_denominator', 'include_in_denominator')),
  opened_at timestamptz,
  closed_at timestamptz,
  winner_nominee_id uuid,
  created_at timestamptz not null default now(),
  unique (meeting_id, name)
);

create unique index if not exists one_open_position_per_meeting
  on public.positions (meeting_id) where status = 'open';
create index if not exists positions_meeting_sort_idx
  on public.positions (meeting_id, sort_order);

create table if not exists public.nominees (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions(id) on delete cascade,
  member_id uuid references public.members(id),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (position_id, id)
);

alter table public.positions drop constraint if exists positions_winner_nominee_id_fkey;
alter table public.positions
  add constraint positions_winner_nominee_id_fkey
  foreign key (id, winner_nominee_id)
  references public.nominees(position_id, id)
  deferrable initially deferred;

create table if not exists public.participation (
  position_id uuid not null references public.positions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (position_id, member_id)
);

create index if not exists participation_member_idx
  on public.participation (member_id);

create table if not exists public.ballots (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions(id) on delete cascade,
  nominee_id uuid,
  is_abstain boolean not null default false,
  constraint ballot_has_exactly_one_choice check (
    (nominee_id is not null and is_abstain = false)
    or (nominee_id is null and is_abstain = true)
  ),
  constraint ballot_nominee_belongs_to_position
    foreign key (position_id, nominee_id)
    references public.nominees(position_id, id)
);

create index if not exists ballots_position_idx on public.ballots (position_id);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

create or replace function private.current_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.members
  where auth_user_id = auth.uid() and active = true
  limit 1;
$$;

create or replace function private.member_is_eligible(
  p_member_id uuid,
  p_meeting_id uuid
)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.members m
    join public.meetings g on g.id = p_meeting_id
    where m.id = p_member_id
      and m.active = true
      and m.rights_suspended = false
      and upper(m.campus) = upper(g.voting_campus)
      and m.joined_at <
        ((g.starts_at at time zone 'Australia/Melbourne')::date - g.eligibility_days)
  );
$$;

create or replace function public.claim_membership(p_student_id text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_member_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  v_email := lower(auth.jwt() ->> 'email');

  select id into v_member_id
  from public.members
  where student_id = trim(p_student_id)
    and lower(email) = v_email
    and active = true
    and (auth_user_id is null or auth_user_id = auth.uid())
  limit 1;

  if v_member_id is null then raise exception 'MEMBER_NOT_FOUND'; end if;

  update public.members set auth_user_id = auth.uid()
  where id = v_member_id and auth_user_id is null;
  return v_member_id;
end;
$$;

create or replace function public.check_in(p_meeting_id uuid)
returns table (eligible boolean, checked_in_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_member_id uuid;
begin
  v_member_id := private.current_member_id();
  if v_member_id is null then raise exception 'MEMBERSHIP_NOT_CLAIMED'; end if;
  if not exists (
    select 1 from public.meetings where id = p_meeting_id and active = true
  ) then raise exception 'MEETING_NOT_ACTIVE'; end if;

  insert into public.check_ins (meeting_id, member_id, method)
  values (p_meeting_id, v_member_id, 'self')
  on conflict (meeting_id, member_id) do nothing;

  return query
    select private.member_is_eligible(v_member_id, p_meeting_id), c.checked_in_at
    from public.check_ins c
    where c.meeting_id = p_meeting_id and c.member_id = v_member_id;
end;
$$;

create or replace function public.cast_vote(
  p_position_id uuid,
  p_nominee_id uuid default null,
  p_abstain boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_position public.positions%rowtype;
  v_member_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_position from public.positions
  where id = p_position_id for update;
  if not found then raise exception 'POSITION_NOT_FOUND'; end if;
  if v_position.status <> 'open' then raise exception 'POLL_NOT_OPEN'; end if;
  if exists (
    select 1 from public.meetings
    where id = v_position.meeting_id and paused = true
  ) then raise exception 'VOTING_PAUSED'; end if;

  v_member_id := private.current_member_id();
  if v_member_id is null then raise exception 'MEMBERSHIP_NOT_CLAIMED'; end if;
  if not exists (
    select 1 from public.check_ins
    where meeting_id = v_position.meeting_id and member_id = v_member_id
  ) then raise exception 'NOT_CHECKED_IN'; end if;
  if not private.member_is_eligible(v_member_id, v_position.meeting_id)
    then raise exception 'NOT_ELIGIBLE'; end if;

  if p_abstain then
    if not v_position.allow_abstain or p_nominee_id is not null
      then raise exception 'INVALID_ABSTENTION'; end if;
  elsif p_nominee_id is null or not exists (
    select 1 from public.nominees
    where id = p_nominee_id and position_id = p_position_id and active = true
  ) then raise exception 'INVALID_NOMINEE';
  end if;

  insert into public.participation (position_id, member_id)
  values (p_position_id, v_member_id);
  insert into public.ballots (position_id, nominee_id, is_abstain)
  values (p_position_id, p_nominee_id, p_abstain);
end;
$$;

create or replace function public.set_poll_status(
  p_position_id uuid,
  p_status text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_meeting_id uuid;
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_status not in ('ready', 'open', 'closed', 'finalised')
    then raise exception 'INVALID_STATUS'; end if;

  select meeting_id into v_meeting_id from public.positions
  where id = p_position_id for update;
  if v_meeting_id is null then raise exception 'POSITION_NOT_FOUND'; end if;
  if p_status = 'open' and not exists (
    select 1 from public.nominees
    where position_id = p_position_id and active = true
  ) then raise exception 'NO_NOMINEES'; end if;

  update public.positions set
    status = p_status,
    opened_at = case when p_status = 'open' then now() else opened_at end,
    closed_at = case when p_status in ('closed', 'finalised') then now() else null end
  where id = p_position_id;

  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'set_poll_status', 'position', p_position_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.set_voting_paused(
  p_meeting_id uuid,
  p_paused boolean
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  update public.meetings set paused = p_paused where id = p_meeting_id;
  if not found then raise exception 'MEETING_NOT_FOUND'; end if;
  insert into public.audit_log (actor_user_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'set_voting_paused', 'meeting', p_meeting_id,
    jsonb_build_object('paused', p_paused));
end;
$$;

create or replace function public.position_results(p_position_id uuid)
returns table (choice_id uuid, choice_name text, is_abstain boolean, votes bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if not exists (
    select 1 from public.positions
    where id = p_position_id and status in ('closed', 'finalised')
  ) then raise exception 'RESULTS_NOT_AVAILABLE'; end if;

  return query
    select n.id, n.display_name, false, count(b.id)
    from public.nominees n
    left join public.ballots b on b.nominee_id = n.id
    where n.position_id = p_position_id and n.active = true
    group by n.id, n.display_name
    union all
    select null::uuid, 'Abstain'::text, true, count(b.id)
    from public.ballots b
    where b.position_id = p_position_id and b.is_abstain = true;
end;
$$;

alter table public.members enable row level security;
alter table public.admins enable row level security;
alter table public.meetings enable row level security;
alter table public.check_ins enable row level security;
alter table public.positions enable row level security;
alter table public.nominees enable row level security;
alter table public.participation enable row level security;
alter table public.ballots enable row level security;
alter table public.audit_log enable row level security;

create policy members_select_self_or_admin on public.members for select
  to authenticated using (auth_user_id = auth.uid() or private.is_admin());
create policy admins_select_self on public.admins for select
  to authenticated using (user_id = auth.uid());
create policy meetings_select_authenticated on public.meetings for select
  to authenticated using (true);
create policy check_ins_select_self_or_admin on public.check_ins for select
  to authenticated using (member_id = private.current_member_id() or private.is_admin());
create policy positions_select_authenticated on public.positions for select
  to authenticated using (true);
create policy nominees_select_authenticated on public.nominees for select
  to authenticated using (true);
create policy participation_select_self_or_admin on public.participation for select
  to authenticated using (member_id = private.current_member_id() or private.is_admin());
create policy ballots_select_admin_when_closed on public.ballots for select
  to authenticated using (
    private.is_admin() and exists (
      select 1 from public.positions p
      where p.id = position_id and p.status in ('closed', 'finalised')
    )
  );
create policy audit_log_select_admin on public.audit_log for select
  to authenticated using (private.is_admin());

revoke all on function public.claim_membership(text) from public;
revoke all on function public.check_in(uuid) from public;
revoke all on function public.cast_vote(uuid, uuid, boolean) from public;
revoke all on function public.set_poll_status(uuid, text) from public;
revoke all on function public.set_voting_paused(uuid, boolean) from public;
revoke all on function public.position_results(uuid) from public;
grant execute on function public.claim_membership(text) to authenticated;
grant execute on function public.check_in(uuid) to authenticated;
grant execute on function public.cast_vote(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_poll_status(uuid, text) to authenticated;
grant execute on function public.set_voting_paused(uuid, boolean) to authenticated;
grant execute on function public.position_results(uuid) to authenticated;

insert into public.meetings (
  name, starts_at, voting_campus, eligibility_days,
  quorum_min, quorum_fraction, quorum_cap, active
)
values (
  'FAM AGM 2026', '2026-08-20 18:00:00+10', 'CLAYTON', 14,
  10, 0.10, 50, true
)
on conflict (name) do nothing;

insert into public.positions (meeting_id, name, sort_order, status)
select id, item.name, item.sort_order, 'draft'
from public.meetings
cross join (values
  ('President', 10),
  ('Vice President', 20),
  ('Secretary', 30),
  ('Treasurer', 40)
) as item(name, sort_order)
where meetings.name = 'FAM AGM 2026'
on conflict (meeting_id, name) do nothing;
