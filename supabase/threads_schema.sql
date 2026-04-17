-- ==========================================
-- Dinding Reuni - Efficient Supabase Schema
-- ==========================================

create extension if not exists pgcrypto;

create type public.thread_media_type as enum ('none', 'image', 'music');

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  title varchar(140) not null,
  message text not null,
  author_name varchar(120) not null,
  batch_year smallint not null,
  tag_label varchar(60) not null default 'Thread Baru',
  media_type public.thread_media_type not null default 'none',
  image_url text,
  music_track varchar(180),
  music_artist varchar(180),
  music_image_url text,
  music_preview_url text,
  music_external_url text,
  music_provider varchar(40),
  created_at timestamptz not null default now(),
  constraint threads_message_length_chk
    check (char_length(message) between 5 and 2000),
  constraint threads_batch_year_chk
    check (batch_year between 1950 and 2100),
  constraint threads_media_consistency_chk
    check (
      (media_type = 'none'
        and image_url is null
        and music_track is null
        and music_artist is null)
      or (media_type = 'image'
        and image_url is not null
        and music_track is null
        and music_artist is null)
      or (media_type = 'music'
        and image_url is null
        and music_track is not null
        and music_artist is not null)
    )
);

alter table public.threads
  add column if not exists music_image_url text;

create index if not exists threads_created_at_desc_idx
  on public.threads (created_at desc);

create index if not exists threads_batch_year_created_at_idx
  on public.threads (batch_year, created_at desc);

create index if not exists threads_media_type_idx
  on public.threads (media_type);

alter table public.threads enable row level security;

-- Public read access for board display.
drop policy if exists "threads_public_select" on public.threads;
create policy "threads_public_select"
  on public.threads
  for select
  to anon, authenticated
  using (true);

-- Inserts are expected from server-side route using service role key.

-- ------------------------------------------
-- Storage bucket for uploaded thread images
-- ------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thread-media',
  'thread-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for images in the bucket.
drop policy if exists "thread_media_public_read" on storage.objects;
create policy "thread_media_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'thread-media');
