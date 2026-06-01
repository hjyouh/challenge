"""
디인챌 엑셀 → Supabase 마이그레이션 스크립트
실행: python migrate_to_supabase.py
"""
import sys, io, json, time, re
import urllib.request, urllib.parse
import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ── 설정 ──────────────────────────────────────────────
EXCEL_PATH = 'C:/Users/hjyou/Downloads/디엔젤 인스타그램 챌린지 인증-1.xlsx'
SB_URL     = 'https://rlzbwdvkpjfhxnxkblfg.supabase.co'
SB_KEY     = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'  # .env 또는 직접 입력
# ──────────────────────────────────────────────────────

HEADERS = {
    'apikey':        SB_KEY,
    'Authorization': f'Bearer {SB_KEY}',
    'Content-Type':  'application/json',
    'Prefer':        'resolution=merge-duplicates',  # upsert
}

def sb_upsert(table, rows, on_conflict=None):
    """Supabase REST API upsert (batch, 500건씩)"""
    if not rows:
        return
    # 테이블별 충돌 컬럼 지정
    conflict_map = {
        'members':          'id',
        'challenge_months': 'id',
        'missions':         'month_id,date',
        'attendance':       'member_id,date_key',
    }
    conflict = on_conflict or conflict_map.get(table, '')
    url = f'{SB_URL}/rest/v1/{table}'
    if conflict:
        url += f'?on_conflict={urllib.parse.quote(conflict)}'

    batch_size = 500
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        data  = json.dumps(batch).encode('utf-8')
        req   = urllib.request.Request(url, data=data, headers=HEADERS, method='POST')
        try:
            res  = urllib.request.urlopen(req)
            total += len(batch)
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8')
            print(f'  ❌ {table} 오류: {e.code} {body[:300]}')
            raise
    print(f'  ✅ {table}: {total}건 upsert 완료')

def parse_sheet_name(name):
    """시트명 → (year, month) 또는 None"""
    n = name.replace('월', '').strip()
    if not n or not n.isdigit():
        return None
    n = int(n)
    if n > 100:
        year  = 2000 + (n // 10)
        month = n % 10
    else:
        year  = 2025
        month = n
    return (year, month)

def parse_date(label, year, month):
    """'05.02 (토)' → '2026-05-02'"""
    if not isinstance(label, str):
        return None
    m = re.match(r'(\d{2})\.(\d{2})', label.strip())
    if not m:
        return None
    mm, dd = int(m.group(1)), int(m.group(2))
    # 날짜 월이 시트 월과 다르면 연도/월 보정
    actual_year  = year
    actual_month = mm
    if mm > month:          # 이전 달 말일 (예: 12월 시트에 11.xx)
        actual_year  = year if month > 1 else year - 1
        actual_month = mm
    return f'{actual_year}-{actual_month:02d}-{dd:02d}'

def find_data_start_col(df):
    """날짜 열이 시작되는 컬럼 인덱스 찾기"""
    row0 = list(df.iloc[0])
    for i, v in enumerate(row0):
        if isinstance(v, str) and re.match(r'\d{2}\.\d{2}', v.strip()):
            return i
    return 7  # fallback

# ── 메인 ─────────────────────────────────────────────
xl = pd.ExcelFile(EXCEL_PATH)
print(f'📂 시트 수: {len(xl.sheet_names)}\n')

all_members    = {}   # instagram_id → member dict
all_months     = []
all_missions   = []
all_attendance = []

for sheet_name in xl.sheet_names:
    ym = parse_sheet_name(sheet_name)
    if ym is None:
        print(f'  ⏭  {sheet_name} 건너뜀')
        continue
    year, month = ym
    month_id    = f'{year}-{month}'
    print(f'📅 {sheet_name} → {month_id}')

    df        = xl.parse(sheet_name, header=None)
    date_col  = find_data_start_col(df)
    row0      = list(df.iloc[0])   # 날짜 레이블
    row1      = list(df.iloc[1])   # 해시태그
    row2      = list(df.iloc[2])   # 완료 수

    # 미션 날짜 수집
    month_missions = []
    date_cols = {}   # col_idx → date_str
    for ci in range(date_col, len(row0)):
        label = row0[ci]
        if not isinstance(label, str):
            continue
        date_str = parse_date(label, year, month)
        if date_str:
            hashtag        = row1[ci] if ci < len(row1) and isinstance(row1[ci], str) else None
            completed_text = row2[ci] if ci < len(row2) and isinstance(row2[ci], str) else None
            date_cols[ci]  = date_str
            month_missions.append({
                'month_id':       month_id,
                'date':           date_str,
                'label':          label.strip(),
                'hashtag':        hashtag,
                'completed_text': completed_text,
            })

    all_months.append({'id': month_id, 'year': year, 'month': month})
    all_missions.extend(month_missions)
    print(f'   미션 {len(month_missions)}개: {[m["date"] for m in month_missions]}')

    # 멤버 & 출석 수집 (row 4부터)
    member_count = 0
    attend_count = 0
    for ri in range(4, len(df)):
        row = list(df.iloc[ri])
        # 닉네임 컬럼 탐색 (시트마다 약간씩 다름)
        nickname     = None
        instagram_id = None
        for ci_offset in range(1, 5):
            if ci_offset < len(row) and isinstance(row[ci_offset], str) and row[ci_offset].strip():
                if nickname is None:
                    nickname = row[ci_offset].strip()
                elif instagram_id is None:
                    instagram_id = row[ci_offset].strip().rstrip()
                    break

        if not instagram_id or not nickname:
            continue
        # 공백 제거
        instagram_id = instagram_id.strip()

        if instagram_id not in all_members:
            all_members[instagram_id] = {
                'id':           instagram_id,
                'nickname':     nickname,
                'instagram_id': instagram_id,
                'emoji':        '🙂',
            }
            member_count += 1

        # 출석 체크
        for ci, date_str in date_cols.items():
            val = row[ci] if ci < len(row) else None
            if isinstance(val, str) and '완료' in val:
                all_attendance.append({
                    'member_id': instagram_id,
                    'month_id':  month_id,
                    'date_key':  date_str,
                })
                attend_count += 1

    print(f'   멤버 신규 {member_count}명, 출석 {attend_count}건')

# attendance 중복 제거 (같은 member_id + date_key)
seen = set()
deduped_attendance = []
for a in all_attendance:
    key = (a['member_id'], a['date_key'])
    if key not in seen:
        seen.add(key)
        deduped_attendance.append(a)
all_attendance = deduped_attendance

print(f'\n📊 집계: 멤버 {len(all_members)}명 / 월 {len(all_months)}개 / 미션 {len(all_missions)}개 / 출석 {len(all_attendance)}건 (중복제거)')
print('\n🚀 Supabase 업로드 시작...\n')

# 1. members
sb_upsert('members', list(all_members.values()))

# 2. challenge_months
sb_upsert('challenge_months', all_months)

# 3. missions (중복 키: month_id + date)
sb_upsert('missions', all_missions)

# 4. attendance (중복 키: member_id + date_key)
sb_upsert('attendance', all_attendance)

print('\n✅ 마이그레이션 완료!')
