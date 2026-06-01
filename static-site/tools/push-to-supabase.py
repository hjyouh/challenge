"""
imported-data.js 데이터를 Supabase에 upsert
테이블: challenge_months, missions, members, attendance
"""
import json, re, requests, sys

SB_URL = 'https://rlzbwdvkpjfhxnxkblfg.supabase.co'
SB_SERVICE_KEY = ''  # 실행 시 인자로 전달

def headers():
    return {
        'apikey': SB_SERVICE_KEY,
        'Authorization': f'Bearer {SB_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }

def upsert(table, rows, on_conflict=None, chunk=500):
    url = f'{SB_URL}/rest/v1/{table}'
    if on_conflict:
        url += f'?on_conflict={on_conflict}'
    for i in range(0, len(rows), chunk):
        batch = rows[i:i+chunk]
        r = requests.post(url, headers=headers(), json=batch)
        if r.status_code not in (200, 201):
            print(f'  ERROR {table} batch {i}: {r.status_code} {r.text[:200]}')
            return False
    return True

def main(service_key):
    global SB_SERVICE_KEY
    SB_SERVICE_KEY = service_key

    with open(r'H:\내 드라이브\vibe coding\challenge\static-site\js\imported-data.js', encoding='utf-8') as f:
        content = f.read()
    json_str = content.replace('window.DC_IMPORTED_DATA = ', '').rstrip(';\n')
    data = json.loads(json_str)

    # 1. challenge_months
    months_rows = [
        {'id': key, 'year': mo['year'], 'month': mo['month']}
        for key, mo in data['months'].items()
    ]
    print(f'[1/4] challenge_months {len(months_rows)}건 upsert...')
    if not upsert('challenge_months', months_rows, on_conflict='id'):
        sys.exit(1)
    print('  OK')

    # 2. missions
    mission_rows = []
    for key, mo in data['months'].items():
        for mi in mo['missions']:
            mission_rows.append({
                'month_id': key,
                'date': mi['date'],
                'label': mi.get('label', ''),
                'hashtag': mi.get('hashtag', ''),
                'completed_text': mi.get('completedText', ''),
            })
    print(f'[2/4] missions {len(mission_rows)}건 upsert...')
    if not upsert('missions', mission_rows, on_conflict='month_id,date'):
        sys.exit(1)
    print('  OK')

    # 3. members
    member_rows = [
        {
            'id': m['id'],
            'nickname': m['nickname'],
            'instagram_id': m.get('instagramId', ''),
            'emoji': m.get('emoji', '🙂'),
        }
        for m in data['members']
    ]
    print(f'[3/4] members {len(member_rows)}건 upsert...')
    if not upsert('members', member_rows, on_conflict='id'):
        sys.exit(1)
    print('  OK')

    # 4. attendance
    attend_rows = []
    for key, mo in data['months'].items():
        for member in mo['members']:
            for date_key, checked in (member.get('checks') or {}).items():
                if checked:
                    attend_rows.append({
                        'member_id': member['id'],
                        'month_id': key,
                        'date_key': date_key,
                    })
    # (member_id, date_key) 중복 제거
    seen = set()
    deduped = []
    for row in attend_rows:
        k = (row['member_id'], row['date_key'])
        if k not in seen:
            seen.add(k)
            deduped.append(row)
    print(f'[4/4] attendance {len(deduped)}건 upsert (원본 {len(attend_rows)}건, 중복 {len(attend_rows)-len(deduped)}건 제거)...')
    if not upsert('attendance', deduped, on_conflict='member_id,date_key'):
        sys.exit(1)
    print('  OK')
    print(f'\n완료: {len(months_rows)}개월 / {len(member_rows)}명 / {len(attend_rows)}건 출석')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('사용법: python push-to-supabase.py <SERVICE_ROLE_KEY>')
        sys.exit(1)
    main(sys.argv[1])
