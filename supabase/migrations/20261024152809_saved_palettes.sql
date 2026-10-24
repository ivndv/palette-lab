-- Paletas guardadas por usuario
create table if not exists public.saved_palettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  client_id uuid not null unique,
  name text not null
    check (char_length(btrim(name)) between 1 and 80),
  source_base text not null
    check (source_base ~ '^#[0-9a-f]{6}$'),
  base text not null
    check (base ~ '^#[0-9a-f]{6}$'),
  mode text not null
    check (mode in ('analogous', 'complementary', 'triadic', 'monochrome', 'random')),
  tone text not null
    check (tone in ('balanced', 'pastel', 'vivid', 'muted', 'dark', 'light')),
  swatches jsonb not null
    check (
      case
        when jsonb_typeof(swatches) = 'array' then jsonb_array_length(swatches) = 5
        else false
      end
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_palettes_user_updated_idx
on public.saved_palettes (user_id, updated_at desc);

-- Mantiene updated_at al día
create or replace function public.set_saved_palettes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_palettes_updated_at on public.saved_palettes;

create trigger saved_palettes_updated_at
before update on public.saved_palettes
for each row
execute function public.set_saved_palettes_updated_at();

-- RLS: cada usuario solo ve y modifica lo suyo
alter table public.saved_palettes enable row level security;

drop policy if exists "own saved palettes" on public.saved_palettes;

create policy "own saved palettes"
on public.saved_palettes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- El rol anónimo no necesita acceso directo
revoke all on public.saved_palettes from anon;
grant select, insert, update, delete on public.saved_palettes to authenticated;
grant all on public.saved_palettes to service_role;
