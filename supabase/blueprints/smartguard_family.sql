-- SmartGuard Family 0.1: Clerk-authenticated circles, explicit consent and private alerts.
-- PRECONDITION: enable Clerk as a trusted third-party provider for the SmartGuard
-- Supabase project, then run through a real Supabase migration. DO NOT apply to
-- the Enter-managed / unrelated personal or Subachoque databases.
-- The existing public link analyser remains available without authentication.

create schema if not exists smartguard_private;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.smartguard_families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 64),
  created_by text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.smartguard_family_members (
  family_id uuid not null references public.smartguard_families(id) on delete cascade,
  user_id text not null,
  nickname text not null check (char_length(nickname) between 2 and 60),
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (family_id,user_id)
);
create index if not exists sg_family_members_user_idx on public.smartguard_family_members (user_id);
create table if not exists public.smartguard_family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.smartguard_families(id) on delete cascade,
  created_by text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  accepted_at timestamptz,
  accepted_by text
);
create index if not exists sg_family_invites_family_idx on public.smartguard_family_invites (family_id,created_at desc);
create table if not exists public.smartguard_family_trust (
  family_id uuid not null,
  protected_user_id text not null,
  trusted_user_id text not null,
  enabled_at timestamptz not null default now(),
  primary key (family_id,protected_user_id,trusted_user_id),
  foreign key (family_id,protected_user_id) references public.smartguard_family_members (family_id,user_id) on delete cascade,
  foreign key (family_id,trusted_user_id) references public.smartguard_family_members (family_id,user_id) on delete cascade,
  check (protected_user_id <> trusted_user_id)
);
create table if not exists public.smartguard_family_alerts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.smartguard_families(id) on delete cascade,
  actor_id text not null,
  recipient_id text not null,
  event_type text not null check (event_type in ('help_requested','continued_after_warning')),
  -- This is a client-reported event, NOT externally verified proof of opening.
  origin text not null default 'client_reported' check (origin = 'client_reported'),
  domain text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  foreign key (family_id,actor_id) references public.smartguard_family_members (family_id,user_id) on delete cascade,
  foreign key (family_id,recipient_id) references public.smartguard_family_members (family_id,user_id) on delete cascade
);
create index if not exists sg_family_alerts_inbox_idx on public.smartguard_family_alerts (recipient_id,created_at desc);
create index if not exists sg_family_alerts_actor_idx on public.smartguard_family_alerts (actor_id,created_at desc);

-- All direct table access is denied: family operations use a carefully checked RPC.
-- RLS is defense in depth even when default grants are modified later.
alter table public.smartguard_families enable row level security;
alter table public.smartguard_family_members enable row level security;
alter table public.smartguard_family_invites enable row level security;
alter table public.smartguard_family_trust enable row level security;
alter table public.smartguard_family_alerts enable row level security;
revoke all on public.smartguard_families, public.smartguard_family_members,
  public.smartguard_family_invites, public.smartguard_family_trust,
  public.smartguard_family_alerts from anon, authenticated;

-- This executor is in a NON-EXPOSED schema. All objects and user IDs are
-- validated from the verified Clerk session JWT, never from untrusted payload.
create or replace function smartguard_private.family_operation(p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor text := auth.jwt()->>'sub';
  v_role text := auth.jwt()->>'role';
  v_family uuid;
  v_token text;
  v_hash text;
  v_name text;
  v_target text;
  v_nickname text;
  v_invite public.smartguard_family_invites%rowtype;
  v_count integer;
  v_count2 integer;
  v_alert_ids jsonb;
begin
  if v_role is distinct from 'authenticated' or v_actor is null
     or char_length(v_actor) > 128 or char_length(v_actor) < 4 then
    raise exception 'Inicia sesión para utilizar SmartGuard Family.' using errcode = '28000';
  end if;
  if p_payload is null then p_payload := '{}'::jsonb; end if;

  if p_action = 'snapshot' then
    return jsonb_build_object('families', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'role', me.role, 'created_at', f.created_at,
        'members', coalesce((select jsonb_agg(jsonb_build_object(
          'user_id', m.user_id, 'nickname', m.nickname, 'role', m.role,
          'is_me', m.user_id = v_actor,
          'trusted_by_me', exists (select 1 from public.smartguard_family_trust t
             where t.family_id=f.id and t.protected_user_id=v_actor and t.trusted_user_id=m.user_id)
        ) order by m.joined_at) from public.smartguard_family_members m where m.family_id = f.id), '[]'::jsonb),
        'alerts', coalesce((select jsonb_agg(jsonb_build_object(
          'id', a.id, 'actor_id', a.actor_id, 'recipient_id', a.recipient_id,
          'event_type', a.event_type, 'origin', a.origin, 'domain', a.domain,
          'created_at', a.created_at, 'acknowledged_at', a.acknowledged_at
        ) order by a.created_at desc)
          from (select * from public.smartguard_family_alerts x
                where x.family_id=f.id and (x.actor_id=v_actor or x.recipient_id=v_actor)
                order by x.created_at desc limit 60) a), '[]'::jsonb),
        'invites_sent', (select count(*) from public.smartguard_family_invites i
          where i.family_id=f.id and i.created_by=v_actor),
        'invites_accepted', (select count(*) from public.smartguard_family_invites i
          where i.family_id=f.id and i.created_by=v_actor and i.accepted_at is not null)
      ) order by f.created_at)
      from public.smartguard_families f
      join public.smartguard_family_members me on me.family_id=f.id and me.user_id=v_actor
    ), '[]'::jsonb));
  end if;

  if p_action = 'create' then
    v_name := trim(coalesce(p_payload->>'name',''));
    v_nickname := trim(coalesce(p_payload->>'nickname',''));
    if char_length(v_name) not between 3 and 64 or char_length(v_nickname) not between 2 and 60 then
      raise exception 'Nombre de familia o apodo inválido.' using errcode = '22023';
    end if;
    if (select count(*) from public.smartguard_family_members where user_id=v_actor) >= 3 then
      raise exception 'Ya perteneces al máximo de tres círculos familiares.' using errcode = '22023';
    end if;
    insert into public.smartguard_families(name,created_by) values(v_name,v_actor) returning id into v_family;
    insert into public.smartguard_family_members(family_id,user_id,nickname,role)
      values(v_family,v_actor,v_nickname,'owner');
    return jsonb_build_object('family_id',v_family);
  end if;

  if p_action = 'join' then
    v_token := lower(trim(coalesce(p_payload->>'token','')));
    v_nickname := trim(coalesce(p_payload->>'nickname',''));
    if v_token !~ '^[0-9a-f]{64}$' or char_length(v_nickname) not between 2 and 60 then
      raise exception 'Invitación o apodo inválido.' using errcode = '22023';
    end if;
    v_hash := encode(extensions.digest(v_token,'sha256'),'hex');
    select * into v_invite from public.smartguard_family_invites
      where token_hash=v_hash for update;
    if not found or v_invite.accepted_at is not null or v_invite.expires_at <= now() then
      raise exception 'La invitación expiró o ya fue utilizada.' using errcode = '22023';
    end if;
    if (select count(*) from public.smartguard_family_members where user_id=v_actor) >= 3 then
      raise exception 'Ya perteneces al máximo de tres círculos familiares.' using errcode = '22023';
    end if;
    if exists (select 1 from public.smartguard_family_members
      where family_id=v_invite.family_id and user_id=v_actor) then
      raise exception 'Ya perteneces a esta familia.' using errcode = '22023';
    end if;
    if (select count(*) from public.smartguard_family_members where family_id=v_invite.family_id) >= 10 then
      raise exception 'Este círculo alcanzó su capacidad de prueba.' using errcode = '22023';
    end if;
    insert into public.smartguard_family_members(family_id,user_id,nickname)
      values(v_invite.family_id,v_actor,v_nickname);
    update public.smartguard_family_invites set accepted_at=now(),accepted_by=v_actor where id=v_invite.id;
    return jsonb_build_object('family_id',v_invite.family_id);
  end if;

  -- All actions beyond create/join must explicitly check active membership.
  begin
    v_family := (p_payload->>'family_id')::uuid;
  exception when others then
    raise exception 'Familia inválida.' using errcode = '22023';
  end;
  if v_family is null or not exists (select 1 from public.smartguard_family_members
        where family_id=v_family and user_id=v_actor) then
    raise exception 'No tienes acceso a esta familia.' using errcode = '42501';
  end if;

  if p_action = 'invite' then
    -- Invitations are an invitation loop, but not unlimited spam.
    if (select count(*) from public.smartguard_family_invites
        where family_id=v_family and created_by=v_actor
        and created_at > now()-interval '24 hours') >= 10 then
      raise exception 'Has alcanzado el límite diario de invitaciones.' using errcode = '22023';
    end if;
    v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
    v_hash := encode(extensions.digest(v_token,'sha256'),'hex');
    insert into public.smartguard_family_invites(family_id,created_by,token_hash)
      values(v_family,v_actor,v_hash);
    return jsonb_build_object('token',v_token,'expires_hours',72);
  end if;

  if p_action = 'trust' then
    v_target := trim(coalesce(p_payload->>'trusted_user_id',''));
    if v_target = v_actor or not exists (select 1 from public.smartguard_family_members
        where family_id=v_family and user_id=v_target) then
      raise exception 'El contacto de confianza no pertenece a la familia.' using errcode = '22023';
    end if;
    if coalesce((p_payload->>'enabled')::boolean,false) then
      insert into public.smartguard_family_trust(family_id,protected_user_id,trusted_user_id)
        values(v_family,v_actor,v_target) on conflict do nothing;
    else
      delete from public.smartguard_family_trust
       where family_id=v_family and protected_user_id=v_actor and trusted_user_id=v_target;
    end if;
    return jsonb_build_object('saved',true);
  end if;

  if p_action = 'alert' then
    if coalesce(p_payload->>'event_type','') not in ('help_requested','continued_after_warning') then
      raise exception 'Evento de alerta inválido.' using errcode = '22023';
    end if;
    -- Only a registrable-looking hostname is shared; never raw URL, token, path
    -- message text, or a system claim of externally verified link opening.
    v_name := nullif(lower(trim(coalesce(p_payload->>'domain',''))),'');
    if v_name is not null and (char_length(v_name)>253 or
         v_name !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$') then
      raise exception 'Dominio inválido.' using errcode = '22023';
    end if;
    if (select count(distinct created_at) from public.smartguard_family_alerts
        where family_id=v_family and actor_id=v_actor
        and created_at > now()-interval '30 minutes') >= 5 then
      raise exception 'Espera antes de enviar otra alerta.' using errcode = '22023';
    end if;
    if exists(select 1 from public.smartguard_family_alerts
        where family_id=v_family and actor_id=v_actor and event_type=p_payload->>'event_type'
        and domain is not distinct from v_name and created_at > now()-interval '2 minutes') then
      return jsonb_build_object('sent',0,'duplicate',true);
    end if;
    insert into public.smartguard_family_alerts(family_id,actor_id,recipient_id,event_type,domain)
      select v_family,v_actor,t.trusted_user_id,p_payload->>'event_type',v_name
      from public.smartguard_family_trust t where t.family_id=v_family and t.protected_user_id=v_actor;
    get diagnostics v_count = row_count;
    return jsonb_build_object('sent',v_count,'event_kind','client_reported');
  end if;

  if p_action = 'ack' then
    begin
      v_target := p_payload->>'alert_id';
      update public.smartguard_family_alerts set acknowledged_at=now()
       where id=v_target::uuid and recipient_id=v_actor and family_id=v_family;
      get diagnostics v_count = row_count;
      return jsonb_build_object('acknowledged',v_count);
    exception when invalid_text_representation then
      raise exception 'Alerta inválida.' using errcode = '22023';
    end;
  end if;

  if p_action = 'leave' then
    select count(*) into v_count from public.smartguard_family_members where family_id=v_family;
    if exists(select 1 from public.smartguard_family_members
      where family_id=v_family and user_id=v_actor and role='owner') then
      if v_count > 1 then
        raise exception 'El responsable no puede abandonar una familia con otros integrantes.' using errcode = '22023';
      end if;
      delete from public.smartguard_families where id=v_family;
    else
      delete from public.smartguard_family_members where family_id=v_family and user_id=v_actor;
    end if;
    return jsonb_build_object('left',true);
  end if;

  raise exception 'Operación no reconocida.' using errcode = '22023';
end;
$$;

-- A security-invoker wrapper exposes exactly one RPC method in public.
-- The SECURITY DEFINER executor itself stays in an unexposed schema.
create or replace function public.smartguard_family(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select smartguard_private.family_operation(p_action,p_payload);
$$;
revoke all on function smartguard_private.family_operation(text,jsonb) from public,anon;
revoke all on function public.smartguard_family(text,jsonb) from public,anon;
grant usage on schema smartguard_private to authenticated;
grant execute on function smartguard_private.family_operation(text,jsonb) to authenticated;
grant execute on function public.smartguard_family(text,jsonb) to authenticated;

-- Post-install verification in SmartGuard's own project:
-- select relname, relrowsecurity from pg_class where relname like 'smartguard_family%';
-- select routine_name, security_type from information_schema.routines
-- where routine_name in ('smartguard_family','family_operation');
-- An anon RPC call MUST fail. Two Clerk accounts MUST NOT see each other's data.
