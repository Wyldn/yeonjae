-- Yeonjae cloud sync: follows + reading progress. Run after schema.sql.

create table if not exists follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id text not null,
  snap jsonb not null,
  added_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

alter table follows enable row level security;

create policy "read own follows" on follows for select using (auth.uid() = user_id);
create policy "add own follows" on follows for insert with check (auth.uid() = user_id);
create policy "update own follows" on follows for update using (auth.uid() = user_id);
create policy "remove own follows" on follows for delete using (auth.uid() = user_id);

create table if not exists progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  title_id text not null,
  chapter_id text not null,
  chapter_num text,
  page int,
  pct real,
  snap jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

alter table progress enable row level security;

create policy "read own progress" on progress for select using (auth.uid() = user_id);
create policy "add own progress" on progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on progress for update using (auth.uid() = user_id);
create policy "remove own progress" on progress for delete using (auth.uid() = user_id);
