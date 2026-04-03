const { useEffect, useState } = React;

const API_BASE = "http://127.0.0.1:4000/api";
const TOKEN_KEY = "campusConnectToken";

const FALLBACK_ROLE_SUMMARY = {
	Student: {
		badge: "Student dashboard",
		heroText: "Keep track of registrations and your upcoming campus activities in one clean workspace.",
		primarySectionTitle: "My upcoming events",
		activitySectionTitle: "My activity",
		quickActions: ["Browse events", "View tickets", "Download pass", "Message organizer"],
		stats: [
			{ label: "Registered", value: "9", change: "2 this week" },
			{ label: "Saved", value: "4", change: "Recommendations ready" },
			{ label: "Streak", value: "6", change: "Consecutive check-ins" },
			{ label: "Certificates", value: "3", change: "Ready to download" }
		]
	},
	Organizer: {
		badge: "Organizer dashboard",
		heroText: "Manage event operations, publish updates, and keep attendance activity visible to your team.",
		primarySectionTitle: "Upcoming events",
		activitySectionTitle: "Operations",
		quickActions: ["Create event", "Review approvals", "Export attendance", "Message attendees"],
		stats: [
			{ label: "Active events", value: "12", change: "4 in review" },
			{ label: "Pending", value: "5", change: "Needs action" },
			{ label: "Registrations", value: "1,284", change: "+13% week-over-week" },
			{ label: "Alerts", value: "07", change: "Live updates" }
		]
	}
};

function DashboardPage() {
	const [isScrolled, setIsScrolled] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [dashboardData, setDashboardData] = useState(null);
	const [eventForm, setEventForm] = useState({
		mode: "create",
		id: null,
		eventType: "General",
		title: "",
		eventTime: "",
		location: "",
		status: "Open"
	});
	const [eventStatus, setEventStatus] = useState("");
	const [isSavingEvent, setIsSavingEvent] = useState(false);

	useEffect(() => {
		function handleScroll() {
			setIsScrolled(window.scrollY > 18);
		}

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	useEffect(() => {
		async function loadDashboard() {
			const token = localStorage.getItem(TOKEN_KEY);
			if (!token) {
				setLoadError("Please sign in to view the dashboard.");
				setIsLoading(false);
				return;
			}

			try {
				const response = await fetch(`${API_BASE}/dashboard/summary`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				const data = await response.json();

				if (!response.ok) {
					setLoadError(data.message || "Could not load dashboard data.");
					return;
				}

				setDashboardData(data);
			} catch (_error) {
				setLoadError("Network error while loading dashboard data.");
			} finally {
				setIsLoading(false);
			}
		}

		loadDashboard();
	}, []);

	const roleKey = dashboardData?.user?.accountType || "Student";
	const roleSummary = dashboardData?.roleSummary || FALLBACK_ROLE_SUMMARY[roleKey] || FALLBACK_ROLE_SUMMARY.Student;
	const displayName = dashboardData?.user ? `${dashboardData.user.firstName} ${dashboardData.user.lastName}`.trim() : "Campus Team";
	const roleLabel = dashboardData?.user?.accountType || "Student";
	const isOrganizer = roleKey === "Organizer";

	const stats = roleSummary.stats;
	const upcomingEvents = (dashboardData?.sampleEvents || dashboardData?.upcomingEvents || [
		{
			title: "Loading events...",
			eventTime: "Please wait",
			location: "Backend request in progress",
			status: "Syncing"
		}
	]).slice(0, 8);

	const notifications = dashboardData?.notifications || ["Loading notifications..."];

	function beginCreateEvent() {
		setEventStatus("");
		setEventForm({
			mode: "create",
			id: null,
			eventType: "General",
			title: "",
			eventTime: "",
			location: "",
			status: "Open"
		});
	}

	function beginEditEvent(event) {
		setEventStatus("");
		setEventForm({
			mode: "edit",
			id: event.id,
			eventType: event.eventType || "General",
			title: event.title || "",
			eventTime: event.eventTime || "",
			location: event.location || "",
			status: event.status || "Open"
		});
	}

	async function saveEvent(event) {
		event.preventDefault();
		if (!isOrganizer) {
			return;
		}

		const token = localStorage.getItem(TOKEN_KEY);
		if (!token) {
			setEventStatus("Sign in again to manage events.");
			return;
		}

		if (!eventForm.title.trim() || !eventForm.eventTime.trim() || !eventForm.location.trim()) {
			setEventStatus("Title, time, and location are required.");
			return;
		}

		try {
			setIsSavingEvent(true);
			setEventStatus("");

			const endpoint = eventForm.mode === "edit" ? `${API_BASE}/events/${eventForm.id}` : `${API_BASE}/events`;
			const method = eventForm.mode === "edit" ? "PUT" : "POST";

			const response = await fetch(endpoint, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					eventType: eventForm.eventType,
					title: eventForm.title,
					eventTime: eventForm.eventTime,
					location: eventForm.location,
					status: eventForm.status
				})
			});

			const data = await response.json();
			if (!response.ok) {
				setEventStatus(data.message || "Could not save event.");
				return;
			}

			setEventStatus(eventForm.mode === "edit" ? "Event updated." : "Event added.");
			window.location.reload();
		} catch (_error) {
			setEventStatus("Network error while saving event.");
		} finally {
			setIsSavingEvent(false);
		}
	}

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(140deg,#fbfdff,#e9f3ff)]">
			<div aria-hidden="true" className="pointer-events-none fixed -left-24 top-16 h-72 w-72 rounded-full bg-[#7ee7d24d] blur-3xl animate-glowPulse" />
			<div aria-hidden="true" className="pointer-events-none fixed -right-20 bottom-14 h-80 w-80 rounded-full bg-[#9dc8ff57] blur-3xl animate-floatSlow" />

			<header className="fixed left-0 top-0 z-50 w-full">
				<div className={`bg-[linear-gradient(180deg,#ffffffea,#f6fbffea)] shadow-[0_10px_24px_rgba(31,49,71,0.1)] ring-1 ring-[#d8e4ef] backdrop-blur transition-all duration-300 ${isScrolled ? "shadow-[0_14px_30px_rgba(31,49,71,0.16)] ring-[#c7d9ea]" : ""}`}>
					<div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-4 py-2 md:px-6">
						<a href="index.html" aria-label="Campus Connect Home" className="inline-flex shrink-0 items-center gap-3">
							<img src="campus-connect-logo.svg" alt="Campus Connect" className="h-12 w-auto rounded-md md:h-14" />
						</a>

						<nav className="hidden items-center gap-1 rounded-full bg-[#ffffffbf] p-1 text-sm font-semibold text-[#314860] ring-1 ring-[#dce6f0] lg:flex">
							<a href="index.html" className="rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]">Home</a>
							<a href="#overview" className="rounded-full px-4 py-2 text-[#0e8f84]">Overview</a>
							<a href="#events" className="rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]">Events</a>
							<a href="#activity" className="rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]">Activity</a>
						</nav>

						<div className="flex items-center gap-2">
							<a href="signin.html" className="rounded-lg border border-[#c8d5e3] bg-[#ffffff] px-3 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#0ea59680] hover:text-[#0e8f84] md:px-4">
								Sign Out
							</a>
						</div>
					</div>
				</div>
			</header>

			<main className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-[1160px] pb-16 pt-24 md:w-[calc(100%-2rem)] md:pt-28">
				<section id="overview" className="animate-fadeUp rounded-[1.5rem] border border-[#cfdeeb] bg-[#ffffffde] p-6 shadow-[0_14px_36px_rgba(26,49,74,0.1)] md:p-8">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0ea596]">{roleSummary.badge}</p>
					<h1 className="mt-3 max-w-[14ch] font-display text-4xl font-extrabold leading-tight text-[#1a2a3d] md:text-6xl">
						{isLoading ? "Loading your dashboard..." : `Welcome, ${displayName}.`}
					</h1>
					<p className="mt-4 max-w-[64ch] text-base leading-8 text-[#50647d] md:text-lg">
						{loadError || roleSummary.heroText}
					</p>

					<div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#d8e4ef] pt-4 text-sm text-[#4c6279]">
						<span><strong className="font-semibold text-[#22364d]">Role:</strong> {roleLabel}</span>
						<span><strong className="font-semibold text-[#22364d]">Workspace:</strong> Live</span>
						<span><strong className="font-semibold text-[#22364d]">Events:</strong> {upcomingEvents.length} visible</span>
					</div>
				</section>

				<section className="mt-5 rounded-2xl border border-[#d6e2ed] bg-[#ffffffc7] px-4 py-3 md:px-6">
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						{stats.map((item) => (
							<div key={item.label} className="border-b border-[#e2ecf4] pb-2 text-sm last:border-b-0 md:border-b-0 md:border-r md:pb-0 md:last:border-r-0 md:pr-3">
								<p className="font-semibold uppercase tracking-[0.1em] text-[#7a93aa]">{item.label}</p>
								<p className="mt-1 font-display text-2xl font-bold text-[#1f3147]">{item.value}</p>
								<p className="text-xs text-[#0e8f84]">{item.change}</p>
							</div>
						))}
					</div>
				</section>

				<section id="events" className="mt-5 rounded-[1.5rem] border border-[#d1dfeb] bg-[#ffffffde] p-5 shadow-[0_10px_26px_rgba(31,49,71,0.08)] md:p-6">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2 className="font-display text-2xl font-bold text-[#22364d] md:text-3xl">{roleSummary.primarySectionTitle}</h2>
							<p className="mt-1 text-sm text-[#5b7088]">A clean list of what needs your attention next.</p>
						</div>
						<div className="flex items-center gap-3">
							<p className="text-sm font-semibold text-[#0e8f84]">{upcomingEvents.length} events</p>
							{isOrganizer && (
								<button
									type="button"
									onClick={beginCreateEvent}
									className="rounded-lg bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105"
								>
									Add Event
								</button>
							)}
						</div>
					</div>

					<div className="mt-5 divide-y divide-[#e1eaf2] rounded-xl border border-[#d5e1ec] bg-[#ffffff]">
						{upcomingEvents.map((event, index) => (
							<article key={`${event.title}-${index}`} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className="inline-flex rounded-full bg-[#edfdf8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0e8f84]">
											{event.eventType || roleSummary.badge}
										</span>
										<span className="text-xs text-[#8299ad]">#{index + 1}</span>
									</div>
									<h3 className="mt-2 truncate font-display text-lg font-semibold text-[#23374d]">{event.title}</h3>
									<p className="text-sm text-[#5f748a]">{event.eventTime || event.time} · {event.location || event.room}</p>
								</div>

								<div className="flex items-center gap-3">
									<p className="text-sm font-semibold text-[#22406b]">{event.status}</p>
									{isOrganizer && (
										<button
											type="button"
											onClick={() => beginEditEvent(event)}
											className="rounded-lg border border-[#c8d5e3] bg-[#ffffff] px-3 py-1.5 text-sm font-semibold text-[#1f3147] transition hover:border-[#0ea59680] hover:text-[#0e8f84]"
										>
											Edit
										</button>
									)}
								</div>
							</article>
						))}
					</div>

					{isOrganizer && (
						<form onSubmit={saveEvent} className="mt-5 rounded-xl border border-[#d5e1ec] bg-[#fafdff] p-4">
							<p className="font-display text-lg font-semibold text-[#22364d]">
								{eventForm.mode === "edit" ? "Edit Event" : "Add Event"}
							</p>
							<div className="mt-3 grid gap-3 md:grid-cols-2">
								<input
									className="rounded-lg border border-[#d2dfeb] bg-[#ffffff] px-3 py-2 text-[#1a2a3d] outline-none focus:border-[#0ea596]"
									value={eventForm.eventType}
									onChange={(e) => setEventForm((prev) => ({ ...prev, eventType: e.target.value }))}
									placeholder="Event type"
								/>
								<input
									className="rounded-lg border border-[#d2dfeb] bg-[#ffffff] px-3 py-2 text-[#1a2a3d] outline-none focus:border-[#0ea596]"
									value={eventForm.status}
									onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.value }))}
									placeholder="Status"
								/>
								<input
									className="rounded-lg border border-[#d2dfeb] bg-[#ffffff] px-3 py-2 text-[#1a2a3d] outline-none focus:border-[#0ea596] md:col-span-2"
									value={eventForm.title}
									onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
									placeholder="Event title"
								/>
								<input
									className="rounded-lg border border-[#d2dfeb] bg-[#ffffff] px-3 py-2 text-[#1a2a3d] outline-none focus:border-[#0ea596]"
									value={eventForm.eventTime}
									onChange={(e) => setEventForm((prev) => ({ ...prev, eventTime: e.target.value }))}
									placeholder="Time"
								/>
								<input
									className="rounded-lg border border-[#d2dfeb] bg-[#ffffff] px-3 py-2 text-[#1a2a3d] outline-none focus:border-[#0ea596]"
									value={eventForm.location}
									onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
									placeholder="Location"
								/>
							</div>
							<div className="mt-4 flex flex-wrap items-center gap-3">
								<button
									type="submit"
									disabled={isSavingEvent}
									className="rounded-lg bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105"
								>
									{isSavingEvent ? "Saving..." : eventForm.mode === "edit" ? "Save Changes" : "Create Event"}
								</button>
								<p className="text-sm text-[#5f748a]">{eventStatus}</p>
							</div>
						</form>
					)}
				</section>

				<section id="activity" className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
					<section className="rounded-2xl border border-[#d1dfeb] bg-[#ffffffcf] p-5">
						<h2 className="font-display text-2xl font-bold text-[#22364d]">{roleSummary.activitySectionTitle}</h2>
						<div className="mt-4 flex flex-wrap gap-2">
							{roleSummary.quickActions.map((action) => (
								<button
									key={action}
									type="button"
									className="rounded-full border border-[#cedce9] bg-[#ffffff] px-4 py-2 text-sm font-semibold text-[#30475f] transition hover:border-[#9ed8cf] hover:text-[#0e8f84]"
								>
									{action}
								</button>
							))}
						</div>
					</section>

					<section className="rounded-2xl border border-[#d1dfeb] bg-[#ffffffcf] p-5">
						<h2 className="font-display text-2xl font-bold text-[#22364d]">{roleKey === "Organizer" ? "Operations alerts" : "Student updates"}</h2>
						<ul className="mt-4 divide-y divide-[#e4edf5] rounded-xl border border-[#d8e3ee] bg-[#ffffff]">
							{notifications.map((notification) => (
								<li key={typeof notification === "string" ? notification : notification.id} className="px-4 py-3 text-sm leading-7 text-[#5f748a]">
									{typeof notification === "string" ? notification : notification.message}
								</li>
							))}
						</ul>
					</section>
				</section>
			</main>
		</div>
	);
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<DashboardPage />);
