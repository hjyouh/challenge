(function () {
  // ── TEST RESET ───────────────────────────────────────────
  // 앱을 완전히 종료 후 재실행하면 처음(로그인) 화면으로
  const TEST_RESET = true;
  if (TEST_RESET && !sessionStorage.getItem("deinchal-session-started")) {
    sessionStorage.setItem("deinchal-session-started", "1");
    localStorage.removeItem("deinchal-login-accounts");
    localStorage.removeItem("deinchal-auth-session");
    localStorage.removeItem("deinchal-profile");
    localStorage.removeItem("deinchal-checks");
  }
  // ────────────────────────────────────────────────────────

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
