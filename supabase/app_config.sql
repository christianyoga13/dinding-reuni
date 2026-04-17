create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_app_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_app_config_updated_at on public.app_config;

create trigger trg_touch_app_config_updated_at
before update on public.app_config
for each row
execute function public.touch_app_config_updated_at();

insert into public.app_config (key, value)
values ('threads_per_screen', '75')
on conflict (key) do nothing;
