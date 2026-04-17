-- Bulk seed: 150 thread dummy records for testing
-- Run this in Supabase SQL Editor

-- Optional cleanup for repeatable seeding
delete from public.threads
where title like 'Bulk Thread #%';

with numbered as (
  select
    gs as n,
    case
      when gs % 5 in (0, 1) then 'none'::public.thread_media_type
      when gs % 5 in (2, 3) then 'image'::public.thread_media_type
      else 'music'::public.thread_media_type
    end as media_type
  from generate_series(1, 150) as gs
),
prepared as (
  select
    n,
    media_type,
    (array[
      'Monokrom',
      'Evaluasi',
      'Sempurna',
      'Hati-Hati di Jalan',
      'Blue Jeans',
      'To The Bone',
      'Zona Nyaman',
      'Rayuan Perempuan Gila',
      'Secukupnya',
      'Untuk Perempuan'
    ])[((n - 1) % 10) + 1] as music_track,
    (array[
      'Tulus',
      'Hindia',
      'Andra and The Backbone',
      'Tulus',
      'Gangga',
      'Pamungkas',
      'Fourtwnty',
      'Nadin Amizah',
      'Hindia',
      'Payung Teduh'
    ])[((n - 1) % 10) + 1] as music_artist
  from numbered
)
insert into public.threads (
  title,
  message,
  author_name,
  batch_year,
  tag_label,
  media_type,
  image_url,
  music_track,
  music_artist,
  music_image_url,
  music_preview_url,
  music_external_url,
  music_provider,
  created_at
)
select
  format('Bulk Thread #%s', n),
  format(
    'Ini data testing bulk ke-%s untuk uji performa layout, scrolling, dan rendering card thread dalam jumlah besar.',
    n
  ),
  format('Tester %s', ((n - 1) % 40) + 1),
  2006 + (n % 19),
  (array['Throwback', 'Nostalgia', 'Info Reuni', 'Cerita Kelas', 'Mahasiswa Aktif'])[((n - 1) % 5) + 1],
  media_type,
  case
    when media_type = 'image' then format('https://picsum.photos/seed/reuni-image-%s/1200/900', n)
    else null
  end,
  case
    when media_type = 'music' then music_track
    else null
  end,
  case
    when media_type = 'music' then music_artist
    else null
  end,
  case
    when media_type = 'music' then format('https://picsum.photos/seed/reuni-music-cover-%s/800/800', n)
    else null
  end,
  case
    when media_type = 'music' then format('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-%s.mp3', ((n - 1) % 16) + 1)
    else null
  end,
  case
    when media_type = 'music' then format('https://music.apple.com/id/search?term=%s', replace(lower(music_track), ' ', '+'))
    else null
  end,
  case
    when media_type = 'music' and n % 2 = 0 then 'iTunes ID'
    when media_type = 'music' then 'Deezer'
    else null
  end,
  now() - make_interval(mins => (151 - n))
from prepared
order by n;

-- Verification
select
  count(*) as total_rows,
  count(*) filter (where media_type = 'none') as none_rows,
  count(*) filter (where media_type = 'image') as image_rows,
  count(*) filter (where media_type = 'music') as music_rows
from public.threads
where title like 'Bulk Thread #%';
