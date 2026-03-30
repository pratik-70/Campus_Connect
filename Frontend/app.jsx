function App() {
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
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(130deg,#070d20,#0f1c3a)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-24 top-12 h-72 w-72 rounded-full bg-[#3ec5ff2b] blur-3xl animate-glowPulse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-20 bottom-16 h-80 w-80 rounded-full bg-[#27d1a63d] blur-3xl animate-floatSlow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 [background-image:linear-gradient(rgba(202,218,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(202,218,255,0.06)_1px,transparent_1px)] [background-size:42px_42px]"
      />

      <header className="relative z-20 mx-auto mt-4 flex w-[calc(100%-1rem)] max-w-[1200px] items-center justify-between px-4 py-3 md:mt-6 md:w-[calc(100%-2rem)] md:px-6">
        <a href="index.html" aria-label="Campus Connect Home" className="-ml-4 inline-flex md:-ml-6">
          <img src="campus-connect-logo.svg" alt="Campus Connect" className="h-28 w-auto rounded-md md:h-32" />
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#cddcff] lg:flex">
          <a href="index.html" className="transition hover:text-[#34e5be]">Home</a>
          <a href="#events" className="transition hover:text-[#34e5be]">Events</a>
          <a href="#about" className="transition hover:text-[#34e5be]">About</a>
          <a href="#contact" className="transition hover:text-[#34e5be]">Contact</a>
        </nav>
      </header>

      <main className="relative z-10 mx-auto mt-12 w-[calc(100%-1rem)] max-w-[1200px] pb-16 md:mt-16 md:w-[calc(100%-2rem)] md:pb-20">
        <section className="animate-fadeUp rounded-3xl border border-[#8ab6ff2f] bg-[#0b1a3e73] px-6 py-12 text-center shadow-[0_24px_60px_rgba(3,8,24,0.42)] md:px-12 md:py-16">
          <h1 className="mx-auto mt-5 max-w-[18ch] font-display text-4xl font-bold leading-[1.05] text-[#f3f8ff] md:text-6xl lg:text-7xl">
            Discover, Engage, Belong
          </h1>
          <p className="mx-auto mt-6 max-w-[62ch] text-base leading-8 text-[#b8c9ea] md:text-lg">
            One professional platform for students and organizers to discover events, register quickly, and build meaningful campus experiences.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="signup.html"
              className="rounded-xl bg-[linear-gradient(135deg,#2ad7ae,#55ebcc)] px-6 py-3 text-sm font-semibold text-[#082922] transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Get Started
            </a>
            <a
              href="signin.html"
              className="rounded-xl border border-[#cdddff4d] bg-[#0d1b3a99] px-6 py-3 text-sm font-semibold text-[#d9e6ff] transition hover:-translate-y-0.5 hover:border-[#ffc34d88] hover:text-[#ffc34d]"
            >
              Sign In
            </a>
          </div>
        </section>

        <section id="events" className="mt-14 text-center">
          <div className="mb-7">
            <h2 className="font-display text-3xl font-bold text-[#ecf4ff] md:text-4xl">Why Campus Connect</h2>
            <p className="mt-2 text-[#a9bbde]">Everything needed to run and join events in one place.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#8ab6ff26] bg-[#0d1b3d8c] p-6 text-center">
                <h3 className="font-display text-xl font-semibold text-[#f6faff]">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#a9bbde]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="mt-14 grid gap-6 rounded-3xl border border-[#8ab6ff26] bg-[#0b173672] p-7 text-center md:grid-cols-2 md:p-10">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#ecf4ff]">Built for modern campuses</h2>
            <p className="mt-4 leading-8 text-[#a9bbde]">
              From orientation to final-year showcases, Campus Connect helps institutions create better event experiences with clarity, speed, and participation insights.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#8ab6ff24] bg-[#0f1f4691] p-4">
              <p className="text-3xl font-bold text-[#f4fbff]">500+</p>
              <p className="mt-2 text-sm text-[#a9bbde]">Events hosted each term</p>
            </div>
            <div className="rounded-xl border border-[#8ab6ff24] bg-[#0f1f4691] p-4">
              <p className="text-3xl font-bold text-[#f4fbff]">20K+</p>
              <p className="mt-2 text-sm text-[#a9bbde]">Student registrations</p>
            </div>
            <div className="rounded-xl border border-[#8ab6ff24] bg-[#0f1f4691] p-4 sm:col-span-2">
              <p className="text-3xl font-bold text-[#f4fbff]">98%</p>
              <p className="mt-2 text-sm text-[#a9bbde]">Average event check-in success rate</p>
            </div>
          </div>
        </section>

        <section id="contact" className="mt-14 rounded-3xl border border-[#8ab6ff24] bg-[#0a173772] p-7 text-center md:p-10">
          <h2 className="font-display text-3xl font-bold text-[#ecf4ff]">Contact</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#8ab6ff24] bg-[#0f1f4691] p-4 text-center">
              <p className="text-sm uppercase tracking-[0.12em] text-[#6df4d2]">Email</p>
              <a href="mailto:support@campusconnect.com" className="mt-2 block text-[#dce8ff] hover:text-[#34e5be]">support@campusconnect.com</a>
            </div>
            <div className="rounded-xl border border-[#8ab6ff24] bg-[#0f1f4691] p-4 text-center">
              <p className="text-sm uppercase tracking-[0.12em] text-[#6df4d2]">Phone</p>
              <a href="tel:+911234567890" className="mt-2 block text-[#dce8ff] hover:text-[#34e5be]">+91 12345 67890</a>
            </div>
            <div className="rounded-xl border border-[#8ab6ff24] bg-[#0f1f4691] p-4 text-center">
              <p className="text-sm uppercase tracking-[0.12em] text-[#6df4d2]">Hours</p>
              <p className="mt-2 text-[#dce8ff]">Mon - Fri, 9:00 AM - 6:00 PM</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-[calc(100%-1rem)] max-w-[1200px] border-t border-[#8bb5ff2d] pb-8 pt-10 text-center text-sm text-[#9db0d8] md:w-[calc(100%-2rem)]">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-[#eaf2ff]">Campus Connect</h3>
            <p className="mt-3 max-w-[36ch] leading-7 text-[#a9bbde]">
              Building a connected campus where students discover events, join communities, and grow together.
            </p>
          </div>

          <div>
            <h4 className="font-display text-base font-semibold text-[#eaf2ff]">Quick Links</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="index.html" className="transition hover:text-[#34e5be]">Home</a></li>
              <li><a href="#events" className="transition hover:text-[#34e5be]">Events</a></li>
              <li><a href="#about" className="transition hover:text-[#34e5be]">About</a></li>
              <li><a href="#contact" className="transition hover:text-[#34e5be]">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-base font-semibold text-[#eaf2ff]">Get in Touch</h4>
            <ul className="mt-3 space-y-2">
              <li><a href="mailto:support@campusconnect.com" className="transition hover:text-[#34e5be]">support@campusconnect.com</a></li>
              <li><a href="tel:+911234567890" className="transition hover:text-[#34e5be]">+91 12345 67890</a></li>
              <li>Mon - Fri | 9:00 AM - 6:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[#8bb5ff24] pt-5 text-center text-[#9db0d8]">
          <p>&copy; {new Date().getFullYear()} Campus Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);