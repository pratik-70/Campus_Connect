const { useEffect, useMemo, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

function DashboardPage() {
  const token = localStorage.getItem("cc_token");
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem("cc_user");
    try {
      return rawUser ? JSON.parse(rawUser) : {};
    } catch (_error) {
      return {};
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  if (!token) {
    window.location.href = "signin.html";
    return null;
  }

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Unauthorized");
        }

        const data = await response.json();
        if (mounted) {
          setUser(data.user || {});
          localStorage.setItem("cc_user", JSON.stringify(data.user || {}));
        }
      } catch (_error) {
        localStorage.removeItem("cc_token");
        localStorage.removeItem("cc_user");
        window.location.href = "signin.html";
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [token]);

  const displayName = useMemo(() => {
    const first = (user.firstName || "").trim();
    const last = (user.lastName || "").trim();
    const fallback = (user.username || "student").trim();
    return `${first} ${last}`.trim() || fallback;
  }, [user.firstName, user.lastName, user.username]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    }
    if (hour < 18) {
      return "Good afternoon";
    }
    return "Good evening";
  }, []);

  function signOut() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    window.location.href = "signin.html";
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(140deg,#f9fcff,#e9f4ff)] p-3 md:p-6">
        <div className="mx-auto max-w-[1200px] rounded-3xl border border-[#cfe0ee] bg-[linear-gradient(180deg,#ffffff,#f5faff)] px-5 py-8 text-[#5a6f86] shadow-[0_16px_36px_rgba(30,53,79,0.1)] md:px-8">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#f9fcff,#e9f4ff)] p-3 md:p-6">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <header className="animate-fadeUp rounded-3xl border border-[#cfe0ee] bg-[linear-gradient(180deg,#ffffff,#f4faff)] px-5 py-4 shadow-[0_16px_36px_rgba(30,53,79,0.1)] md:px-7 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-12 w-auto md:h-14" />
              <div>
                <p className="font-display text-xl font-semibold text-[#1f3149]">Dashboard</p>
                <p className="text-sm text-[#5f748a]">{today}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-[#c9d8e7] bg-[#ffffff] px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:border-[#0ea59699] hover:text-[#0e8f84]"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="animate-fadeUp rounded-3xl border border-[#cfe0ee] bg-[linear-gradient(180deg,#ffffff,#f5faff)] px-5 py-6 shadow-[0_16px_36px_rgba(30,53,79,0.1)] md:px-8 md:py-8">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#149a8e]">{greeting}</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-[#1a2a3d] md:text-5xl">
            {displayName}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[#5a6f86]">
            You are signed in as {user.email || "your account"}. Use this dashboard as your landing page for events, registrations, and activity updates.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-[#d5e2ef] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[#5f748a]">Account Type</p>
              <p className="mt-2 text-xl font-semibold text-[#1f3149]">{user.accountType || "Member"}</p>
            </article>
            <article className="rounded-2xl border border-[#d5e2ef] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[#5f748a]">Username</p>
              <p className="mt-2 text-xl font-semibold text-[#1f3149]">{user.username || "-"}</p>
            </article>
            <article className="rounded-2xl border border-[#d5e2ef] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[#5f748a]">Status</p>
              <p className="mt-2 text-xl font-semibold text-[#0e8f84]">Active Session</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<DashboardPage />);
