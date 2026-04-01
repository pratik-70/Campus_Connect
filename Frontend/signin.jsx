const { useState } = React;

const API_BASE = "http://127.0.0.1:4000/api";

function SigninPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState({ text: "", type: "idle" });
  const [isBusy, setIsBusy] = useState(false);

  function handleInput(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setMessage({ text: "Please enter a valid official email.", type: "error" });
      return;
    }

    if (!formData.password.trim()) {
      setMessage({ text: "Password is required.", type: "error" });
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.message || "Could not sign in.", type: "error" });
        return;
      }

      setMessage({ text: "Signed in successfully.", type: "success" });
      setFormData({ email: "", password: "" });
    } catch (_error) {
      setMessage({ text: "Network error while signing in.", type: "error" });
    } finally {
      setIsBusy(false);
    }
  }

  const messageColor =
    message.type === "error"
      ? "text-[#ff8f9d]"
      : message.type === "success"
      ? "text-[#66f0cb]"
      : "text-[#9fb4dd]";

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#fbfdff,#e9f3ff)] p-3 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1100px] overflow-hidden rounded-[2rem] border border-[#cfdeeb] shadow-[0_22px_52px_rgba(26,49,74,0.12)] lg:grid-cols-2">
        <section className="relative">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1300&q=80"
            alt="Students collaborating in a modern workspace"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,24,0.12),rgba(7,11,24,0.8))]" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 animate-fadeUp">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8df9e3]">Welcome Back</p>
            <h1 className="mt-2 max-w-[15ch] font-display text-4xl leading-tight md:text-5xl">Continue your campus event journey.</h1>
            <p className="mt-4 max-w-[50ch] text-sm text-[#d6e6ff] md:text-base">
              Access your dashboard, track registrations, and stay connected to campus opportunities.
            </p>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,#ffffff,#f5faff)] p-5 md:p-8">
          <div className="w-full animate-fadeUp">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-[#1a2a3d]">Sign in</p>
                <p className="text-sm text-[#5f748a]">Access your account</p>
              </div>
              <a href="index.html" className="text-sm text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Home</a>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label className="block text-sm text-[#24344a]">
                Official email
                <input
                  className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInput}
                  placeholder="you@university.edu"
                />
              </label>

              <label className="mt-3 block text-sm text-[#24344a]">
                Password
                <input
                  className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInput}
                  placeholder="Enter your password"
                />
              </label>

              <button
                type="submit"
                disabled={isBusy}
                className="mt-4 w-full rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                {isBusy ? "Signing in..." : "Sign In"}
              </button>

              <p className={`mt-3 min-h-[1.25rem] text-sm ${
                message.type === "error"
                  ? "text-[#d64a5e]"
                  : message.type === "success"
                  ? "text-[#16a084]"
                  : "text-[#5f748a]"
              }`}>{message.text}</p>

              <p className="mt-2 text-sm text-[#5f748a]">
                New here? <a href="signup.html" className="text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Create account</a>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<SigninPage />);
