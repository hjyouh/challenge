-- ============================================================
-- 디인챌 (천사님 인스타 챌린지) Supabase Schema
-- Project: rlzbwdvkpjfhxnxkblfg
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. 멤버 목록 (참여자 전체)
create table if not exists members (
  id           text primary key,         -- instagram ID (예: songjieun_psr)
  member_no    int,
  nickname     text,
  instagram_id text,
  emoji        text default '🙂',
  created_at   timestamptz default now()
);

-- 2. 월별 챌린지
create table if not exists challenge_months (
  id         text primary key,           -- '2026-5', '2025-10' 등
  year       int  not null,
  month      int  not null,
  created_at timestamptz default now()
);

-- 3. 미션 날짜 (월별 실제 출석체크 날)
create table if not exists missions (
  id             uuid default gen_random_uuid() primary key,
  month_id       text references challenge_months(id) on delete cascade,
  date           text not null,           -- '2026-05-02'
  label          text,                    -- '05.02 (토)'
  hashtag        text,                    -- '#챌린지_0501'
  completed_text text,                    -- '23일 완료'
  unique(month_id, date)
);

-- 4. 출석 기록
create table if not exists attendance (
  id          uuid default gen_random_uuid() primary key,
  member_id   text references members(id) on delete cascade,
  month_id    text references challenge_months(id) on delete cascade,
  date_key    text not null,              -- '2026-05-02'
  attended_at timestamptz default now(),
  unique(member_id, date_key)
);

-- 5. 앱 사용자 계정 (로그인/비밀번호)
create table if not exists accounts (
  id           uuid default gen_random_uuid() primary key,
  login_id     text unique not null,
  password     text not null,             -- 추후 hash 처리 권장
  nickname     text,
  instagram_id text,
  member_ids   text[] default '{}',       -- 연결된 member id 배열
  emoji        text default '😀',
  created_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS) 설정
-- ============================================================

-- members, challenge_months, missions: 누구나 읽기 가능
alter table members enable row level security;
alter table challenge_months enable row level security;
alter table missions enable row level security;
alter table attendance enable row level security;
alter table accounts enable row level security;

create policy "members: 읽기 공개" on members for select using (true);
create policy "challenge_months: 읽기 공개" on challenge_months for select using (true);
create policy "missions: 읽기 공개" on missions for select using (true);
create policy "attendance: 읽기 공개" on attendance for select using (true);

-- accounts: 읽기/쓰기 공개 (나중에 인증 추가 시 수정)
create policy "accounts: 읽기 공개" on accounts for select using (true);
create policy "accounts: 쓰기 공개" on accounts for insert with check (true);
create policy "accounts: 수정 공개" on accounts for update using (true);

-- attendance: 쓰기/수정 공개
create policy "attendance: 쓰기 공개" on attendance for insert with check (true);
create policy "attendance: 수정 공개" on attendance for update using (true);

-- ============================================================
-- 어드민 전용 테이블
-- ============================================================

create table if not exists admin_users (
  id         uuid default gen_random_uuid() primary key,
  username   text unique not null,
  password   text not null,
  created_at timestamptz default now()
);

-- 어드민 계정 생성 (비밀번호는 여기서 직접 설정하세요)
-- insert into admin_users (username, password) values ('admin', 'your_password_here');
