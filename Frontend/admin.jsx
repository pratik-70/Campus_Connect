const { useEffect, useMemo, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

function formatDate(timestamp) {
  if (!timestamp) return "-";
  const dt = new Date(Number(timestamp));
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function isPastEvent(eventDate) {
  if (!eventDate) return false;

  const parsed = new Date(`${eventDate}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today;
}

function parseEditChanges(summary) {
  if (!summary) return [];
  try {
    const parsed = JSON.parse(summary);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.changes)) {
      return parsed.changes;
    }
    return [];
  } catch (_error) {
    return [];
  }
}

function exportAsCsv(rows) {
  if (!rows.length) return;

  const headers = [
    "id",
    "accountType",
    "firstName",
    "lastName",
    "regNo",
    "department",
    "programOrUnit",
    "yearOrDesignation",
    "email",
    "username",
    "createdAt"
  ];

  const csv = [headers.join(",")]
    .concat(
      rows.map((row) =>
        headers
          .map((key) => {
            const value = row[key] == null ? "" : String(row[key]);
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "campus-connect-users.csv";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, tone = "blue" }) {
  const toneClasses = {
    blue: "border-[#c7dcf7] bg-[#f3f8ff] text-[#174d87]",
    mint: "border-[#c8e9e2] bg-[#eefcf8] text-[#0f7a6f]",
    peach: "border-[#f1dac6] bg-[#fff7ef] text-[#8a4b13]",
    slate: "border-[#d4dde7] bg-[#f7f9fc] text-[#304861]"
  };

  return (
    <article className={`rounded-2xl border px-4 py-4 shadow-[0_8px_20px_rgba(17,42,61,0.06)] ${toneClasses[tone] || toneClasses.blue}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </article>
  );
}

function LoginPage({ onLogin, isLoading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (!email.trim()) {
      setLocalError("Email is required");
      return;
    }

    if (!password.trim()) {
      setLocalError("Password is required");
      return;
    }

    onLogin(email, password);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#f4fbff_0%,#eaf5ff_45%,#e7f4f2_100%)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#c9dbea] bg-white p-8 shadow-[0_20px_48px_rgba(17,42,61,0.12)]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-[#132b3f]">Admin Portal</h1>
          <p className="mt-2 text-sm text-[#52677f]">Secure administrator access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#2a4057] mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@campusconnect.com"
              className="w-full rounded-xl border border-[#d2dfeb] bg-white px-4 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#2a4057] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[#d2dfeb] bg-white px-4 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              disabled={isLoading}
            />
          </div>

          {(error || localError) && (
            <div className="rounded-lg bg-[#fdeef1] p-3 text-sm font-medium text-[#c53c58]">
              {error || localError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#52677f]">
          Unauthorized access attempts are logged and monitored.
        </p>
      </div>
    </div>
  );
}

function AdminPortalPage({ token, onLogout }) {
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState({ ok: false, service: "Unknown" });
  const [eventCount, setEventCount] = useState(0);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingDeletionRequests, setPendingDeletionRequests] = useState([]);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("All");
  const [eventsPanelOpen, setEventsPanelOpen] = useState(false);
  const [eventViewFilter, setEventViewFilter] = useState("All");
  const [isBusy, setIsBusy] = useState(false);
  const [approvingEventId, setApprovingEventId] = useState(null);
  const [approvingDeleteEventId, setApprovingDeleteEventId] = useState(null);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  async function fetchAdminData() {
    try {
      setIsBusy(true);
      setError("");

      const [healthRes, usersRes, eventsRes, approvedEventsRes, pendingEventsRes, deletionRequestsRes, registrationsRes] = await Promise.all([
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/admin/users`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/events`),
        fetch(`${API_BASE}/admin/events?status=Approved`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/admin/events?status=Pending`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/admin/events/deletion-requests`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/admin/registrations?limit=120`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
      ]);

      const healthData = await healthRes.json().catch(() => ({ ok: false, service: "Unknown" }));
      setHealth(healthData || { ok: false, service: "Unknown" });

      const eventsData = await eventsRes.json().catch(() => ({ events: [] }));
      setEventCount(Array.isArray(eventsData.events) ? eventsData.events.length : 0);

      const approvedEventsData = await approvedEventsRes.json().catch(() => ({ events: [] }));
      setApprovedEvents(Array.isArray(approvedEventsData.events) ? approvedEventsData.events : []);

      const pendingData = await pendingEventsRes.json().catch(() => ({ events: [] }));
      setPendingEvents(Array.isArray(pendingData.events) ? pendingData.events : []);

      const deletionData = await deletionRequestsRes.json().catch(() => ({ events: [] }));
      setPendingDeletionRequests(Array.isArray(deletionData.events) ? deletionData.events : []);

      const registrationsData = await registrationsRes.json().catch(() => ({ registrations: [] }));
      const normalizedRegistrations = Array.isArray(registrationsData.registrations) ? registrationsData.registrations : [];
      setRecentRegistrations(normalizedRegistrations);
      setRegistrationCount(Number(registrationsData.count || normalizedRegistrations.length || 0));

      const usersData = await usersRes.json().catch(() => ({}));
      if (!usersRes.ok) {
        setUsers([]);
        setError(usersData.message || "Could not load admin users data.");
        return;
      }

      setUsers(Array.isArray(usersData.users) ? usersData.users : []);
      setLastSyncedAt(Date.now());
    } catch (_error) {
      setError("Network issue while loading developer admin data.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const currentEvents = useMemo(() => approvedEvents.filter((event) => !isPastEvent(event.date)), [approvedEvents]);
  const pastEvents = useMemo(() => approvedEvents.filter((event) => isPastEvent(event.date)), [approvedEvents]);
  const allEventItems = useMemo(() => {
    const approvedItems = approvedEvents.map((event) => ({ ...event, eventStatus: "Approved" }));
    const pendingItems = pendingEvents.map((event) => ({ ...event, eventStatus: "Pending" }));
    return [...pendingItems, ...approvedItems].sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
  }, [approvedEvents, pendingEvents]);

  const filteredAllEventItems = useMemo(() => {
    if (eventViewFilter === "Pending") {
      return allEventItems.filter((event) => event.eventStatus === "Pending");
    }

    if (eventViewFilter === "Approved") {
      return allEventItems.filter((event) => event.eventStatus === "Approved");
    }

    if (eventViewFilter === "Current") {
      return allEventItems.filter((event) => event.eventStatus === "Approved" && !isPastEvent(event.date));
    }

    if (eventViewFilter === "Past") {
      return allEventItems.filter((event) => event.eventStatus === "Approved" && isPastEvent(event.date));
    }

    return allEventItems;
  }, [allEventItems, eventViewFilter]);

  async function approveEvent(eventId) {
    try {
      setApprovingEventId(eventId);
      setError("");

      const response = await fetch(`${API_BASE}/admin/events/${eventId}/approve`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Could not approve event.");
        return;
      }

      setPendingEvents((prev) => prev.filter((event) => event.id !== eventId));
      await fetchAdminData();
    } catch (_error) {
      setError("Network issue while approving event.");
    } finally {
      setApprovingEventId(null);
    }
  }

  async function approveDeleteEvent(eventId) {
    try {
      setApprovingDeleteEventId(eventId);
      setError("");

      const response = await fetch(`${API_BASE}/admin/events/${eventId}/approve-delete`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Could not approve event deletion.");
        return;
      }

      setPendingDeletionRequests((prev) => prev.filter((event) => event.id !== eventId));
      await fetchAdminData();
    } catch (_error) {
      setError("Network issue while approving event deletion.");
    } finally {
      setApprovingDeleteEventId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const typeMatch = accountFilter === "All" || user.accountType === accountFilter;
      if (!typeMatch) return false;

      if (!query) return true;

      const haystack = [
        user.firstName,
        user.lastName,
        user.email,
        user.username,
        user.regNo,
        user.department,
        user.programOrUnit,
        user.yearOrDesignation
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [users, search, accountFilter]);

  const stats = useMemo(() => {
    const students = users.filter((u) => u.accountType === "Student").length;
    const organizers = users.filter((u) => u.accountType === "Organizer").length;
    const departments = new Set(users.map((u) => String(u.department || "").trim()).filter(Boolean)).size;

    return {
      total: users.length,
      students,
      organizers,
      departments
    };
  }, [users]);

  const newestUser = useMemo(() => {
    if (!users.length) return null;
    return [...users].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
  }, [users]);

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-[1400px] rounded-[2rem] border border-[#c9dbea] bg-[linear-gradient(180deg,#ffffff,#f4f9ff)] p-5 shadow-[0_20px_48px_rgba(17,42,61,0.12)] md:p-8 animate-fadeUp">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f8c80]">Administrator</p>
            <h1 className="font-display text-3xl font-bold text-[#132b3f] md:text-4xl">Admin Portal</h1>
            <p className="mt-1 text-sm text-[#52677f]">Inspect registered users, monitor service health, and export user records.</p>
          </div>
          <div className="flex gap-2">
            <a href="index.html" className="rounded-xl border border-[#c9d8e7] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:border-[#0ea59699] hover:text-[#0e8f84]">Home</a>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-[#f0d4dc] bg-white px-4 py-2 text-sm font-semibold text-[#9b3b50] transition hover:border-[#e8b8c4]"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="mt-6 flex items-center justify-between rounded-2xl border border-[#d5e3ef] bg-white/90 p-4 md:p-5">
          <div>
            <p className="text-sm text-[#2a4057]">
              <span className="font-semibold text-[#0ea596]">Authenticated</span> as admin user
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAdminData}
            disabled={isBusy}
            className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isBusy ? "Loading..." : "Refresh Data"}
          </button>
        </section>

        {error && (
          <section className="mt-6 rounded-2xl border border-[#f8d7dd] bg-[#fdeef1] p-4">
            <p className="text-sm font-medium text-[#c53c58]">{error}</p>
          </section>
        )}

        <section className="mt-6 flex flex-wrap items-center gap-3 text-xs text-[#4f6780]">
          <span className={`rounded-full px-3 py-1 font-semibold ${health.ok ? "bg-[#e8f8f4] text-[#0a7e68]" : "bg-[#fdeef1] text-[#9e2d4f]"}`}>
            Service: {health.ok ? "Healthy" : "Unavailable"}
          </span>
          <span className="rounded-full bg-[#edf4ff] px-3 py-1 font-semibold text-[#2c4d77]">API: {health.service || "Unknown"}</span>
          <span className="rounded-full bg-[#fff4e8] px-3 py-1 font-semibold text-[#91551f]">Events: {eventCount}</span>
          <span className="rounded-full bg-[#f4f6f9] px-3 py-1 font-semibold text-[#425970]">Last sync: {formatDate(lastSyncedAt)}</span>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.total} tone="blue" />
          <StatCard label="Students" value={stats.students} tone="mint" />
          <StatCard label="Organizers" value={stats.organizers} tone="peach" />
          <StatCard label="Registrations" value={registrationCount} tone="slate" />
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Approved Events" value={approvedEvents.length} tone="blue" />
          <StatCard label="Current Events" value={currentEvents.length} tone="mint" />
          <StatCard label="Past Events" value={pastEvents.length} tone="peach" />
          <StatCard label="Pending Events" value={pendingEvents.length} tone="slate" />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e4ef] bg-white">
          <button
            type="button"
            onClick={() => setEventsPanelOpen((prev) => !prev)}
            className="flex w-full items-center justify-between border-b border-[#e0ebf4] bg-[#f7fbff] px-4 py-3 text-left"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-[#132b3f]">Events ({filteredAllEventItems.length})</h2>
              <p className="mt-1 text-xs text-[#52677f]">Click to view all events, current events, past events, and pending events.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#32597f] shadow-sm">
              {eventsPanelOpen ? "Hide" : "Show"}
            </span>
          </button>

          {eventsPanelOpen && (
            <div className="p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  "All",
                  "Pending",
                  "Approved",
                  "Current",
                  "Past"
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEventViewFilter(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      eventViewFilter === option
                        ? "bg-[#0ea596] text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)]"
                        : "bg-[#eef5fb] text-[#32597f] hover:bg-[#e4eff8]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="max-h-[380px] overflow-auto">
                {filteredAllEventItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d5e2ef] bg-[#f8fbff] px-4 py-6 text-sm text-[#5f748a]">
                    No events match the selected filter.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredAllEventItems.map((event) => (
                      <article key={`all-${event.eventStatus}-${event.id}`} className="rounded-xl border border-[#dce8f3] bg-[#f9fcff] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display text-lg font-semibold text-[#1a2a3d]">{event.title}</h3>
                            <p className="mt-1 text-sm text-[#5f748a]">{event.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-xs font-semibold text-[#315a8d]">
                              {event.eventType}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${event.eventStatus === "Approved" ? "bg-[#e8f8f4] text-[#0a7e68]" : "bg-[#fff4e8] text-[#91551f]"}`}>
                              {event.eventStatus}
                            </span>
                            {event.eventStatus === "Approved" && (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPastEvent(event.date) ? "bg-[#fff4e8] text-[#91551f]" : "bg-[#e8f8f4] text-[#0a7e68]"}`}>
                                {isPastEvent(event.date) ? "Past" : "Current"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-[#5f748a] sm:grid-cols-2 lg:grid-cols-4">
                          <p><span className="font-semibold text-[#3d536c]">Department:</span> {event.department}</p>
                          <p><span className="font-semibold text-[#3d536c]">Date:</span> {event.date}</p>
                          <p><span className="font-semibold text-[#3d536c]">Time:</span> {event.time}</p>
                          <p><span className="font-semibold text-[#3d536c]">Location:</span> {event.location}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#eed6dc] bg-white">
          <div className="border-b border-[#f2dfe4] bg-[#fff7f9] px-4 py-3">
            <h2 className="font-display text-lg font-semibold text-[#8e2e49]">Pending Deletion Requests ({pendingDeletionRequests.length})</h2>
            <p className="mt-1 text-xs text-[#6f4a56]">Organizer delete requests that require admin approval.</p>
          </div>

          <div className="max-h-[320px] overflow-auto p-4">
            {pendingDeletionRequests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#e6cdd4] bg-[#fff9fb] px-4 py-6 text-sm text-[#7e5a66]">
                No pending deletion requests.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingDeletionRequests.map((event) => (
                  <article key={`delete-${event.id}`} className="rounded-xl border border-[#eed6dc] bg-[#fff9fb] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-[#5c2234]">{event.title}</h3>
                        <p className="mt-1 text-xs text-[#7d5360]">Requested by: {event.createdBy || "-"} on {formatDate(event.deleteRequestedAt)}</p>
                      </div>
                      <span className="rounded-full bg-[#fdeef1] px-2.5 py-1 text-xs font-semibold text-[#9e2d4f]">
                        Delete Request
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg border border-[#f0dbe1] bg-white p-3 text-sm text-[#5d3a45]">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8f3450]">Reason from organizer</p>
                      <p className="mt-1">{event.deleteRequestReason || "-"}</p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => approveDeleteEvent(event.id)}
                        disabled={approvingDeleteEventId === event.id}
                        className="rounded-xl border border-[#efc8cf] bg-white px-4 py-2.5 text-sm font-semibold text-[#a13a4a] transition hover:border-[#e3a6b0] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {approvingDeleteEventId === event.id ? "Approving..." : "Approve Deletion"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e4ef] bg-white">
          <StatCard label="Approved Events" value={approvedEvents.length} tone="blue" />
          <StatCard label="Current Events" value={currentEvents.length} tone="mint" />
          <StatCard label="Past Events" value={pastEvents.length} tone="peach" />
          <StatCard label="Pending Events" value={pendingEvents.length} tone="slate" />
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e4ef] bg-white">
          <button
            type="button"
            onClick={() => setEventsPanelOpen((prev) => !prev)}
            className="flex w-full items-center justify-between border-b border-[#e0ebf4] bg-[#f7fbff] px-4 py-3 text-left"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-[#132b3f]">Events ({filteredAllEventItems.length})</h2>
              <p className="mt-1 text-xs text-[#52677f]">Click to view all events, current events, past events, and pending events.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#32597f] shadow-sm">
              {eventsPanelOpen ? "Hide" : "Show"}
            </span>
          </button>

          {eventsPanelOpen && (
            <div className="p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  "All",
                  "Pending",
                  "Approved",
                  "Current",
                  "Past"
                ].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setEventViewFilter(option)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      eventViewFilter === option
                        ? "bg-[#0ea596] text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)]"
                        : "bg-[#eef5fb] text-[#32597f] hover:bg-[#e4eff8]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="max-h-[380px] overflow-auto">
                {filteredAllEventItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d5e2ef] bg-[#f8fbff] px-4 py-6 text-sm text-[#5f748a]">
                    No events match the selected filter.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredAllEventItems.map((event) => (
                      <article key={`all-${event.eventStatus}-${event.id}`} className="rounded-xl border border-[#dce8f3] bg-[#f9fcff] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display text-lg font-semibold text-[#1a2a3d]">{event.title}</h3>
                            <p className="mt-1 text-sm text-[#5f748a]">{event.description}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-xs font-semibold text-[#315a8d]">
                              {event.eventType}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${event.eventStatus === "Approved" ? "bg-[#e8f8f4] text-[#0a7e68]" : "bg-[#fff4e8] text-[#91551f]"}`}>
                              {event.eventStatus}
                            </span>
                            {event.eventStatus === "Approved" && (
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPastEvent(event.date) ? "bg-[#fff4e8] text-[#91551f]" : "bg-[#e8f8f4] text-[#0a7e68]"}`}>
                                {isPastEvent(event.date) ? "Past" : "Current"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-[#5f748a] sm:grid-cols-2 lg:grid-cols-4">
                          <p><span className="font-semibold text-[#3d536c]">Department:</span> {event.department}</p>
                          <p><span className="font-semibold text-[#3d536c]">Date:</span> {event.date}</p>
                          <p><span className="font-semibold text-[#3d536c]">Time:</span> {event.time}</p>
                          <p><span className="font-semibold text-[#3d536c]">Location:</span> {event.location}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e4ef] bg-white">
          <div className="border-b border-[#e0ebf4] bg-[#f7fbff] px-4 py-3">
            <h2 className="font-display text-lg font-semibold text-[#132b3f]">Pending Event Approvals ({pendingEvents.length})</h2>
            <p className="mt-1 text-xs text-[#52677f]">Review organizer submissions before they appear on the student dashboard.</p>
          </div>

          <div className="max-h-[360px] overflow-auto p-4">
            {pendingEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d5e2ef] bg-[#f8fbff] px-4 py-6 text-sm text-[#5f748a]">
                No pending events right now.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingEvents.map((event) => (
                  <article key={event.id} className="rounded-xl border border-[#dce8f3] bg-[#f9fcff] p-4">
                    {(() => {
                      const eventChanges = parseEditChanges(event.editChangeSummary);
                      return (
                        <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-[#1a2a3d]">{event.title}</h3>
                        <p className="mt-1 text-sm text-[#5f748a]">{event.description}</p>
                      </div>
                      <span className="rounded-full bg-[#fff4e8] px-2.5 py-1 text-xs font-semibold text-[#91551f]">
                        {event.eventType}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-[#5f748a] sm:grid-cols-2 lg:grid-cols-4">
                      <p><span className="font-semibold text-[#3d536c]">Department:</span> {event.department}</p>
                      <p><span className="font-semibold text-[#3d536c]">Date:</span> {event.date}</p>
                      <p><span className="font-semibold text-[#3d536c]">Time:</span> {event.time}</p>
                      <p><span className="font-semibold text-[#3d536c]">Location:</span> {event.location}</p>
                    </div>

                    {eventChanges.length > 0 && (
                      <div className="mt-3 rounded-lg border border-[#d7e5f1] bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#315a8d]">Organizer requested changes</p>
                        <div className="mt-2 space-y-1.5 text-xs text-[#4e637a]">
                          {eventChanges.map((change, index) => (
                            <p key={`${event.id}-change-${index}`}>
                              <span className="font-semibold text-[#2c465f]">{change.field}:</span> {change.from || "-"} {'->'} {change.to || "-"}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => approveEvent(event.id)}
                        disabled={approvingEventId === event.id}
                        className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {approvingEventId === event.id ? "Approving..." : "Approve Event"}
                      </button>
                    </div>
                        </>
                      );
                    })()}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e4ef] bg-white">
          <div className="border-b border-[#e0ebf4] bg-[#f7fbff] px-4 py-3">
            <h2 className="font-display text-lg font-semibold text-[#132b3f]">Recent Event Registrations ({recentRegistrations.length})</h2>
            <p className="mt-1 text-xs text-[#52677f]">Latest participant signups across all approved events.</p>
          </div>

          <div className="max-h-[320px] overflow-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#edf4fb] text-left text-[#28435b]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Event</th>
                  <th className="px-3 py-2 font-semibold">Participant</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold">Fee</th>
                  <th className="px-3 py-2 font-semibold">Payment</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Organizer</th>
                </tr>
              </thead>
              <tbody>
                {recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-6 text-center text-[#5a728a]">No registrations available yet.</td>
                  </tr>
                ) : (
                  recentRegistrations.map((registration) => (
                    <tr key={registration.id} className="border-t border-[#ecf2f7] text-[#1e344b]">
                      <td className="px-3 py-2">{registration.eventTitle}</td>
                      <td className="px-3 py-2">{registration.fullName}</td>
                      <td className="px-3 py-2">{registration.email}</td>
                      <td className="px-3 py-2">{registration.phone}</td>
                      <td className="px-3 py-2">{registration.pricingLabel || "Free Entry"}</td>
                      <td className="px-3 py-2">{registration.paymentPath || "-"}</td>
                      <td className="px-3 py-2">{registration.date}</td>
                      <td className="px-3 py-2">{registration.organizerUsername || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <label className="text-sm text-[#2a4057]">
            Search users
            <input
              className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="name, email, username, reg no, department"
            />
          </label>

          <label className="text-sm text-[#2a4057]">
            Account type
            <select
              className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
            >
              <option value="All">All</option>
              <option value="Student">Student</option>
              <option value="Organizer">Organizer</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => exportAsCsv(filteredUsers)}
            className="rounded-xl border border-[#bdd5ea] bg-[#eef6ff] px-4 py-3 text-sm font-semibold text-[#224d7a] transition hover:border-[#96bfdf]"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={fetchAdminData}
            className="rounded-xl border border-[#bde8e1] bg-[#ecfbf7] px-4 py-3 text-sm font-semibold text-[#0f7f72] transition hover:border-[#8ed4c8]"
          >
            Refresh
          </button>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#d6e4ef] bg-white">
          <div className="border-b border-[#e0ebf4] bg-[#f7fbff] px-4 py-3">
            <h2 className="font-display text-lg font-semibold text-[#132b3f]">Registered Users ({filteredUsers.length})</h2>
            {newestUser && (
              <p className="mt-1 text-xs text-[#52677f]">
                Latest signup: {newestUser.firstName} {newestUser.lastName} ({newestUser.accountType}) on {formatDate(newestUser.createdAt)}
              </p>
            )}
          </div>

          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#edf4fb] text-left text-[#28435b]">
                <tr>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Reg No</th>
                  <th className="px-3 py-2 font-semibold">Department</th>
                  <th className="px-3 py-2 font-semibold">Program / Unit</th>
                  <th className="px-3 py-2 font-semibold">Year / Designation</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Username</th>
                  <th className="px-3 py-2 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-3 py-6 text-center text-[#5a728a]">No users found for the current filters.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-[#ecf2f7] text-[#1e344b]">
                      <td className="px-3 py-2">{user.id}</td>
                      <td className="px-3 py-2">{user.firstName} {user.lastName}</td>
                      <td className="px-3 py-2">{user.accountType}</td>
                      <td className="px-3 py-2">{user.regNo}</td>
                      <td className="px-3 py-2">{user.department}</td>
                      <td className="px-3 py-2">{user.programOrUnit}</td>
                      <td className="px-3 py-2">{user.yearOrDesignation}</td>
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2">{user.username}</td>
                      <td className="px-3 py-2">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function handleLogin(email, password) {
    setIsLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.message || "Login failed");
        return;
      }

      setToken(data.token);
    } catch (error) {
      setLoginError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setLoginError("");
  }

  return token ? (
    <AdminPortalPage token={token} onLogout={handleLogout} />
  ) : (
    <LoginPage onLogin={handleLogin} isLoading={isLoading} error={loginError} />
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
