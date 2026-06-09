(function () {
  // TEST_RESET 비활성화 — 실 서비스 중

  // ?main=N 프리뷰 모드: 인증 없이 UI 확인용
  const mainPreview = new URLSearchParams(location.search).get("main");
  if (mainPreview) {
    const profileKey = "deinchal-profile";
    if (!localStorage.getItem(profileKey)) {
      localStorage.setItem(profileKey, JSON.stringify({
        nickname: "천사님",
        loginId: "angel_demo",
        instaId: "angel_demo",
        accountCreated: true,
        autoLogin: false,
      }));
    }
    DC.hideSplash();
    return;
  }

  const profile = DC.profile();
  const session = JSON.parse(localStorage.getItem("deinchal-auth-session") || "null");
  const authenticated = Boolean(session || (profile.accountCreated && profile.autoLogin));
  if (!authenticated) {
    const path = location.pathname.endsWith("/index.html") || location.pathname.endsWith("/")
      ? "./pages/login.html"
      : "./login.html";
    location.replace(path);
  } else {
    // 인증 통과 → 스플래시 숨김
    DC.hideSplash();
  }
})();
