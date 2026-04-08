const { useEffect, useMemo, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

function OrganizerDashboardPage() {
  const token = localStorage.getItem("cc_token");
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem("cc_user");
    try {
      return rawUser ? JSON.parse(rawUser) : {};
    } catch (_error) {
      return {};
    }
  });
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState({ type: "idle", text: "" });
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    eventType: "Workshop",
    department: "",
    date: "",
    time: "",
    location: "",
    description: ""
  });

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

        if (normalizedType !== "organizer") {
          window.location.href = "dashboard.html";
          return;
        }

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
          setIsCheckingUser(false);
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
        setIsLoadingEvents(true);
        const response = await fetch(`${API_BASE}/events`);
        const data = await response.json();

        if (mounted && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      } catch (_error) {
        console.error("Load events error:", _error);
      } finally {
        if (mounted) {
          setIsLoadingEvents(false);
        }
      }
    }

    loadEvents();
    return () => {
      mounted = false;
    };
  }, [token]);

  function handleInput(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleLogout() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    window.location.href = "signin.html";
  }

  async function handleCreateEvent(event) {
    event.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.department.trim() ||
      !formData.date ||
      !formData.time ||
      !formData.location.trim() ||
      !formData.description.trim()
    ) {
      setMessage({ type: "error", text: "Please fill all event fields before submitting." });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ type: "idle", text: "" });

      const response = await fetch(`${API_BASE}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          eventType: formData.eventType,
          department: formData.department.trim(),
          date: formData.date,
          time: formData.time,
          location: formData.location.trim(),
          description: formData.description.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.message || "Could not create event." });
        return;
      }

      setFormData({
        title: "",
        eventType: "Workshop",
        department: "",
        date: "",
        time: "",
        location: "",
        description: ""
      });

      setMessage({ type: "success", text: "Event created successfully." });

      const reloadResponse = await fetch(`${API_BASE}/events`);
      const reloadData = await reloadResponse.json();
      if (Array.isArray(reloadData.events)) {
        setEvents(reloadData.events);
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Network error while creating event." });
    } finally {
      setIsBusy(false);
    }
  }

  const displayName = useMemo(() => {
    const first = (user.firstName || "").trim();
    const last = (user.lastName || "").trim();
    const fallback = (user.username || "organizer").trim();
    return `${first} ${last}`.trim() || fallback;
  }, [user.firstName, user.lastName, user.username]);

  const messageColor =
    message.type === "error"
      ? "text-[#d64a5e]"
      : message.type === "success"
      ? "text-[#169f91]"
      : "text-[#5f748a]";

  if (isCheckingUser) {
    return (
      <div className="min-h-screen bg-[linear-gradient(140deg,#fbfdff,#e9f3ff)] p-6 text-[#1a2a3d]">
        <p className="mx-auto max-w-[1200px] text-sm">Loading organizer workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#fbfdff,#e9f3ff)] p-3 md:p-6 text-[#1a2a3d]">
      <div className="mx-auto w-full max-w-[1300px] rounded-[2rem] border border-[#cfdeeb] bg-[linear-gradient(180deg,#ffffff,#f5faff)] p-5 shadow-[0_22px_52px_rgba(26,49,74,0.12)] md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[#1a2a3d] md:text-4xl">Organizer Dashboard</h1>
            <p className="mt-2 text-sm text-[#5f748a]">Welcome, {displayName}. Create and manage your campus events.</p>
          </div>
          <div className="flex gap-2">
            <a
              href="dashboard.html"
              className="rounded-xl border border-[#c9d8e7] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:border-[#0ea59699] hover:text-[#0e8f84]"
            >
              Student View
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#efc8cf] bg-white px-4 py-2 text-sm font-semibold text-[#a13a4a] transition hover:border-[#e3a6b0]"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1.25fr]">
          <section className="rounded-2xl border border-[#d2dfeb] bg-white/80 p-4 md:p-5">
            <h2 className="font-display text-xl font-semibold text-[#1a2a3d]">Add New Event</h2>
            <p className="mt-1 text-sm text-[#5f748a]">Fill in event details and publish it to your organizer list.</p>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3">
              <label className="block text-sm text-[#24344a]">
                Event title
                <input
                  className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInput}
                  placeholder="AI Innovation Summit"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm text-[#24344a]">
                  Event type
                  <select
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleInput}
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Coding">Coding</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Public Speaking">Public Speaking</option>
                    <option value="Cultural">Cultural</option>
                  </select>
                </label>

                <label className="text-sm text-[#24344a]">
                  Department
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInput}
                    placeholder="CSE"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm text-[#24344a]">
                  Date
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInput}
                  />
                </label>

                <label className="text-sm text-[#24344a]">
                  Time
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInput}
                  />
                </label>
              </div>

              <label className="block text-sm text-[#24344a]">
                Location
                <input
                  className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInput}
                  placeholder="Main Auditorium"
                />
              </label>

              <label className="block text-sm text-[#24344a]">
                Description
                <textarea
                  className="mt-2 min-h-[110px] w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  name="description"
                  value={formData.description}
                  onChange={handleInput}
                  placeholder="Share the event goal, agenda, and who should attend."
                />
              </label>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isBusy ? "Creating..." : "Add Event"}
              </button>

              <p className={`min-h-[1.25rem] text-sm ${messageColor}`}>{message.text}</p>
            </form>
          </section>

          <section className="rounded-2xl border border-[#d2dfeb] bg-white/80 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-[#1a2a3d]">Your Created Events</h2>
              <span className="rounded-full bg-[#e8f7f4] px-3 py-1 text-xs font-semibold text-[#0e8f84]">
                {events.length} events
              </span>
            </div>

            {events.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d5e2ef] bg-[#f8fbff] px-4 py-6 text-sm text-[#5f748a]">
                No events added yet. Use the form to create your first event.
              </p>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {events.map((event) => (
                  <article key={event.id} className="rounded-xl border border-[#dce8f3] bg-[#f9fcff] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-[#1a2a3d]">{event.title}</h3>
                      <span className="rounded-full bg-[#ebf3ff] px-2.5 py-1 text-xs font-semibold text-[#315a8d]">
                        {event.eventType}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#4e637a]">{event.description}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#5f748a] sm:grid-cols-2">
                      <p><span className="font-semibold text-[#3d536c]">Department:</span> {event.department}</p>
                      <p><span className="font-semibold text-[#3d536c]">Date:</span> {event.date}</p>
                      <p><span className="font-semibold text-[#3d536c]">Time:</span> {event.time}</p>
                      <p><span className="font-semibold text-[#3d536c]">Location:</span> {event.location}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<OrganizerDashboardPage />);
