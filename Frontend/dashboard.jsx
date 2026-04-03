const { useEffect, useMemo, useRef, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

const MOCK_EVENTS = [
  {
    id: 1,
    title: "CodeWars Programming Contest",
    department: "CSE",
    eventType: "Coding",
    date: "2026-04-15",
    time: "10:00 AM",
    location: "CSE Lab 1",
    description: "Annual programming competition for all students",
    image: "assets/events/coding.svg"
  },
  {
    id: 2,
    title: "Marketing Strategy Workshop",
    department: "MBA",
    eventType: "Marketing",
    date: "2026-04-16",
    time: "2:00 PM",
    location: "MBA Conference Hall",
    description: "Learn digital marketing strategies and techniques",
    image: "assets/events/marketing.svg"
  },
  {
    id: 3,
    title: "Bridge Design Hackathon",
    department: "Civil",
    eventType: "Coding",
    date: "2026-04-17",
    time: "9:00 AM",
    location: "Civil Engineering Building",
    description: "Design and simulate bridge structures",
    image: "assets/events/civil.svg"
  },
  {
    id: 4,
    title: "Public Speaking Championship",
    department: "All",
    eventType: "Public Speaking",
    date: "2026-04-18",
    time: "3:00 PM",
    location: "Main Auditorium",
    description: "Inter-department public speaking competition",
    image: "assets/events/speaking.svg"
  },
  {
    id: 5,
    title: "Crop Yield Optimization Seminar",
    department: "Agriculture",
    eventType: "Seminar",
    date: "2026-04-19",
    time: "11:00 AM",
    location: "Agriculture Department",
    description: "Modern techniques for maximizing crop yield",
    image: "assets/events/agriculture.svg"
  },
  {
    id: 6,
    title: "Annual Cultural Fest",
    department: "All",
    eventType: "Cultural",
    date: "2026-04-20",
    time: "6:00 PM",
    location: "Campus Ground",
    description: "Celebrate different cultures with music, dance, and food",
    image: "assets/events/cultural.svg"
  },
  {
    id: 7,
    title: "Database Design Challenge",
    department: "CSE",
    eventType: "Coding",
    date: "2026-04-21",
    time: "1:00 PM",
    location: "CSE Lab 2",
    description: "Design efficient database schemas",
    image: "assets/events/coding.svg"
  },
  {
    id: 8,
    title: "Supply Chain Management Workshop",
    department: "MBA",
    eventType: "Workshop",
    date: "2026-04-22",
    time: "10:00 AM",
    location: "MBA Block",
    description: "Optimize supply chain operations",
    image: "assets/events/workshop.svg"
  },
  {
    id: 9,
    title: "Soil Conservation Talk",
    department: "Agriculture",
    eventType: "Seminar",
    date: "2026-04-23",
    time: "2:00 PM",
    location: "Agriculture Auditorium",
    description: "Sustainable soil management practices",
    image: "assets/events/seminar.svg"
  },
  {
    id: 10,
    title: "Structural Analysis Workshop",
    department: "Civil",
    eventType: "Workshop",
    date: "2026-04-24",
    time: "11:00 AM",
    location: "Civil Building",
    description: "Learn advanced structural analysis techniques",
    image: "assets/events/civil.svg"
  }
];

const DEPARTMENTS = ["All", "CSE", "Civil", "MBA", "Agriculture"];
const EVENT_TYPES = ["All", "Coding", "Marketing", "Public Speaking", "Cultural", "Workshop", "Seminar"];

function getFallbackEventImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eff7ff" />
          <stop offset="100%" stop-color="#dbeeff" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#g)" />
      <rect x="0" y="280" width="600" height="120" fill="#c8dced" />
      <circle cx="80" cy="70" r="45" fill="#149a8e" fill-opacity="0.18" />
      <circle cx="530" cy="330" r="60" fill="#1f3149" fill-opacity="0.1" />
      <rect x="170" y="120" width="260" height="150" rx="16" fill="#f4f9ff" stroke="#b6ccdf" />
      <circle cx="230" cy="175" r="18" fill="#149a8e" fill-opacity="0.7" />
      <rect x="260" y="160" width="130" height="10" rx="5" fill="#7e9ab4" />
      <rect x="260" y="182" width="95" height="10" rx="5" fill="#a2b8cd" />
      <rect x="205" y="215" width="190" height="12" rx="6" fill="#d7e5f2" />
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
    return MOCK_EVENTS.filter(event => {
      const deptMatch = selectedDept === "All" || event.department === selectedDept || event.department === "All";
      const typeMatch = selectedEventType === "All" || event.eventType === selectedEventType;
      return deptMatch && typeMatch;
    });
  }, [selectedDept, selectedEventType]);

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
              <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-11 w-auto md:h-12" />
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
                <a href="#" className="text-[#c9d8e7] transition hover:text-white">📘</a>
                <a href="#" className="text-[#c9d8e7] transition hover:text-white">🐦</a>
                <a href="#" className="text-[#c9d8e7] transition hover:text-white">📷</a>
                <a href="#" className="text-[#c9d8e7] transition hover:text-white">💼</a>
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
