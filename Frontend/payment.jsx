const { useEffect, useMemo, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;

function getPendingRegistrationKey(eventId) {
  return `cc_pending_registration_${eventId}`;
}

function parseDraftFromQuery(eventId) {
  try {
    const params = new URLSearchParams(window.location.search);
    const encodedDraft = params.get("draft");
    if (!encodedDraft) {
      return null;
    }

    const decoded = decodeURIComponent(encodedDraft);
    const parsed = JSON.parse(decoded);
    if (!parsed || Number(parsed.eventId) !== Number(eventId)) {
      return null;
    }

    return parsed;
  } catch (_error) {
    return null;
  }
}

function PaymentPage() {
  const token = localStorage.getItem("cc_token");
  const [eventData, setEventData] = useState(null);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [paymentPath, setPaymentPath] = useState("");
  const [status, setStatus] = useState({ type: "idle", text: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const eventId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get("id");
    const parsed = Number(rawId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, []);

  useEffect(() => {
    if (!token) {
      window.location.href = "signin.html";
      return;
    }

    if (!eventId) {
      setStatus({ type: "error", text: "Payment details are missing. Please go back and try again." });
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function bootstrap() {
      const pendingKey = getPendingRegistrationKey(eventId);
      const draftFromQuery = parseDraftFromQuery(eventId);
      const rawPending = sessionStorage.getItem(pendingKey) || localStorage.getItem(pendingKey);

      if (!rawPending && !draftFromQuery) {
        if (mounted) {
          setStatus({ type: "error", text: "No pending registration found. Please submit the event form again." });
          setIsLoading(false);
        }
        return;
      }

      let parsedPending = draftFromQuery;
      if (!parsedPending && rawPending) {
        try {
          parsedPending = JSON.parse(rawPending);
        } catch (_error) {
          parsedPending = null;
        }
      }

      if (!parsedPending || Number(parsedPending.eventId) !== Number(eventId)) {
        if (mounted) {
          setStatus({ type: "error", text: "Pending registration data is invalid. Please retry registration." });
          setIsLoading(false);
        }
        return;
      }

      // Keep both storage locations in sync for refresh/back navigation continuity.
      try {
        const serialized = JSON.stringify(parsedPending);
        sessionStorage.setItem(pendingKey, serialized);
        localStorage.setItem(pendingKey, serialized);
      } catch (_error) {
        // Ignore persistence issues; parsedPending in memory is enough for this page load.
      }

      let selectedEvent = null;
      const rawSelected = sessionStorage.getItem("cc_selected_event");
      if (rawSelected) {
        try {
          const parsedSelected = JSON.parse(rawSelected);
          if (parsedSelected && String(parsedSelected.id) === String(eventId)) {
            selectedEvent = parsedSelected;
          }
        } catch (_error) {
          selectedEvent = null;
        }
      }

      try {
        const response = await fetch(`${API_BASE}/events`);
        const payload = await response.json().catch(() => ({ events: [] }));
        const events = Array.isArray(payload.events) ? payload.events : [];
        const matched = events.find((item) => String(item.id) === String(eventId));
        const normalizedEvent = matched || selectedEvent || { id: eventId, title: parsedPending.eventTitle || "Selected Event" };

        if (mounted) {
          setPendingRegistration(parsedPending);
          setEventData(normalizedEvent);
          setIsLoading(false);
        }
      } catch (_error) {
        if (mounted) {
          setPendingRegistration(parsedPending);
          setEventData(selectedEvent || { id: eventId, title: parsedPending.eventTitle || "Selected Event" });
          setStatus({ type: "error", text: "Could not load payment details right now." });
          setIsLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [eventId, token]);

  async function handleCompletePayment(event) {
    event.preventDefault();

    const registrationEventId = Number(eventData?.id || eventId);

    if (!pendingRegistration || !Number.isInteger(registrationEventId) || registrationEventId <= 0) {
      setStatus({ type: "error", text: "Missing registration details. Please try again." });
      return;
    }

    if (!paymentPath.trim()) {
      setStatus({ type: "error", text: "Please enter payment reference or path to continue." });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE}/events/${registrationEventId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: String(pendingRegistration.name || "").trim(),
          email: String(pendingRegistration.email || "").trim(),
          phone: String(pendingRegistration.phone || "").trim(),
          year: String(pendingRegistration.year || "").trim(),
          notes: String(pendingRegistration.notes || "").trim(),
          pricingLabel: String(pendingRegistration.pricingLabel || "").trim() || "Free Entry",
          paymentPath: paymentPath.trim()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", text: data.message || "Could not complete payment registration." });
        return;
      }

      sessionStorage.removeItem(getPendingRegistrationKey(registrationEventId));
      localStorage.removeItem(getPendingRegistrationKey(registrationEventId));
      setStatus({ type: "success", text: "Payment confirmed and registration completed successfully." });
    } catch (_error) {
      setStatus({ type: "error", text: "Network issue while confirming payment." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[960px] px-4 py-10 md:px-8">
        <div className="rounded-3xl border border-[#d2e2ef] bg-white px-6 py-10 text-[#5a6f86] shadow-[0_16px_34px_rgba(30,53,79,0.08)]">
          Loading payment details...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] px-4 py-7 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <a
          href={eventId ? `event-register.html?id=${eventId}` : "dashboard.html"}
          className="rounded-full border border-[#c8d9e8] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:border-[#0ea59699] hover:text-[#0e8f84]"
        >
          Back to Registration
        </a>
        <p className="text-sm text-[#5a6f86]">Event Payment Step</p>
      </header>

      <div className="rounded-[1.8rem] border border-[#d6e4f0] bg-white p-6 shadow-[0_16px_36px_rgba(30,53,79,0.08)] md:p-7">
        <h1 className="font-display text-3xl font-semibold text-[#142538]">Complete Payment</h1>
        <p className="mt-2 text-[#516880]">Confirm payment details to finalize your registration.</p>

        <div className="mt-4 rounded-2xl border border-[#d8e6f2] bg-[linear-gradient(135deg,#f5fbff,#ebf6ff)] p-4 text-sm text-[#4d637a]">
          <p><span className="font-semibold text-[#1f3149]">Event:</span> {eventData?.title || "-"}</p>
          <p><span className="font-semibold text-[#1f3149]">Amount:</span> {pendingRegistration?.pricingLabel || "-"}</p>
          <p><span className="font-semibold text-[#1f3149]">Participant:</span> {pendingRegistration?.name || "-"}</p>
        </div>

        <form onSubmit={handleCompletePayment} className="mt-5 space-y-3">
          <label className="block text-sm text-[#24344a]">
            Payment reference / path
            <input
              type="text"
              value={paymentPath}
              onChange={(event) => setPaymentPath(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
              placeholder="UPI UTR, transaction ID, or receipt link"
            />
          </label>

          <p className="text-xs text-[#5a6f86]">After making the payment, paste your transaction reference and complete registration.</p>

          <button
            type="submit"
            disabled={isSubmitting || status.type === "success"}
            className="mt-2 w-full rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(22,159,145,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status.type === "success" ? "Registration Completed" : isSubmitting ? "Processing..." : "Verify Payment & Register"}
          </button>

          {status.type === "success" && (
            <a
              href="dashboard.html"
              className="inline-flex rounded-full border border-[#bfd5e6] bg-white px-4 py-2 text-sm font-semibold text-[#1f3149] transition hover:border-[#0ea59699] hover:text-[#0e8f84]"
            >
              Go to Dashboard
            </a>
          )}

          {status.text && (
            <p className={`text-sm ${status.type === "success" ? "text-[#12806a]" : "text-[#b13a4f]"}`}>
              {status.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<PaymentPage />);
