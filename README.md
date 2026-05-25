# 디인챌 복주머니 미션

인스타그램 해시태그 품앗이 챌린지를 복주머니 보상과 출석 카드로 관리하는 모바일 중심 PWA입니다. 회원은 화요일/토요일 미션일에 해시태그를 확인하고 양심 체크로 미션을 완료하며, 관리자는 `/admin`에서 회원과 미션 통계를 확인합니다.

## 기술 스택

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase Auth, Supabase Database, RLS
- Framer Motion
- PWA manifest + service worker
- Vercel 배포 가능 구조

## 설치 방법

```bash
npm install
```

## 환경변수

`.env.example`을 참고해 `.env.local`을 만듭니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase 설정

Supabase SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 내용을 실행합니다.

생성되는 테이블:

- `users_profile`
- `missions`
- `mission_checks`

생성되는 공개 랭킹용 뷰:

- `public_member_profiles`

RLS 기본 방향:

- 로그인 사용자는 본인 프로필을 조회/생성할 수 있습니다.
- 관리자는 전체 프로필과 통계를 볼 수 있습니다.
- 회원은 `mission_checks`를 조회할 수 있어 랭킹 계산이 가능합니다.
- 랭킹용 화면은 `public_member_profiles`를 사용해 이메일을 공개하지 않습니다.

## 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## Vercel 배포

1. GitHub 저장소에 코드를 push합니다.
2. Vercel에서 프로젝트를 Import합니다.
3. Environment Variables에 Supabase URL과 anon key를 등록합니다.
4. Deploy를 실행합니다.

## 관리자 계정 설정

초기 버전은 Supabase에서 특정 이메일의 role을 수동 변경합니다.

```sql
update users_profile
set role = 'admin'
where email = '관리자이메일@example.com';
```

관리자는 로그인 후 `/admin`으로 접속합니다.

## 이미지 교체 방법

아래 파일을 `public/images` 폴더에 넣으면 앱에서 자동으로 사용합니다. 이미지가 없으면 임시 이모지 박스로 표시됩니다.

- `public/images/angel.png`
- `public/images/inactive-card.png`
- `public/images/bok-small.png`
- `public/images/bok-silver.png`
- `public/images/bok-gold.png`
- `public/images/angel-badge.png`

## 미션 규칙

- 미션일: 매주 화요일, 토요일
- 해시태그 기준일: 미션일 전날
- 해시태그 형식: `#디인챌_MMDD`
- 인스타그램 링크: `https://www.instagram.com/explore/tags/디인챌_MMDD/`
- 미션은 당일 00:00부터 23:59까지만 완료할 수 있습니다.

## 향후 TODO

- 미션일 오후 12시 웹푸시 알림
- 알림 허용 사용자 대상 푸시 발송
- 관리자 통계 고도화
