const { useEffect, useMemo, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

function getFallbackEventImage() {
  return "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80";
}

function formatPricingLabel(eventData) {
  const possiblePrice =
    eventData?.price ??
    eventData?.pricing ??
    eventData?.registrationFee ??
    eventData?.fee ??
    eventData?.ticketPrice ??
    "";

  if (possiblePrice === null || possiblePrice === undefined || possiblePrice === "") {
    return "Free Entry";
  }

  const normalized = String(possiblePrice).trim();
  if (!normalized) {
    return "Free Entry";
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return `INR ${normalized}`;
  }

  return normalized;
}

function createEmptyMember() {
  return { name: "", regNo: "" };
}

function EventRegistrationPage() {
  const token = localStorage.getItem("cc_token");
  const [eventData, setEventData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [status, setStatus] = useState({ type: "idle", text: "" });
  const [formData, setFormData] = useState(() => {
    const rawUser = localStorage.getItem("cc_user");
    try {
      const user = rawUser ? JSON.parse(rawUser) : {};
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      return {
        name: fullName || user.username || "",
        email: user.email || "",
        phone: "",
        year: "",
        teamSize: "1",
        additionalMembers: []
      };
    } catch (_error) {
      return { name: "", email: "", phone: "", year: "", teamSize: "1", additionalMembers: [] };
    }
  });

  useEffect(() => {
    if (!token) {
      window.location.href = "signin.html";
      return;
    }

    let mounted = true;

    async function loadEvent() {
      try {
        const params = new URLSearchParams(window.location.search);
        const queryId = params.get("id");

        let selectedEvent = null;
        const rawSelected = sessionStorage.getItem("cc_selected_event");
        if (rawSelected) {
          try {
            selectedEvent = JSON.parse(rawSelected);
          } catch (_error) {
            selectedEvent = null;
          }
        }

        if (selectedEvent && (!queryId || String(selectedEvent.id) === String(queryId))) {
          if (mounted) {
            setEventData(selectedEvent);
            setIsLoading(false);
          }
          return;
        }

        if (!queryId) {
          if (mounted) {
            setStatus({ type: "error", text: "Event details not found. Please choose an event again." });
            setIsLoading(false);
          }
          return;
        }

        const response = await fetch(`${API_BASE}/events`);
        const payload = await response.json().catch(() => ({ events: [] }));
        const events = Array.isArray(payload.events) ? payload.events : [];
        const matchedEvent = events.find((item) => String(item.id) === String(queryId));

        if (!matchedEvent) {
          if (mounted) {
            setStatus({ type: "error", text: "This event is not available right now." });
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          setEventData(matchedEvent);
          sessionStorage.setItem("cc_selected_event", JSON.stringify(matchedEvent));
          setIsLoading(false);
        }
      } catch (_error) {
        if (mounted) {
          setStatus({ type: "error", text: "Unable to load event details. Please try again." });
          setIsLoading(false);
        }
      }
    }

    loadEvent();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    let mounted = true;

    async function loadRegistrationStatus() {
      if (!eventData?.id) return;

      try {
        const response = await fetch(`${API_BASE}/me/registrations`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json().catch(() => ({ registrations: [] }));

        if (!response.ok) {
          return;
        }

        const registrations = Array.isArray(data.registrations) ? data.registrations : [];
        const exists = registrations.some((registration) => String(registration.eventId) === String(eventData.id));

        if (mounted) {
          setAlreadyRegistered(exists);
          if (exists) {
            setStatus({ type: "info", text: "You are already registered for this event." });
          }
        }
      } catch (_error) {
        // keep page usable even if this check fails
      }
    }

    loadRegistrationStatus();
    return () => {
      mounted = false;
    };
  }, [eventData, token]);

  const pricingLabel = useMemo(() => formatPricingLabel(eventData), [eventData]);
  const eventMaxTeamSize = useMemo(() => Math.min(6, Math.max(1, Number(eventData?.maxTeamSize) || 6)), [eventData]);

  useEffect(() => {
    setFormData((prev) => {
      const currentTeamSize = Math.min(eventMaxTeamSize, Math.max(1, Number(prev.teamSize) || 1));
      const memberCount = Math.max(0, currentTeamSize - 1);
      const currentMembers = Array.isArray(prev.additionalMembers) ? prev.additionalMembers : [];
      const resizedMembers = Array.from({ length: memberCount }, (_, index) => currentMembers[index] || createEmptyMember());

      return {
        ...prev,
        teamSize: String(currentTeamSize),
        additionalMembers: resizedMembers
      };
    });
  }, [eventMaxTeamSize]);

  function handleInput(event) {
    const { name, value } = event.target;

    if (name === "teamSize") {
      const parsedTeamSize = Math.min(eventMaxTeamSize, Math.max(1, Number(value) || 1));
      const memberCount = Math.max(0, parsedTeamSize - 1);

      setFormData((prev) => {
        const current = Array.isArray(prev.additionalMembers) ? prev.additionalMembers : [];
        const resized = Array.from({ length: memberCount }, (_, index) => current[index] || createEmptyMember());
        return { ...prev, teamSize: String(parsedTeamSize), additionalMembers: resized };
      });
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleAdditionalMemberInput(index, field, value) {
    setFormData((prev) => {
      const nextMembers = [...(prev.additionalMembers || [])];
      nextMembers[index] = { ...(nextMembers[index] || createEmptyMember()), [field]: value };
      return { ...prev, additionalMembers: nextMembers };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setStatus({ type: "error", text: "Please fill name, email, and phone to continue." });
      return;
    }

    if (alreadyRegistered) {
      setStatus({ type: "info", text: "You are already registered for this event." });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setStatus({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    if (!eventData?.id) {
      setStatus({ type: "error", text: "Event details are missing. Please reload this page." });
      return;
    }

    const teamSizeValue = Math.min(eventMaxTeamSize, Math.max(1, Number(formData.teamSize) || 1));
    const additionalMembers = (formData.additionalMembers || []).slice(0, Math.max(0, teamSizeValue - 1));

    if (teamSizeValue > 1) {
      const missingDetails = additionalMembers.some((member) => !member?.name?.trim() || !member?.regNo?.trim());
      if (missingDetails) {
        setStatus({ type: "error", text: "Please provide name and reg no. for all additional team members." });
        return;
      }
    }

    const teamNotes = additionalMembers
      .map((member, index) => `Member ${index + 2}: ${member.name.trim()} (Reg No: ${member.regNo.trim()})`)
      .join(" | ");

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE}/events/${eventData.id}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          year: formData.year.trim(),
          notes: teamNotes,
          teamSize: teamSizeValue,
          additionalMembers: additionalMembers.map((member) => ({
            name: member.name.trim(),
            regNo: member.regNo.trim()
          })),
          pricingLabel
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) {
          setAlreadyRegistered(true);
          setStatus({ type: "info", text: data.message || "You are already registered for this event." });
          return;
        }
        setStatus({ type: "error", text: data.message || "Could not complete registration right now." });
        return;
      }

      setAlreadyRegistered(true);
      setStatus({ type: "success", text: "You are successfully registered for this event." });
    } catch (_error) {
      setStatus({ type: "error", text: "Network issue while submitting registration." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8">
        <div className="rounded-3xl border border-[#d2e2ef] bg-white px-6 py-10 text-[#5a6f86] shadow-[0_16px_34px_rgba(30,53,79,0.08)]">
          Loading event registration details...
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8">
        <div className="rounded-3xl border border-[#ecd0d0] bg-white px-6 py-10 shadow-[0_16px_34px_rgba(30,53,79,0.08)]">
          <h1 className="font-display text-2xl font-semibold text-[#9e2d4f]">Registration page unavailable</h1>
          <p className="mt-2 text-[#5a6f86]">{status.text || "Please return to dashboard and select an event again."}</p>
          <a
            href="dashboard.html"
            className="mt-6 inline-flex rounded-full bg-[#0e8f84] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d7a6e]"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-7 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <a
          href="dashboard.html"
          className="rounded-full border border-[#c8d9e8] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:border-[#0ea59699] hover:text-[#0e8f84]"
        >
          Back to Dashboard
        </a>
        <p className="text-sm text-[#5a6f86]">Event Registration Workspace</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="animate-fadeUp overflow-hidden rounded-[1.8rem] border border-[#d6e4f0] bg-white shadow-[0_16px_36px_rgba(30,53,79,0.08)]">
          <img
            src={eventData.posterImage || eventData.image || getFallbackEventImage()}
            alt={eventData.title}
            className="h-60 w-full object-cover md:h-72"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getFallbackEventImage();
            }}
          />
          <div className="p-6 md:p-7">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#e1f2ee] px-3 py-1 text-xs font-semibold text-[#0e8f84]">
                {eventData.department}
              </span>
              <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-semibold text-[#1f3149]">
                {eventData.eventType}
              </span>
              <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-xs font-semibold text-[#92511a]">
                {pricingLabel}
              </span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold text-[#142538] md:text-4xl">{eventData.title}</h1>
            <p className="mt-3 text-[#516880]">{eventData.description}</p>

            <div className="mt-6 grid grid-cols-1 gap-3 text-sm text-[#4d637a] sm:grid-cols-2">
              <p className="rounded-xl border border-[#e2ebf4] bg-[#f9fcff] px-3 py-2">Date: {eventData.date}</p>
              <p className="rounded-xl border border-[#e2ebf4] bg-[#f9fcff] px-3 py-2">Time: {eventData.time}</p>
              <p className="rounded-xl border border-[#e2ebf4] bg-[#f9fcff] px-3 py-2 sm:col-span-2">Venue: {eventData.location}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#d8e6f2] bg-[linear-gradient(135deg,#f5fbff,#ebf6ff)] p-4">
              <h2 className="font-display text-lg font-semibold text-[#193148]">Pricing & Inclusions</h2>
              <ul className="mt-3 space-y-2 text-sm text-[#4d637a]">
                <li>Registration: {pricingLabel}</li>
                <li>Access: Full event participation and session access.</li>
                <li>Perks: Digital participation confirmation after successful registration.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="animate-fadeUp rounded-[1.8rem] border border-[#d6e4f0] bg-white p-6 shadow-[0_16px_36px_rgba(30,53,79,0.08)] md:p-7">
          <h2 className="font-display text-2xl font-semibold text-[#142538]">Complete Your Registration</h2>
          <p className="mt-1 text-sm text-[#5a6f86]">Fill in your details to reserve your seat for this event.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block text-sm text-[#24344a]">
              Full name
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInput}
                className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                placeholder="Your full name"
              />
            </label>

            <label className="block text-sm text-[#24344a]">
              Email
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInput}
                className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                placeholder="you@example.com"
              />
            </label>

            <label className="block text-sm text-[#24344a]">
              Phone no.
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInput}
                className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                placeholder="10-digit mobile number"
              />
            </label>

            <label className="block text-sm text-[#24344a]">
              Year / Designation
              <select
                name="year"
                value={formData.year}
                onChange={handleInput}
                className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              >
                <option value="">Select your year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </label>

            <label className="block text-sm text-[#24344a]">
              Team size
              <select
                name="teamSize"
                value={formData.teamSize}
                onChange={handleInput}
                className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              >
                {Array.from({ length: eventMaxTeamSize }, (_, index) => index + 1).map((size) => (
                  <option key={size} value={String(size)}>
                    {size === 1 ? "1 (Solo)" : String(size)}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs text-[#5f748a]">Maximum allowed team size for this event: {eventMaxTeamSize}</span>
            </label>

            {Number(formData.teamSize) > 1 &&
              formData.additionalMembers.map((member, index) => (
                <div key={`member-${index}`} className="rounded-xl border border-[#dce8f2] bg-[#f9fcff] p-3">
                  <p className="text-sm font-semibold text-[#24344a]">Member {index + 2} details</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(event) => handleAdditionalMemberInput(index, "name", event.target.value)}
                      className="w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-sm text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      placeholder="Member name"
                    />
                    <input
                      type="text"
                      value={member.regNo}
                      onChange={(event) => handleAdditionalMemberInput(index, "regNo", event.target.value)}
                      className="w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-sm text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      placeholder="Member reg no."
                    />
                  </div>
                </div>
              ))}

            <button
              type="submit"
              disabled={isSubmitting || alreadyRegistered}
              className={`mt-2 w-full rounded-xl px-4 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(22,159,145,0.24)] transition ${
                alreadyRegistered
                  ? "cursor-not-allowed bg-[#7ba8a3]"
                  : "bg-[linear-gradient(135deg,#169f91,#36cfc0)] hover:-translate-y-0.5 hover:brightness-105"
              }`}
            >
              {alreadyRegistered
                ? "Already Registered"
                : isSubmitting
                ? "Submitting..."
                : "Confirm Registration"}
            </button>

            {status.text && (
              <p className={`text-sm ${status.type === "success" ? "text-[#12806a]" : status.type === "info" ? "text-[#2d6f95]" : "text-[#b13a4f]"}`}>
                {status.text}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<EventRegistrationPage />);
