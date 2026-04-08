const { useEffect, useState } = React;

const API_HOST = window.location.hostname || "127.0.0.1";
const API_BASE = `http://${API_HOST}:4000/api`;
const EXTRA_PROFILE_KEY = "cc_profile_extra";

function readExtraProfile() {
  try {
    const raw = localStorage.getItem(EXTRA_PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
}

function getInitialProfileForm() {
  return {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    department: "",
    yearOrSection: "",
    interests: "",
    bio: ""
  };
}

function ProfilePage() {
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
  const [editingAbout, setEditingAbout] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAcademic, setEditingAcademic] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [profileForm, setProfileForm] = useState(getInitialProfileForm);

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
    const extra = readExtraProfile();
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: user.email || "",
      phone: extra.phone || "",
      department: extra.department || "",
      yearOrSection: extra.yearOrSection || "",
      interests: extra.interests || "",
      bio: extra.bio || ""
    });
  }, [user.firstName, user.lastName, user.username, user.email]);

  const displayName = `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim() || (profileForm.username || "student");
  const profileInitial = (displayName[0] || "S").toUpperCase();
  const accountType = user.accountType ? `${String(user.accountType).charAt(0).toUpperCase()}${String(user.accountType).slice(1)}` : "Student";

  const personalFields = [
    { label: "First name", value: profileForm.firstName || "Not set" },
    { label: "Last name", value: profileForm.lastName || "Not set" },
    { label: "Username", value: profileForm.username || "Not set" },
    { label: "Email", value: profileForm.email || "Not set" },
    { label: "Phone", value: profileForm.phone || "Not set" }
  ];

  const academicFields = [
    { label: "Department", value: profileForm.department || "Not set" },
    { label: "Year / Section", value: profileForm.yearOrSection || "Not set" },
    { label: "Account type", value: accountType },
    { label: "User ID", value: user.id ? String(user.id) : "Not available" }
  ];

  const interestTags = profileForm.interests
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  function handleBackToDashboard() {
    window.location.href = "dashboard.html";
  }

  function handleSignOut() {
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
    window.location.href = "signin.html";
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleStartEditAbout() {
    setSaveMessage("");
    setEditingAbout(true);
  }

  function handleCancelEditAbout() {
    const extra = readExtraProfile();
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: user.email || "",
      phone: extra.phone || "",
      department: extra.department || "",
      yearOrSection: extra.yearOrSection || "",
      interests: extra.interests || "",
      bio: extra.bio || ""
    });
    setSaveMessage("");
    setEditingAbout(false);
  }

  function handleStartEditPersonal() {
    setSaveMessage("");
    setEditingPersonal(true);
  }

  function handleCancelEditPersonal() {
    const extra = readExtraProfile();
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: user.email || "",
      phone: extra.phone || "",
      department: extra.department || "",
      yearOrSection: extra.yearOrSection || "",
      interests: extra.interests || "",
      bio: extra.bio || ""
    });
    setSaveMessage("");
    setEditingPersonal(false);
  }

  function handleStartEditAcademic() {
    setSaveMessage("");
    setEditingAcademic(true);
  }

  function handleCancelEditAcademic() {
    const extra = readExtraProfile();
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: user.email || "",
      phone: extra.phone || "",
      department: extra.department || "",
      yearOrSection: extra.yearOrSection || "",
      interests: extra.interests || "",
      bio: extra.bio || ""
    });
    setSaveMessage("");
    setEditingAcademic(false);
  }

  function handleStartEditInterests() {
    setSaveMessage("");
    setEditingInterests(true);
  }

  function handleCancelEditInterests() {
    const extra = readExtraProfile();
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      email: user.email || "",
      phone: extra.phone || "",
      department: extra.department || "",
      yearOrSection: extra.yearOrSection || "",
      interests: extra.interests || "",
      bio: extra.bio || ""
    });
    setSaveMessage("");
    setEditingInterests(false);
  }

  function handleSaveProfile(event) {
    event.preventDefault();

    if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
      setSaveMessage("First name and last name are required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(profileForm.email.trim())) {
      setSaveMessage("Please enter a valid email.");
      return;
    }

    const updatedUser = {
      ...user,
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      username: profileForm.username.trim(),
      email: profileForm.email.trim()
    };

    const extraProfile = {
      phone: profileForm.phone.trim(),
      department: profileForm.department.trim(),
      yearOrSection: profileForm.yearOrSection.trim(),
      interests: profileForm.interests,
      bio: profileForm.bio.trim()
    };

    setUser(updatedUser);
    localStorage.setItem("cc_user", JSON.stringify(updatedUser));
    localStorage.setItem(EXTRA_PROFILE_KEY, JSON.stringify(extraProfile));
    setSaveMessage("Profile saved for this device.");
    setEditingAbout(false);
    setEditingPersonal(false);
    setEditingAcademic(false);
    setEditingInterests(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#eef6ff_36%,#e9f4ff_100%)] p-3 md:p-6">
        <div className="mx-auto max-w-[1100px] px-5 py-8 text-[#5a6f86] md:px-8">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#eef6ff_36%,#e9f4ff_100%)] text-[#1f3149]">
      <header className="w-full flex flex-wrap items-center justify-between gap-4 border-b border-[#d7e5f1] bg-white/85 px-4 py-4 shadow-[0_14px_30px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-8">
        <div className="flex items-center gap-3">
          <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-12 w-auto" />
          <div className="leading-tight">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1aa395]">Student</p>
            <h1 className="font-display text-3xl font-extrabold text-[#16263a] md:text-4xl">Profile</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="rounded-xl border border-[#c8d5e3] bg-white px-4 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#0ea59680] hover:text-[#0e8f84]"
          >
            Dashboard
          </button>
          {!editingAbout && !editingPersonal && !editingAcademic && !editingInterests && (
            <button
              type="button"
              onClick={handleStartEditPersonal}
              className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
            >
              Edit profile
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-[#f0c7c2] bg-white px-4 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff1ef]"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-6 md:py-8 animate-fadeUp">

        {saveMessage && (
          <p className="mt-4 rounded-xl border border-[#d6e7f4] bg-white/85 px-4 py-3 text-sm text-[#39506b] shadow-[0_8px_18px_rgba(30,53,79,0.08)]">
            {saveMessage}
          </p>
        )}

        <main className="mt-6 flex flex-col gap-6">
          <section className="rounded-[1.5rem] border border-[#d7e5f1] bg-white/85 px-5 py-6 shadow-[0_14px_30px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-6">
            <div className="flex flex-col items-center border-b border-[#e6eef6] pb-6 text-center">
              <div className="relative mb-4">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0e8f84,#36cfc0)] text-5xl font-bold text-white shadow-[0_10px_30px_rgba(22,159,145,0.22)]">
                  {profileInitial}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#169f91] shadow-lg transition hover:bg-[#0e8f84] hover:scale-110"
                  title="Edit profile photo"
                >
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
              <div>
                <h2 className="font-display text-3xl font-bold text-[#16263a]">{displayName}</h2>
                <p className="mt-1 text-sm text-[#5f748a]">{profileForm.email || "No email available"}</p>
              </div>
            </div>

            {editingAbout ? (
              <form className="mt-6 grid gap-4" onSubmit={handleSaveProfile}>
                <label className="text-sm text-[#3c5269]">
                  Bio
                  <textarea
                    name="bio"
                    value={profileForm.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  />
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditAbout}
                    className="rounded-xl border border-[#c8d5e3] bg-white px-4 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#9bb5cf]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : editingPersonal ? (
              <form className="mt-6 grid gap-4" onSubmit={handleSaveProfile}>
                <label className="text-sm text-[#3c5269]">
                  First name
                  <input
                    name="firstName"
                    value={profileForm.firstName}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  />
                </label>
                <label className="text-sm text-[#3c5269]">
                  Last name
                  <input
                    name="lastName"
                    value={profileForm.lastName}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  />
                </label>
                <label className="text-sm text-[#3c5269]">
                  Username
                  <input
                    name="username"
                    value={profileForm.username}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  />
                </label>
                <label className="text-sm text-[#3c5269]">
                  Email
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  />
                </label>
                <label className="text-sm text-[#3c5269]">
                  Phone
                  <input
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleInputChange}
                    className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                  />
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditPersonal}
                    className="rounded-xl border border-[#c8d5e3] bg-white px-4 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#9bb5cf]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 grid gap-6">
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#149a8e]">About</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5f748a]">
                    {profileForm.bio || "No bio added yet. Click Edit profile to add a short introduction."}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEditAbout}
                      className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                    >
                      Edit
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#149a8e]">Personal details</h3>
                  <div className="mt-3 divide-y divide-[#e6eef6] rounded-xl border border-[#e1ebf4] bg-white/80 px-3">
                    {personalFields.map((field) => (
                      <div key={field.label} className="grid grid-cols-1 gap-1 py-3 text-sm md:grid-cols-[180px_1fr] md:items-center">
                        <p className="font-semibold text-[#5f748a]">{field.label}</p>
                        <p className="break-words text-[#1f3149]">{field.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEditPersonal}
                      className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                    >
                      Edit
                    </button>
                  </div>
                </section>
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[1.5rem] border border-[#d7e5f1] bg-white/85 px-5 py-6 shadow-[0_14px_30px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#149a8e]">Academic details</h3>
              {editingAcademic ? (
                <form className="mt-6 grid gap-4" onSubmit={handleSaveProfile}>
                  <label className="text-sm text-[#3c5269]">
                    Department
                    <input
                      name="department"
                      value={profileForm.department}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    />
                  </label>
                  <label className="text-sm text-[#3c5269]">
                    Year / Section
                    <input
                      name="yearOrSection"
                      value={profileForm.yearOrSection}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditAcademic}
                      className="rounded-xl border border-[#c8d5e3] bg-white px-4 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#9bb5cf]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mt-3 space-y-3 text-sm">
                    {academicFields.map((field) => (
                      <div key={field.label}>
                        <p className="font-semibold text-[#5f748a]">{field.label}</p>
                        <p className="mt-1 break-words text-[#1f3149]">{field.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEditAcademic}
                      className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-[1.5rem] border border-[#d7e5f1] bg-white/85 px-5 py-6 shadow-[0_14px_30px_rgba(30,53,79,0.08)] backdrop-blur-sm md:px-6">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#149a8e]">Interests</h3>
              {editingInterests ? (
                <form className="mt-6 grid gap-4" onSubmit={handleSaveProfile}>
                  <label className="text-sm text-[#3c5269]">
                    Interests (comma separated)
                    <input
                      name="interests"
                      value={profileForm.interests}
                      onChange={handleInputChange}
                      className="mt-2 w-full rounded-xl border border-[#d2dfeb] bg-white px-3 py-2.5 text-[#1a2a3d] outline-none transition focus:border-[#0ea596] focus:ring-2 focus:ring-[#0ea59630]"
                    />
                  </label>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditInterests}
                      className="rounded-xl border border-[#c8d5e3] bg-white px-4 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#9bb5cf]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {interestTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {interestTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[#e9f7f5] px-3 py-1 text-xs font-semibold text-[#0e8f84]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#5f748a]">Add interests from Edit profile to see them here.</p>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleStartEditInterests}
                      className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(22,159,145,0.22)] transition hover:-translate-y-0.5"
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<ProfilePage />);