-- Yeonjae community schema. Paste into the Supabase SQL editor of a new
-- project, then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  title_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_title_idx on comments (title_id, created_at desc);

alter table comments enable row level security;

create policy "comments are public reading"
  on comments for select using (true);

create policy "signed-in users comment as themselves"
  on comments for insert with check (auth.uid() = user_id);

create policy "authors can delete their comments"
  on comments for delete using (auth.uid() = user_id);
