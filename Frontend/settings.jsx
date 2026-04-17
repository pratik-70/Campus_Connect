const { useEffect, useMemo, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;
const SETTINGS_KEY = "cc_user_settings";

function getDefaultSettings() {
  return {
    emailAnnouncements: true,
    eventReminders: true,
    profileVisibility: "campus",
    defaultViewMode: "grid"
  };
}

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...getDefaultSettings(), ...parsed };
  } catch (_error) {
    return getDefaultSettings();
  }
}

function SettingsPage() {
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
  const [settings, setSettings] = useState(readSettings);
  const [saveMessage, setSaveMessage] = useState("");

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
        const normalizedType = String(data?.user?.accountType || "").toLowerCase();

        if (normalizedType === "organizer") {
          window.location.href = "organiser.html";
          return;
        }

        if (mounted) {
          const nextUser = data.user || {};
          setUser(nextUser);
          localStorage.setItem("cc_user", JSON.stringify(nextUser));
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

  function updateSetting(name, value) {
    setSettings((prev) => ({ ...prev, [name]: value }));
    setSaveMessage("");
  }

  function saveSettings(event) {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaveMessage("Settings saved successfully.");
  }

  function resetSettings() {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
    setSaveMessage("Settings reset to defaults.");
  }

  function goToDashboard() {
    window.location.href = "dashboard.html";
  }

  function goToProfile() {
    window.location.href = "profile.html";
  }

  function signOut() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    window.location.href = "signin.html";
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#eef6ff_36%,#e9f4ff_100%)] px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1400px] rounded-3xl border border-[#d7e5f1] bg-white/85 p-8 text-[#5a6f86] shadow-[0_18px_40px_rgba(30,53,79,0.08)] backdrop-blur-sm">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#eef6ff_36%,#e9f4ff_100%)] flex flex-col text-[#1f3149]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
      <header className="relative z-30 border-b border-[#d7e5f1] bg-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(30,53,79,0.06)]">
        <div className="mx-auto max-w-[1400px] px-5 py-3 md:px-8 md:py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#149a8e]">Account Settings</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-[#16263a] md:text-4xl">{displayName}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToDashboard}
                className="rounded-full border border-[#c8d9ea] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:bg-[#f4f8ff]"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={goToProfile}
                className="rounded-full border border-[#c8d9ea] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:bg-[#f4f8ff]"
              >
                Profile
              </button>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-[#f4ccc8] bg-[#fff5f4] px-4 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#ffe9e7]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-0 mx-auto w-full max-w-[1400px] flex-1 px-5 py-8 md:px-8">
        <section className="animate-fadeUp rounded-[2rem] border border-[#d7e5f1] bg-white/80 px-6 py-7 shadow-[0_18px_40px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-10 md:py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#149a8e]">Personalize your experience</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-[#16263a] md:text-5xl">
              Tune notifications and privacy.
            </h2>
            <p className="mt-3 text-sm text-[#5a6f86] md:text-base">
              Keep the settings simple, readable, and aligned with the rest of the campus app.
            </p>
          </div>
        </section>

        <form onSubmit={saveSettings} className="mt-8 animate-fadeUp rounded-[2rem] border border-[#d7e5f1] bg-white/80 px-6 py-7 shadow-[0_18px_40px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-10 md:py-10">
          <div className="space-y-4">
            <label className="block rounded-2xl border border-[#dbe8f3] bg-[#f9fcff] p-4 md:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold text-[#1a2a3d]">Email announcements</p>
                  <p className="mt-1 text-xs text-[#5a6f86]">Get updates for featured events and campus news.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailAnnouncements}
                  onChange={(e) => updateSetting("emailAnnouncements", e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#0e8f84]"
                />
              </div>
            </label>

            <label className="block rounded-2xl border border-[#dbe8f3] bg-[#f9fcff] p-4 md:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold text-[#1a2a3d]">Event reminders</p>
                  <p className="mt-1 text-xs text-[#5a6f86]">See reminders before events you register for.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.eventReminders}
                  onChange={(e) => updateSetting("eventReminders", e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[#0e8f84]"
                />
              </div>
            </label>

            <label className="block rounded-2xl border border-[#dbe8f3] bg-[#f9fcff] p-4 md:p-5">
              <p className="text-sm font-semibold text-[#1a2a3d]">Profile visibility</p>
              <p className="mt-1 text-xs text-[#5a6f86]">Choose who can view your student profile details.</p>
              <select
                value={settings.profileVisibility}
                onChange={(e) => updateSetting("profileVisibility", e.target.value)}
                className="mt-3 w-full rounded-xl border border-[#cfe0ee] bg-white px-3 py-2 text-sm text-[#1a2a3d] outline-none ring-[#149a8e] focus:ring"
              >
                <option value="campus">Campus users</option>
                <option value="organizers">Organizers only</option>
                <option value="private">Only me</option>
              </select>
            </label>

            <label className="block rounded-2xl border border-[#dbe8f3] bg-[#f9fcff] p-4 md:p-5">
              <p className="text-sm font-semibold text-[#1a2a3d]">Default dashboard layout</p>
              <p className="mt-1 text-xs text-[#5a6f86]">Choose how events should appear by default.</p>
              <select
                value={settings.defaultViewMode}
                onChange={(e) => updateSetting("defaultViewMode", e.target.value)}
                className="mt-3 w-full rounded-xl border border-[#cfe0ee] bg-white px-3 py-2 text-sm text-[#1a2a3d] outline-none ring-[#149a8e] focus:ring"
              >
                <option value="grid">Grid view</option>
                <option value="list">List view</option>
              </select>
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eef6] pt-4">
            <button
              type="button"
              onClick={resetSettings}
              className="rounded-full border border-[#c8d9ea] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:bg-[#f4f8ff]"
            >
              Reset to defaults
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#0e8f84] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(14,143,132,0.24)] transition hover:bg-[#0d7a6e]"
            >
              Save settings
            </button>
          </div>

          {saveMessage ? (
            <p className="mt-4 rounded-xl bg-[#ecf8f6] px-3 py-2 text-sm font-medium text-[#0f766e]">{saveMessage}</p>
          ) : null}
        </form>
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<SettingsPage />);
