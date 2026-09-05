fetch("/api/auth/me", { credentials: "same-origin" })
  .then((response) => {
    if (!response.ok) location.href = `login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`;
  })
  .catch(() => { location.href = `login.html?returnTo=${encodeURIComponent(location.pathname + location.search)}`; });
