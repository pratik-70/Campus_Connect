const { useEffect, useMemo, useRef, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

const DEPARTMENTS = ["All", "CSE", "Civil", "MBA", "Agriculture"];
const EVENT_TYPES = ["All", "Coding", "Marketing", "Public Speaking", "Cultural", "Workshop", "Seminar"];

function getFallbackEventImage() {
  return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80";
}

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
  const [events, setEvents] = useState([]);
  const [isReloadingEvents, setIsReloadingEvents] = useState(false);
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedEventType, setSelectedEventType] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

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
          const normalizedType = String(data?.user?.accountType || "").toLowerCase();
          if (normalizedType === "organizer") {
            window.location.href = "organiser.html";
            return;
          }
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

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      try {
        const params = new URLSearchParams();
        if (selectedDept !== "All") params.append("department", selectedDept);
        if (selectedEventType !== "All") params.append("eventType", selectedEventType);

        const response = await fetch(`${API_BASE}/events?${params.toString()}`);
        const data = await response.json();

        if (mounted && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      } catch (_error) {
        console.error("Load events error:", _error);
      }
    }

    loadEvents();
    return () => {
      mounted = false;
    };
  }, [selectedDept, selectedEventType]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    return events;
  }, [events]);

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

  async function reloadEvents() {
    try {
      setIsReloadingEvents(true);
      const params = new URLSearchParams();
      if (selectedDept !== "All") params.append("department", selectedDept);
      if (selectedEventType !== "All") params.append("eventType", selectedEventType);

      const response = await fetch(`${API_BASE}/events?${params.toString()}`);
      const data = await response.json();

      if (Array.isArray(data.events)) {
        setEvents(data.events);
        console.log("Events reloaded:", data.events.length);
      }
    } catch (error) {
      console.error("Reload events error:", error);
    } finally {
      setIsReloadingEvents(false);
    }
  }

  function signOut() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    window.location.href = "signin.html";
  }

  function signOut() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    window.location.href = "signin.html";
  }

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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#eef6ff_36%,#e9f4ff_100%)] flex flex-col text-[#1f3149]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
      <header className="relative z-30 border-b border-[#d7e5f1] bg-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(30,53,79,0.06)]">
        <div className="mx-auto max-w-[1400px] px-5 py-3 md:px-8 md:py-4">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-3">
              <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-12 w-auto origin-left scale-105 md:h-14 md:scale-110" />
            </div>
            <div className="flex flex-1 flex-wrap justify-center gap-2 md:gap-3">
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold tracking-[0.01em] transition duration-200 shadow-sm ${
                    selectedDept === dept
                      ? "bg-[#0e8f84] text-white shadow-[0_10px_20px_rgba(14,143,132,0.24)]"
                      : "bg-white text-[#1f3149] border border-[#d5e2ef] hover:border-[#bcd4e7] hover:bg-[#f5faff]"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
            <div className="relative flex items-center gap-2" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Profile"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#c9d8e7] bg-white text-[#1f3149] shadow-sm transition hover:border-[#0ea59699] hover:text-[#0e8f84]"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </button>
              {isProfileMenuOpen && (
                <div className="absolute right-[88px] top-12 z-50 w-64 rounded-2xl border border-[#d5e2ef] bg-white p-2 shadow-[0_20px_34px_rgba(30,53,79,0.16)]" role="menu">
                  <div className="rounded-lg px-3 py-2">
                    <p className="truncate text-sm font-semibold text-[#1f3149]">{displayName}</p>
                    <p className="truncate text-xs text-[#5a6f86]">{user.email || "No email"}</p>
                  </div>
                  <div className="my-1 border-t border-[#e6eef6]"></div>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#1f3149] transition hover:bg-[#eef5ff]"
                    role="menuitem"
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#1f3149] transition hover:bg-[#eef5ff]"
                    role="menuitem"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#b42318] transition hover:bg-[#fff1ef]"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        </header>
      <main className="relative z-0 flex-1 mx-auto w-full max-w-[1400px] px-5 py-8 md:px-8">
        <section className="animate-fadeUp rounded-[2rem] border border-[#d7e5f1] bg-white/80 px-6 py-7 shadow-[0_18px_40px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-10 md:py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#149a8e]">{greeting}</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-[#16263a] md:text-6xl">
              {displayName}
            </h1>
          </div>
        </section>

        <div className="mt-10 mb-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#16263a] md:text-xl">Event Categories</h2>
              <p className="mt-1 text-sm text-[#5a6f86]">Filter by the event type you want to browse.</p>
            </div>
            <button
              onClick={reloadEvents}
              disabled={isReloadingEvents}
              className="rounded-full border border-[#bcd4e7] bg-white px-4 py-2 text-sm font-semibold text-[#0e8f84] transition hover:bg-[#f5faff] disabled:opacity-50"
            >
              {isReloadingEvents ? "Loading..." : "Refresh Events"}
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {EVENT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setSelectedEventType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition duration-200 ${
                  selectedEventType === type
                    ? "bg-[#149a8e] text-white shadow-[0_10px_18px_rgba(20,154,142,0.22)]"
                    : "bg-white text-[#5a6f86] border border-[#d5e2ef] hover:border-[#bcd4e7] hover:bg-[#f5fbff]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-8 flex justify-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-200 ${
              viewMode === "grid"
                ? "bg-[#0e8f84] text-white shadow-[0_10px_18px_rgba(14,143,132,0.22)]"
                : "bg-white text-[#1f3149] border border-[#d5e2ef] hover:border-[#bcd4e7] hover:bg-[#f5fbff]"
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition duration-200 ${
              viewMode === "list"
                ? "bg-[#0e8f84] text-white shadow-[0_10px_18px_rgba(14,143,132,0.22)]"
                : "bg-white text-[#1f3149] border border-[#d5e2ef] hover:border-[#bcd4e7] hover:bg-[#f5fbff]"
            }`}
          >
            List View
          </button>
        </div>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#5a6f86] text-lg">No events found for the selected filters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="group overflow-hidden rounded-[1.75rem] border border-[#d8e5f0] bg-white shadow-[0_12px_28px_rgba(30,53,79,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(30,53,79,0.12)]"
              >
                <img
                  src={event.image || getFallbackEventImage()}
                  alt={event.title}
                  className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getFallbackEventImage();
                  }}
                />
                <div className="p-5">
                  <div className="mb-3 flex gap-2">
                    <span className="rounded-full bg-[#e1f2ee] px-2.5 py-1 text-xs font-semibold text-[#0e8f84]">
                      {event.department}
                    </span>
                    <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-xs font-semibold text-[#1f3149]">
                      {event.eventType}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-[#16263a]">{event.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5a6f86]">{event.description}</p>
                  <div className="mt-4 space-y-2 text-sm text-[#5f748a]">
                    <p className="flex items-center gap-2">📅 <span>{event.date}</span></p>
                    <p className="flex items-center gap-2">🕐 <span>{event.time}</span></p>
                    <p className="flex items-center gap-2">📍 <span>{event.location}</span></p>
                  </div>
                  <button className="mt-5 w-full rounded-full bg-[#0e8f84] py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(14,143,132,0.2)] transition hover:bg-[#0d7a6e]">
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <div key={event.id} className="flex gap-5 rounded-[1.5rem] border border-[#d8e5f0] bg-white p-5 shadow-[0_12px_28px_rgba(30,53,79,0.08)] transition hover:shadow-[0_16px_34px_rgba(30,53,79,0.12)]">
                <img
                  src={event.image || getFallbackEventImage()}
                  alt={event.title}
                  className="h-36 w-36 flex-shrink-0 rounded-2xl object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getFallbackEventImage();
                  }}
                />
                <div className="flex-1">
                  <div className="mb-3 flex gap-2">
                    <span className="rounded-full bg-[#e1f2ee] px-2.5 py-1 text-xs font-semibold text-[#0e8f84]">
                      {event.department}
                    </span>
                    <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-xs font-semibold text-[#1f3149]">
                      {event.eventType}
                    </span>
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#16263a]">{event.title}</h3>
                  <p className="mt-2 max-w-2xl text-[#5a6f86]">{event.description}</p>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-[#5f748a]">
                    <p className="flex items-center gap-2">📅 <span>{event.date}</span></p>
                    <p className="flex items-center gap-2">🕐 <span>{event.time}</span></p>
                    <p className="flex items-center gap-2">📍 <span>{event.location}</span></p>
                  </div>
                  <button className="mt-5 rounded-full bg-[#0e8f84] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(14,143,132,0.2)] transition hover:bg-[#0d7a6e]">
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="mt-12 border-t border-[#d7e5f1] bg-[#142235] text-[#c9d8e7]">
        <div className="mx-auto max-w-[1400px] px-5 py-12 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="mb-4 font-semibold text-[#f3f7ff]">About Campus Connect</h4>
              <p className="text-sm leading-6 text-[#aebdcd]">Connect with campus events, build networks, and grow your skills.</p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-[#f3f7ff]">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="transition hover:text-white">Home</a></li>
                <li><a href="#" className="transition hover:text-white">Events</a></li>
                <li><a href="#" className="transition hover:text-white">Departments</a></li>
                <li><a href="#" className="transition hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-[#f3f7ff]">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="transition hover:text-white">FAQ</a></li>
                <li><a href="#" className="transition hover:text-white">Help Center</a></li>
                <li><a href="#" className="transition hover:text-white">Report Issue</a></li>
                <li><a href="#" className="transition hover:text-white">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold text-[#f3f7ff]">Connect With Us</h4>
              <p className="mb-3 text-sm text-[#aebdcd]">Follow our social media for updates</p>
              <div className="flex gap-3">
                <a
                  href="https://www.linkedin.com/in/nikhil-singhal04/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="rounded-full bg-white/5 p-2 text-[#c9d8e7] transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.3 8h4.4v14H.3V8zm7.2 0h4.2v1.9h.06c.58-1.1 2-2.26 4.12-2.26 4.4 0 5.22 2.9 5.22 6.66V22h-4.4v-6.8c0-1.62-.03-3.7-2.26-3.7-2.26 0-2.6 1.77-2.6 3.58V22H7.5V8z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/nikhilsinghal30/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="rounded-full bg-white/5 p-2 text-[#c9d8e7] transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm11 2a2 2 0 110 4 2 2 0 010-4zm-6 2a6 6 0 110 12 6 6 0 010-12zm0 2.2A3.8 3.8 0 1012 16a3.8 3.8 0 000-7.6z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/919518049986"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="rounded-full bg-white/5 p-2 text-[#c9d8e7] transition hover:bg-white/10 hover:text-white"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M20.52 3.48A11.86 11.86 0 0012.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.58 5.93L0 24l6.36-1.67a11.84 11.84 0 005.7 1.45h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.4zM12.07 21.8h-.01a9.9 9.9 0 01-5.04-1.38l-.36-.21-3.78.99 1.01-3.68-.23-.38a9.9 9.9 0 01-1.52-5.24c0-5.46 4.44-9.9 9.92-9.9 2.65 0 5.14 1.03 7 2.9a9.82 9.82 0 012.9 7c0 5.47-4.45 9.91-9.9 9.91zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.76.97-.93 1.17c-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.46-.88-.78-1.48-1.74-1.66-2.03-.17-.3-.02-.45.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.49s1.06 2.9 1.2 3.1c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.5 1.7.64.71.22 1.35.19 1.86.11.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.08-.12-.27-.2-.57-.35z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 text-sm text-[#8a9ab3] md:flex-row">
              <p>&copy; 2026 Campus Connect. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="transition hover:text-white">Privacy Policy</a>
                <a href="#" className="transition hover:text-white">Terms of Service</a>
                <a href="#" className="transition hover:text-white">Cookie Policy</a>
              </div>
            </div>
          </div>
      </div>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<DashboardPage />);
