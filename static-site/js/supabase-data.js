/* supabase-data.js
 * Supabase에서 챌린지 데이터를 가져와 window.DC_IMPORTED_DATA 형식으로 변환
 * imported-data.js 대체
 */
(function () {
  const SB_URL = 'https://rlzbwdvkpjfhxnxkblfg.supabase.co';
  const SB_KEY = 'sb_publishable_S50LJ8UgfRXDXybLl2IkcA_NpI2ipw0';

  function sbFetch(path) {
    return fetch(`${SB_URL}/rest/v1/${path}`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    }).then(r => r.json());
  }

  async function loadData() {
    try {
      // 병렬 fetch
      const [members, months, missions, attendance] = await Promise.all([
        sbFetch('members?select=id,nickname,instagram_id,emoji&order=nickname'),
        sbFetch('challenge_months?select=id,year,month&order=year.desc,month.desc'),
        sbFetch('missions?select=month_id,date,label,hashtag,completed_text'),
        sbFetch('attendance?select=member_id,month_id,date_key'),
      ]);

      // latest 월 계산
      const latest = months[0] ? { year: months[0].year, month: months[0].month } : null;

      // members 배열
      const membersArr = members.map(m => ({
        id:          m.id,
        nickname:    m.nickname,
        instagramId: m.instagram_id,
        emoji:       m.emoji || '🙂',
      }));

      // attendance 빠른 조회용 Set
      const attendSet = new Set(attendance.map(a => `${a.member_id}||${a.date_key}`));

      // months 객체 구성
      const monthsObj = {};
      for (const mo of months) {
        const key      = `${mo.year}-${mo.month}`;
        const moDates  = missions
          .filter(mi => mi.month_id === key)
          .map(mi => ({ date: mi.date, label: mi.label, hashtag: mi.hashtag }));

        // 이 월에 출석한 멤버 목록 (checks 포함)
        const moAttend = attendance.filter(a => a.month_id === key);
        const memberIds = [...new Set(moAttend.map(a => a.member_id))];

        // 전체 멤버 포함 (체크 없어도 명단에 있으면 포함)
        const allMemberIds = [...new Set([
          ...memberIds,
          ...members.map(m => m.id)
        ])];

        const moMembers = allMemberIds.map(mid => {
          const mInfo = members.find(m => m.id === mid);
          const checks = {};
          moDates.forEach(md => {
            if (attendSet.has(`${mid}||${md.date}`)) checks[md.date] = true;
          });
          return {
            id:          mid,
            nickname:    mInfo?.nickname || mid,
            instagramId: mInfo?.instagram_id || mid,
            emoji:       mInfo?.emoji || '🙂',
            checks,
          };
        });

        monthsObj[key] = {
          year:     mo.year,
          month:    mo.month,
          missions: moDates,
          members:  moMembers,
        };
      }

      window.DC_IMPORTED_DATA = {
        source:  'supabase',
        latest,
        members: membersArr,
        months:  monthsObj,
      };

      console.log(`[supabase-data] 로드 완료: 멤버 ${membersArr.length}명, 월 ${months.length}개, 출석 ${attendance.length}건`);
    } catch (e) {
      console.warn('[supabase-data] 로드 실패, fallback 없음:', e);
      window.DC_IMPORTED_DATA = null;
    }
  }

  // 동기적으로 Promise를 window에 노출 → common.js 등에서 await 가능
  window.DC_DATA_READY = loadData();
})();
