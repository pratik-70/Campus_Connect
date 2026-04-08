const { useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;
const REQUIRE_EMAIL_OTP = false;

function SignupPage() {
  const totalSteps = REQUIRE_EMAIL_OTP ? 5 : 4;
  const stepTitles = REQUIRE_EMAIL_OTP
    ? [
        "Choose your role",
        "Academic details",
        "Email and password",
        "Email authentication",
        "Choose username"
      ]
    : [
        "Choose your role",
        "Academic details",
        "Email and password",
        "Choose username"
      ];
  const usernameStep = REQUIRE_EMAIL_OTP ? 5 : 4;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    accountType: "",
    firstName: "",
    lastName: "",
    regNo: "",
    programOrUnit: "",
    yearOrDesignation: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
    username: "",
    consent: false
  });
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [signupProofToken, setSignupProofToken] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "idle" });

  const departments = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Management",
    "Other"
  ];

  const reservedUsernames = ["admin", "support", "campusconnect", "events", "root"];

  function handleInput(event) {
    const { name, type, checked, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    if (name === "email") {
      setIsEmailVerified(false);
      setIsCodeSent(false);
      setSignupProofToken("");
      setOtpDigits(["", "", "", "", "", ""]);
    }
  }

  function handleOtpChange(index, rawValue) {
    const value = rawValue.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  function handleOtpKeyDown(index, event) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  function handleOtpPaste(event) {
    event.preventDefault();
    const pasted = (event.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!pasted) {
      return;
    }

    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i];
    }
    setOtpDigits(next);

    const focusIndex = Math.min(pasted.length, 5);
    const targetInput = document.getElementById(`otp-${focusIndex}`);
    if (targetInput) {
      targetInput.focus();
    }
  }

  function setError(text) {
    setMessage({ text, type: "error" });
  }

  function setSuccess(text) {
    setMessage({ text, type: "success" });
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (!formData.accountType) {
        return "Please choose Student or Organizer to continue.";
      }
      return "";
    }

    if (currentStep === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        return "Please enter your full name.";
      }

      if (!/^[A-Za-z0-9-]{6,14}$/.test(formData.regNo.trim())) {
        return "Registration ID should be 6 to 14 characters (letters, numbers, hyphen).";
      }

      if (!formData.department) {
        return "Please select your department.";
      }

      if (!formData.programOrUnit.trim()) {
        return formData.accountType === "Student"
          ? "Please enter your program name."
          : "Please enter your organizing unit.";
      }

      if (!formData.yearOrDesignation.trim()) {
        return formData.accountType === "Student"
          ? "Please select your year."
          : "Please enter your designation.";
      }
      return "";
    }

    if (currentStep === 3) {
      if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
        return "Please use a valid official institution email address.";
      }

      if (formData.password.length < 8) {
        return "Password must be at least 8 characters.";
      }

      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match.";
      }

      if (!formData.consent) {
        return "Please accept the terms to continue.";
      }
      return "";
    }

    if (REQUIRE_EMAIL_OTP && currentStep === 4) {
      if (!isCodeSent) {
        return "Please send the verification code to your email first.";
      }
      if (!isEmailVerified || !signupProofToken) {
        return "Please verify your email code before continuing.";
      }
      return "";
    }

    if (currentStep === usernameStep) {
      const username = formData.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{4,16}$/.test(username)) {
        return "Username must be 4-16 characters, lowercase letters, numbers, or underscore.";
      }
      if (reservedUsernames.includes(username)) {
        return "That username is reserved. Please choose another one.";
      }
      return "";
    }

    return "";
  }

  function goNext() {
    const error = validateStep(step);
    if (error) {
      setError(error);
      return;
    }

    setMessage({ text: "", type: "idle" });
    setStep((prev) => Math.min(totalSteps, prev + 1));
  }

  function goBack() {
    setMessage({ text: "", type: "idle" });
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function sendVerificationCode() {
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setError("Enter a valid official email before requesting a code.");
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim().toLowerCase() })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not send verification code.");
        return;
      }

      setIsCodeSent(true);
      setIsEmailVerified(false);
      setSignupProofToken("");
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccess("Verification code sent to your email.");
    } catch (_error) {
      setError("Network error while sending verification code.");
    } finally {
      setIsBusy(false);
    }
  }

  async function verifyCode() {
    if (!isCodeSent) {
      setError("Request a verification code first.");
      return;
    }

    const enteredCode = otpDigits.join("");
    if (enteredCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          code: enteredCode
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not verify code.");
        return;
      }

      setIsEmailVerified(true);
      setSignupProofToken(data.signupProofToken || "");
      setSuccess("Email verified successfully.");
    } catch (_error) {
      setError("Network error while verifying code.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const error = validateStep(usernameStep);
    if (error) {
      setError(error);
      return;
    }

    try {
      setIsBusy(true);
      setMessage({ text: "", type: "idle" });

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupProofToken: REQUIRE_EMAIL_OTP ? signupProofToken : null,
          accountType: formData.accountType,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          regNo: formData.regNo.trim(),
          department: formData.department,
          programOrUnit: formData.programOrUnit.trim(),
          yearOrDesignation: formData.yearOrDesignation.trim(),
          email: formData.email.trim().toLowerCase(),
          username: formData.username.trim().toLowerCase(),
          password: formData.password
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not complete signup.");
        return;
      }

      setSuccess("Signup completed successfully. Your account has been created.");
      setStep(1);
      setIsEmailVerified(false);
      setIsCodeSent(false);
      setSignupProofToken("");
      setOtpDigits(["", "", "", "", "", ""]);
      setFormData({
        accountType: "",
        firstName: "",
        lastName: "",
        regNo: "",
        programOrUnit: "",
        yearOrDesignation: "",
        email: "",
        department: "",
        password: "",
        confirmPassword: "",
        username: "",
        consent: false
      });
    } catch (_error) {
      setError("Network error while creating account.");
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
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1200px] overflow-hidden rounded-[2rem] border border-[#cfdeeb] shadow-[0_22px_52px_rgba(26,49,74,0.12)] lg:grid-cols-2">
        <section className="relative">
          <img
            src="signup-hero.svg"
            alt="Students walking on a university campus"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,11,24,0.1),rgba(7,11,24,0.78))]" />
          <div className="absolute left-0 right-0 top-0 flex min-h-[92px] items-center overflow-hidden bg-[#5fd8cf] px-6 py-2 shadow-[0_7px_0_0_#5fd8cf] md:min-h-[110px] md:px-10 md:shadow-[0_9px_0_0_#5fd8cf] animate-fadeUp">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(135deg, transparent 0 46%, rgba(255,255,255,0.14) 46% 48%, transparent 48% 100%)",
                backgroundSize: "56px 56px, 120px 120px",
                backgroundPosition: "0 0, 0 0"
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_24%)]" />
            <img
              src="campus-connect-logo.svg"
              alt="Campus Connect"
              className="relative z-10 h-auto w-full max-w-[255px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.28)] md:max-w-[330px]"
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 animate-fadeUp">
            <h1 className="mt-2 max-w-[16ch] font-display text-4xl leading-tight md:text-5xl">Create your account and join the campus event network.</h1>
            <p className="mt-4 max-w-[50ch] text-sm text-[#d6e6ff] md:text-base">
              Discover events, register instantly, and stay updated with one unified platform.
            </p>
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#ffffff,#f5faff)] p-5 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-semibold text-[#1a2a3d]">Sign up</p>
              <p className="text-sm text-[#5f748a]">Step {step} of {totalSteps}: {stepTitles[step - 1]}</p>
            </div>
            <a href="index.html" className="text-sm text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Home</a>
          </div>

          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[#22355f]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#27d1a6,#6ee7ff)] transition-all duration-500"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {step === 1 && (
              <div className="space-y-3">
                  <p className="text-sm text-[#50647d]">Choose how you want to use Campus Connect.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Student",
                      text: "Join events and track participation",
                      image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80"
                    },
                    {
                      label: "Organizer",
                      text: "Create and manage campus events",
                      image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80"
                    }
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, accountType: item.label }))}
                      className={`rounded-2xl border p-4 text-left transition ${
                        formData.accountType === item.label
                            ? "border-[#0ea596] bg-[#e8f7f4]"
                            : "border-[#d2dfeb] bg-[#ffffff] hover:border-[#bee7df]"
                      }`}
                    >
                      <img
                        src={item.image}
                        alt={`${item.label} role preview`}
                        className="mb-3 h-24 w-full rounded-xl object-cover"
                      />
                      <p className="font-display text-lg text-[#1a2a3d]">{item.label}</p>
                      <p className="mt-1 text-xs text-[#5f748a]">{item.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-[#24344a]">
                    First name
                      <input
                        className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInput}
                      placeholder="Aarav"
                    />
                  </label>
                    <label className="text-sm text-[#24344a]">
                    Last name
                      <input
                        className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInput}
                      placeholder="Sharma"
                    />
                  </label>
                </div>

                  <label className="mt-3 block text-sm text-[#24344a]">
                  University registration ID
                    <input
                      className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    type="text"
                    name="regNo"
                    value={formData.regNo}
                    onChange={handleInput}
                    placeholder="AB12-3456"
                  />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-[#24344a]">
                    Department
                      <select
                        className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      name="department"
                      value={formData.department}
                      onChange={handleInput}
                    >
                        <option value="" className="text-[#1a2a3d]">Select department</option>
                      {departments.map((department) => (
                          <option key={department} value={department} className="text-[#1a2a3d]">{department}</option>
                      ))}
                    </select>
                  </label>

                    <label className="text-sm text-[#24344a]">
                    {formData.accountType === "Student" ? "Program" : "Organizing Unit"}
                      <input
                        className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      type="text"
                      name="programOrUnit"
                      value={formData.programOrUnit}
                      onChange={handleInput}
                      placeholder={formData.accountType === "Student" ? "B.Tech CSE" : "Tech Club"}
                    />
                  </label>
                </div>

                  <label className="mt-3 block text-sm text-[#24344a]">
                  {formData.accountType === "Student" ? "Year" : "Designation"}
                  {formData.accountType === "Student" ? (
                    <select
                      className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      name="yearOrDesignation"
                      value={formData.yearOrDesignation}
                      onChange={handleInput}
                    >
                      <option value="">Select year</option>
                      <option value="1st year">1st Year</option>
                      <option value="2nd year">2nd Year</option>
                      <option value="3rd year">3rd Year</option>
                      <option value="4th year">4th Year</option>
                    </select>
                  ) : (
                    <input
                      className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      type="text"
                      name="yearOrDesignation"
                      value={formData.yearOrDesignation}
                      onChange={handleInput}
                      placeholder="Event Coordinator"
                    />
                  )}
                </label>
              </div>
            )}

            {step === 3 && (
              <div>
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
                    placeholder="At least 8 characters"
                  />
                </label>

                <label className="mt-3 block text-sm text-[#24344a]">
                  Confirm password
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInput}
                    placeholder="Re-enter password"
                  />
                </label>

                <label className="mt-3 flex items-start gap-2 text-sm text-[#9fb4dd]">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleInput}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-[#5f748a]">I agree to the Terms and Privacy Policy.</span>
                </label>
              </div>
            )}

            {REQUIRE_EMAIL_OTP && step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-[#50647d]">
                  Verify your email <span className="font-semibold text-[#1a2a3d]">{formData.email || "(not set)"}</span>
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={sendVerificationCode}
                    disabled={isBusy}
                    className="rounded-xl border border-[#bee7df] bg-[#e8f7f4] px-4 py-3 text-sm font-semibold text-[#0e8f84] transition hover:bg-[#d4ede8] sm:min-w-[190px]"
                  >
                    {isBusy ? "Sending..." : isCodeSent ? "Resend Code" : "Send Verification Code"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={`otp-${index}`}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      className="h-12 w-11 rounded-xl border border-[#d2dfeb] bg-[#ffffff] text-center text-lg font-semibold text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={isBusy}
                  className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 sm:min-w-[180px]"
                >
                  {isBusy ? "Verifying..." : "Verify Email"}
                </button>

                <p className={`text-sm ${isEmailVerified ? "text-[#16a084]" : "text-[#5f748a]"}`}>
                  {isEmailVerified ? "Email has been verified." : "Email not verified yet."}
                </p>
              </div>
            )}

            {step === usernameStep && (
              <div>
                <label className="block text-sm text-[#24344a]">
                  Choose a unique username
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-[#ffffff] px-3 py-3 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInput}
                    placeholder="your_name123"
                  />
                </label>

                <p className="mt-2 text-xs text-[#5f748a]">
                  Use 4-16 characters with lowercase letters, numbers, or underscore.
                </p>
              </div>
            )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#cfdeeb] pt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1 || isBusy}
                className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 text-sm font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isBusy}
                  className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 text-sm font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  {isBusy ? "Please wait..." : "Next"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-3 text-sm font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  {isBusy ? "Creating Account..." : "Complete Signup"}
                </button>
              )}
            </div>

            <p className={`mt-3 min-h-[1.25rem] text-sm ${
              message.type === "error"
                ? "text-[#d64a5e]"
                : message.type === "success"
                ? "text-[#16a084]"
                : "text-[#5f748a]"
            }`}>{message.text}</p>

            <p className="mt-2 pb-1 text-sm text-[#5f748a]">
              Already have an account? <a href="signin.html" className="text-[#0e8f84] underline underline-offset-4 hover:text-[#0d7a72]">Sign in</a>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<SignupPage />);
