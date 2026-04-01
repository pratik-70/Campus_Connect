const { useEffect, useState } = React;

function App() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const highlights = [
    {
      title: "Smart Event Discovery",
      text: "Explore workshops, clubs, competitions, and talks with curated recommendations."
    },
    {
      title: "Frictionless Registration",
      text: "Register in seconds, track your tickets, and get instant confirmation updates."
    },
    {
      title: "Campus-Wide Engagement",
      text: "Bring students, organizers, and communities together through one unified platform."
    }
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(140deg,#fbfdff,#e9f3ff)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-24 top-12 h-72 w-72 rounded-full bg-[#7ee7d24d] blur-3xl animate-glowPulse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-20 bottom-16 h-80 w-80 rounded-full bg-[#9dc8ff57] blur-3xl animate-floatSlow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-28 h-48 w-[28rem] -translate-x-1/2 rounded-full bg-[#6ea8ff30] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 [background-image:linear-gradient(rgba(107,130,160,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(107,130,160,0.08)_1px,transparent_1px)] [background-size:42px_42px]"
      />
      <header className="fixed left-0 top-0 z-50 w-full">
        <div className={`bg-[linear-gradient(180deg,#ffffffea,#f6fbffea)] shadow-[0_10px_24px_rgba(31,49,71,0.1)] ring-1 ring-[#d8e4ef] backdrop-blur transition-all duration-300 ${isScrolled ? "shadow-[0_14px_30px_rgba(31,49,71,0.16)] ring-[#c7d9ea]" : ""}`}>
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-1 md:px-6 md:py-1.5">
          <a href="index.html" aria-label="Campus Connect Home" className="inline-flex shrink-0 items-center gap-3">
            <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-14 w-auto rounded-md md:h-16" />
          </a>

          <nav className="hidden items-center gap-1 rounded-full bg-[#ffffffbf] p-1 text-sm font-semibold text-[#314860] ring-1 ring-[#dce6f0] lg:flex">
            <a href="index.html" className="rounded-full px-4 py-2 text-[#0e8f84]">Home</a>
            <a href="#events" className="rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]">Events</a>
            <a href="#about" className="rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]">About</a>
            <a href="#contact" className="rounded-full px-4 py-2 transition hover:bg-[#ecf7f5] hover:text-[#0e8f84]">Contact</a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="signin.html"
              className="inline-flex rounded-lg border border-[#c8d5e3] bg-[#ffffff] px-3 py-2 text-sm font-semibold text-[#1f3147] transition hover:border-[#0ea59680] hover:text-[#0e8f84] md:px-4"
            >
              Sign In
            </a>
            <a
              href="signup.html"
              className="rounded-lg bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-3 py-2 text-sm font-semibold text-[#ffffff] shadow-[0_8px_16px_rgba(22,159,145,0.2)] transition hover:-translate-y-0.5 hover:brightness-105 md:px-4"
            >
              Get Started
            </a>
          </div>
          </div>
        </div>
      <header className="relative z-20 mx-auto mt-4 flex w-[calc(100%-1rem)] max-w-[1200px] items-center justify-between px-5 py-3 md:mt-6 md:w-[calc(100%-2rem)] md:px-8 md:py-4">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-1 h-px bg-[linear-gradient(90deg,transparent,#95c7ff99,transparent)]" />
        <a href="index.html" aria-label="Campus Connect Home" className="inline-flex items-center">
          <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-24 w-auto rounded-md md:h-28" />
        </a>

        <nav className="hidden items-center gap-8 text-base font-bold text-[#24344a] lg:flex">
          <a href="index.html" className="rounded-full px-3 py-1.5 transition hover:bg-[#ebf6ff] hover:text-[#0e8f84]">Home</a>
          <a href="#events" className="rounded-full px-3 py-1.5 transition hover:bg-[#ebf6ff] hover:text-[#0e8f84]">Events</a>
          <a href="#about" className="rounded-full px-3 py-1.5 transition hover:bg-[#ebf6ff] hover:text-[#0e8f84]">About</a>
          <a href="#contact" className="rounded-full px-3 py-1.5 transition hover:bg-[#ebf6ff] hover:text-[#0e8f84]">Contact</a>
        </nav>
      </header>

      <main className="relative z-10 mx-auto mt-24 w-[calc(100%-1rem)] max-w-[1200px] pb-16 md:mt-28 md:w-[calc(100%-2rem)] md:pb-20">
        <section className="animate-fadeUp relative overflow-hidden rounded-3xl border border-[#cfdeeb] bg-[linear-gradient(180deg,#ffffff,#f5faff)] px-6 py-12 text-center shadow-[0_22px_52px_rgba(26,49,74,0.12)] md:px-12 md:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[26px] border-[#7de4d433]" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 bottom-8 h-24 w-24 rounded-full border-[14px] border-[#74a8ff29]" />

          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#bee7df] bg-[#edfdf9] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#0b857a] md:text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-[#10b7a4]" />
            Student Event Platform
          </p>

          <h1 className="mx-auto mt-5 max-w-[18ch] font-display text-5xl font-extrabold leading-[1.05] text-[#1a2a3d] md:text-7xl lg:text-8xl">
            Discover,
            <span className="bg-[linear-gradient(130deg,#0ea596,#2563eb)] bg-clip-text text-transparent"> Engage</span>,
            <br />
            Belong
          </h1>
          <p className="mx-auto mt-6 max-w-[62ch] text-base font-medium leading-8 text-[#50647d] md:text-lg">
            One professional platform for students and organizers to discover events, register quickly, and build meaningful campus experiences.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#3f5f7f] md:text-sm">
            <span className="rounded-full border border-[#c9dff5] bg-[#eef6ff] px-3 py-1.5">Live Event Feed</span>
            <span className="rounded-full border border-[#bdebe3] bg-[#edfcf7] px-3 py-1.5">Instant Registrations</span>
            <span className="rounded-full border border-[#d6ddff] bg-[#f1f3ff] px-3 py-1.5">Organizer Dashboard</span>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="signup.html"
              className="rounded-xl bg-[linear-gradient(135deg,#169f91,#36cfc0)] px-6 py-3 text-sm font-semibold text-[#ffffff] shadow-[0_12px_24px_rgba(22,159,145,0.28)] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Get Started
            </a>
            <a
              href="signin.html"
              className="rounded-xl border border-[#c8d5e3] bg-[#ffffff] px-6 py-3 text-sm font-semibold text-[#1f3147] shadow-[0_8px_20px_rgba(31,49,71,0.08)] transition hover:-translate-y-0.5 hover:border-[#0ea59680] hover:text-[#0e8f84]"
            >
              Sign In
            </a>
          </div>

          <p className="mt-5 text-sm font-semibold text-[#4f6780]">Trusted by 40+ campuses and 20,000+ students</p>
        </section>

        <section id="events" className="mt-14 text-center">
          <div className="mb-7">
            <h2 className="font-display text-3xl font-bold text-[#22364d] md:text-4xl">
              Why
              <span className="ml-2 bg-[linear-gradient(120deg,#0ea596,#2563eb)] bg-clip-text text-transparent">Campus Connect</span>
            </h2>
            <p className="mt-2 text-[#5b7088]">Everything needed to run and join events in one place.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {highlights.map((item, index) => (
              <article key={item.title} className="group rounded-2xl border border-[#d2dfeb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-6 text-center shadow-[0_10px_28px_rgba(31,49,71,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#9ed8cf] hover:shadow-[0_18px_34px_rgba(31,49,71,0.14)]">
                <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(140deg,#ddf9f4,#dfeeff)] text-[#137e92]">{index + 1}</span>
                <h3 className="font-display text-xl font-semibold text-[#24384e]">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#5f748a]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="mt-14 grid gap-6 rounded-3xl border border-[#d1dfeb] bg-[linear-gradient(180deg,#ffffff,#f6fbff)] p-7 text-center shadow-[0_12px_32px_rgba(31,49,71,0.08)] md:grid-cols-2 md:p-10">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#22364d]">Built for modern campuses</h2>
            <p className="mt-4 leading-8 text-[#5f748a]">
              From orientation to final-year showcases, Campus Connect helps institutions create better event experiences with clarity, speed, and participation insights.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#d4e0eb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4">
              <p className="text-3xl font-bold text-[#22406b]">500+</p>
              <p className="mt-2 text-sm text-[#5f748a]">Events hosted each term</p>
            </div>
            <div className="rounded-xl border border-[#d4e0eb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4">
              <p className="text-3xl font-bold text-[#22406b]">20K+</p>
              <p className="mt-2 text-sm text-[#5f748a]">Student registrations</p>
            </div>
            <div className="rounded-xl border border-[#d4e0eb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4 sm:col-span-2">
              <p className="text-3xl font-bold text-[#22406b]">98%</p>
              <p className="mt-2 text-sm text-[#5f748a]">Average event check-in success rate</p>
            </div>
          </div>
        </section>

        <section id="contact" className="mt-14 rounded-3xl border border-[#d1dfeb] bg-[linear-gradient(180deg,#ffffff,#f6fbff)] p-7 text-center shadow-[0_12px_32px_rgba(31,49,71,0.08)] md:p-10">
          <h2 className="font-display text-3xl font-bold text-[#22364d]">Contact</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#d4e0eb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4 text-center">
              <p className="text-sm uppercase tracking-[0.12em] text-[#129c8f]">Email</p>
              <a href="mailto:support@campusconnect.com" className="mt-2 block text-[#2b435c] hover:text-[#0e8f84]">support@campusconnect.com</a>
            </div>
            <div className="rounded-xl border border-[#d4e0eb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4 text-center">
              <p className="text-sm uppercase tracking-[0.12em] text-[#129c8f]">Phone</p>
              <a href="tel:+911234567890" className="mt-2 block text-[#2b435c] hover:text-[#0e8f84]">+91 12345 67890</a>
            </div>
            <div className="rounded-xl border border-[#d4e0eb] bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-4 text-center">
              <p className="text-sm uppercase tracking-[0.12em] text-[#129c8f]">Hours</p>
              <p className="mt-2 text-[#2b435c]">Mon - Fri, 9:00 AM - 6:00 PM</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto mt-16 w-[calc(100%-1rem)] max-w-[1200px] rounded-3xl border border-[#d3deea] bg-[linear-gradient(180deg,#ffffff,#f5faff)] px-6 pb-8 pt-10 text-sm text-[#5d738a] shadow-[0_14px_36px_rgba(31,49,71,0.08)] md:w-[calc(100%-2rem)] md:px-10">
        <div className="grid gap-10 text-center md:grid-cols-2 md:text-left">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[#23374d]">Campus Connect</h3>
            <p className="mx-auto mt-4 max-w-[36ch] leading-7 text-[#637b93] md:mx-0">
              Building a connected campus where students discover events, join communities, and grow together.
            </p>
          </div>

          <div>
            <h4 className="font-display text-xl font-semibold text-[#23374d]">Get in Touch</h4>
            <ul className="mt-4 space-y-2.5 text-base">
              <li><a href="mailto:support@campusconnect.com" className="transition hover:text-[#0e8f84]">support@campusconnect.com</a></li>
              <li><a href="tel:+911234567890" className="transition hover:text-[#0e8f84]">+91 12345 67890</a></li>
              <li>Mon - Fri | 9:00 AM - 6:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[#d3deea] pt-5 text-center text-[#6a8097]">
          <p>&copy; {new Date().getFullYear()} Campus Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);