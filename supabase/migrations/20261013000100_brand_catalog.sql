-- Catálogo interno: ninguna tabla admite escrituras de clientes públicos.
create table if not exists public.brands (
  id text primary key,
  name text not null,
  keywords text[] not null default '{}',
  sort_order integer not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.official_domains (
  domain text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  review_status text not null default 'legacy-pending'
    check (review_status in ('legacy-pending', 'verified')),
  evidence text not null default '',
  sort_order integer not null,
  updated_at timestamptz not null default now(),
  constraint official_domain_lowercase check (domain = lower(domain))
);
create index if not exists official_domains_brand_idx on public.official_domains(brand_id);

-- Popularidad es informativa, separada de las marcas oficiales.
create table if not exists public.popular_domains (
  domain text primary key,
  rank integer check (rank is null or rank > 0),
  source text not null default 'tranco',
  updated_at timestamptz not null default now(),
  constraint popular_domain_lowercase check (domain = lower(domain))
);

alter table public.brands enable row level security;
alter table public.official_domains enable row level security;
alter table public.popular_domains enable row level security;

revoke all on public.brands from anon, authenticated;
revoke all on public.official_domains from anon, authenticated;
revoke all on public.popular_domains from anon, authenticated;
-- Solo lectura de popularidad desde check-link con la clave pública del equipo.
grant select on public.popular_domains to anon, authenticated;
create policy "Public can read popularity" on public.popular_domains
  for select to anon, authenticated using (true);
-- service_role conserva acceso administrativo y no hay políticas INSERT/UPDATE públicas.
