-- SmartGuard Alpha: apply ONLY to a dedicated SmartGuard Supabase project.
-- Never run in the personal RONNYLOPEZ or Subachoque databases.
-- Clerk users need Supabase Third-Party Auth configured for their JWTs.
-- Anonymous Android sessions use Supabase Auth signInAnonymously().

create extension if not exists pgcrypto;

create table if not exists public.sg_admin_accounts (
  subject text primary key,
  enabled boolean not null default true,
  granted_at timestamptz not null default now(),
  constraint sg_admin_subject_length check (length(subject) between 5 and 200)
);
comment on table public.sg_admin_accounts is 'Server-provisioned administrators by verified JWT subject. No client can grant itself admin access.';
alter table public.sg_admin_accounts enable row level security;
revoke all on public.sg_admin_accounts from anon, authenticated;
grant select on public.sg_admin_accounts to authenticated;
drop policy if exists sg_admin_self_read on public.sg_admin_accounts;
create policy sg_admin_self_read on public.sg_admin_accounts
  for select to authenticated
  using (subject = (select auth.jwt()->>'sub') and enabled = true);

create table if not exists public.sg_devices (
  id uuid primary key default gen_random_uuid(),
  owner_subject text not null default (auth.jwt()->>'sub'),
  nickname text not null default 'Dispositivo Android',
  platform text not null default 'android',
  app_version text not null default 'desconocida',
  processed_count bigint not null default 0 check (processed_count >= 0),
  protection_enabled boolean not null default false,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint sg_device_platform_check check (platform = 'android'),
  constraint sg_device_name_length check (length(nickname) between 1 and 80),
  constraint sg_device_version_length check (length(app_version) between 1 and 40),
  constraint sg_device_subject_length check (length(owner_subject) between 5 and 200)
);
create index if not exists sg_devices_owner_idx on public.sg_devices(owner_subject);
create index if not exists sg_devices_last_seen_idx on public.sg_devices(last_seen_at desc);
comment on column public.sg_devices.last_seen_at is 'Last successfully received app heartbeat. Not proof that notification monitoring is always on.';
alter table public.sg_devices enable row level security;
revoke all on public.sg_devices from anon, authenticated;
grant select, insert, update on public.sg_devices to authenticated;
drop policy if exists sg_devices_owner_or_admin_read on public.sg_devices;
create policy sg_devices_owner_or_admin_read on public.sg_devices
  for select to authenticated
  using (
    owner_subject = (select auth.jwt()->>'sub') or
    exists (select 1 from public.sg_admin_accounts a where a.subject=(select auth.jwt()->>'sub') and a.enabled)
  );
drop policy if exists sg_devices_owner_insert on public.sg_devices;
create policy sg_devices_owner_insert on public.sg_devices
  for insert to authenticated
  with check (owner_subject = (select auth.jwt()->>'sub') and consented_at is not null);
drop policy if exists sg_devices_owner_update on public.sg_devices;
create policy sg_devices_owner_update on public.sg_devices
  for update to authenticated
  using (owner_subject = (select auth.jwt()->>'sub'))
  with check (owner_subject = (select auth.jwt()->>'sub') and consented_at is not null);

create table if not exists public.sg_events (
  id uuid primary key,
  device_id uuid not null references public.sg_devices(id) on delete cascade,
  owner_subject text not null default (auth.jwt()->>'sub'),
  kind text not null default 'analysis',
  risk_level text,
  source_app text,
  created_at timestamptz not null default now(),
  constraint sg_event_kind_check check (kind in ('analysis','warning_viewed','user_feedback','help_requested')),
  constraint sg_event_risk_check check (risk_level is null or risk_level in ('green','orange','red')),
  constraint sg_event_source_check check (source_app is null or source_app in ('sms','whatsapp','telegram','signal','messenger','manual','other')),
  constraint sg_event_owner_length check (length(owner_subject) between 5 and 200)
);
create index if not exists sg_events_device_time_idx on public.sg_events(device_id,created_at desc);
comment on table public.sg_events is 'Only event metadata. Never store message text, full URLs, tokens, or personal data in this table.';
alter table public.sg_events enable row level security;
revoke all on public.sg_events from anon, authenticated;
grant select, insert on public.sg_events to authenticated;
drop policy if exists sg_events_owner_or_admin_read on public.sg_events;
create policy sg_events_owner_or_admin_read on public.sg_events
  for select to authenticated
  using (
    owner_subject = (select auth.jwt()->>'sub') or
    exists (select 1 from public.sg_admin_accounts a where a.subject=(select auth.jwt()->>'sub') and a.enabled)
  );
drop policy if exists sg_events_owner_insert on public.sg_events;
create policy sg_events_owner_insert on public.sg_events
  for insert to authenticated
  with check (
    owner_subject = (select auth.jwt()->>'sub')
    and exists (
      select 1 from public.sg_devices d
      where d.id=device_id and d.owner_subject=(select auth.jwt()->>'sub') and d.consented_at is not null
    )
  );

-- Prevent clients from forging the creation time or moving a device to another subject.
create or replace function public.sg_stamp_device() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.owner_subject := old.owner_subject;
    new.created_at := old.created_at;
  end if;
  new.last_seen_at := now();
  return new;
end;
$$;
revoke all on function public.sg_stamp_device() from public, anon, authenticated;
drop trigger if exists sg_device_stamp on public.sg_devices;
create trigger sg_device_stamp before insert or update on public.sg_devices
for each row execute function public.sg_stamp_device();

-- RLS of both source tables is respected by Postgres 15+ security_invoker views.
create or replace view public.sg_device_rollups with (security_invoker = true) as
select
  d.id, d.nickname, d.app_version, d.platform, d.last_seen_at, d.consented_at, d.protection_enabled,
  greatest(d.processed_count,count(e.id) filter (where e.kind = 'analysis'))::bigint as total,
  count(e.id) filter (where e.kind = 'analysis' and e.risk_level = 'green')::bigint as green,
  count(e.id) filter (where e.kind = 'analysis' and e.risk_level = 'orange')::bigint as orange,
  count(e.id) filter (where e.kind = 'analysis' and e.risk_level = 'red')::bigint as red
from public.sg_devices d
left join public.sg_events e on e.device_id=d.id
group by d.id, d.nickname, d.app_version, d.platform, d.last_seen_at, d.consented_at, d.protection_enabled, d.processed_count;
revoke all on public.sg_device_rollups from anon, authenticated;
grant select on public.sg_device_rollups to authenticated;

-- No admin grant is included here. An owner must provision the verified JWT subject
-- through the Supabase SQL editor after confirming the intended account identity:
-- insert into public.sg_admin_accounts(subject) values ('actual-verified-clerk-user-id');
