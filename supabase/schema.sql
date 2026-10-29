-- PENORIX: tables, row level security and storage for the website forms.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.
--
-- Security model: the public site uses the anon key, which can only INSERT.
-- Nobody can read, update or delete rows or files with the anon key.
-- Read the data from the Supabase dashboard or with the service role key.

create extension if not exists pgcrypto;

-- Quote requests (B2B, the main goal of the site) --------------------------------
create table if not exists public.quote_requests (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  status         text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'won', 'lost')),
  company        text not null check (char_length(company) between 1 and 200),
  contact_name   text not null check (char_length(contact_name) between 1 and 200),
  email          text not null check (char_length(email) <= 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  country        text not null check (country in ('US', 'KR', 'IN', 'OTHER')),
  quantity       integer not null check (quantity between 1 and 10000000),
  model          text check (model in ('essential', 'signature', 'not_sure')),
  color          text check (color in ('black', 'sage', 'red', 'blue', 'orange', 'graphite', 'mixed', 'undecided')),
  engraving_text text check (char_length(engraving_text) <= 2000),
  logo_path      text check (char_length(logo_path) <= 300),   -- object path inside the quote-logos bucket
  desired_date   date,
  message        text check (char_length(message) <= 5000),
  lang           text check (lang in ('en', 'ko')),
  source_page    text check (char_length(source_page) <= 100),
  internal_notes text                                           -- for the team, never written by the site
);
create index if not exists quote_requests_created_idx on public.quote_requests (created_at desc);
create index if not exists quote_requests_status_idx on public.quote_requests (status);

-- General contact messages ---------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 200),
  email      text not null check (char_length(email) <= 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  country    text check (country in ('US', 'KR', 'IN', 'OTHER')),
  message    text not null check (char_length(message) between 1 and 5000),
  lang       text check (lang in ('en', 'ko'))
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

-- Row level security: anon may insert only ----------------------------------------
alter table public.quote_requests  enable row level security;
alter table public.contact_messages enable row level security;

revoke all on public.quote_requests, public.contact_messages from anon, authenticated;
grant insert on public.quote_requests, public.contact_messages to anon;

drop policy if exists "anon can submit quote requests" on public.quote_requests;
create policy "anon can submit quote requests" on public.quote_requests
  for insert to anon with check (status = 'new' and internal_notes is null);

drop policy if exists "anon can submit contact messages" on public.contact_messages;
create policy "anon can submit contact messages" on public.contact_messages
  for insert to anon with check (true);

-- Storage: private bucket for customer logo files ----------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-logos', 'quote-logos', false, 10485760,
  array['image/png', 'image/jpeg', 'image/svg+xml', 'application/pdf',
        'application/postscript', 'application/illustrator', 'application/octet-stream']
)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon can upload quote logos" on storage.objects;
create policy "anon can upload quote logos" on storage.objects
  for insert to anon with check (bucket_id = 'quote-logos');

-- Email notification -----------------------------------------------------------------
-- Dashboard > Database > Webhooks: create one webhook per table (quote_requests, contact_messages),
-- event INSERT, type "Supabase Edge Functions", function notify-quote.
-- See supabase/functions/notify-quote/index.ts and the README.
