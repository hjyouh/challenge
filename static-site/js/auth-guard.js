(function () {
  // TEST_RESET 비활성화 — 실 서비스 중

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
