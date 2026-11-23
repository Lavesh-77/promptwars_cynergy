import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { equipment } from "./data";
import type { Equipment, LabState } from "./types";
import { addDays, dateKey, isAvailable, stockCount } from "./lib/scheduler";
import {
  createRequest,
  decideRequest,
  approveWithRelocation,
  initialState,
  loadState,
  transact,
  updateStock,
} from "./lib/store";
import EquipmentArt from "./components/EquipmentArt";
import RequestDialog from "./components/RequestDialog";
import RequestList from "./components/RequestList";
import StockEditor from "./components/StockEditor";
import AISchedulingAssistant from "./components/AISchedulingAssistant";

type View = "discover" | "requests" | "faculty";
export default function App() {
  const [state, setState] = useState<LabState>(() => {
    try {
      return loadState();
    } catch {
      return initialState();
    }
  });
  const [view, setView] = useState<View>("discover");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All resources");
  const [department, setDepartment] = useState("All departments");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const tomorrow = addDays(dateKey(), 1);
  useEffect(() => {
    try {
      loadState();
    } catch {
      setError(
        "Saved demo data is unreadable. Reset the demo to restore sample data.",
      );
    }
    const sync = () => {
      try {
        setState(loadState());
      } catch {
        setError("Unable to read saved demo data. Reset the demo to recover.");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const pending = state.requests.filter((r) => r.status === "pending").length;
  function hasSlots(item: Equipment) {
    return Array.from({ length: 16 }, (_, i) => 540 + i * 30).some((start) =>
      isAvailable(
        state.requests,
        item.id,
        tomorrow,
        start,
        30,
        undefined,
        state.stock,
      ),
    );
  }
  const filtered = equipment.filter(
    (item) =>
      (category === "All resources" || item.category === category) &&
      (department === "All departments" || item.department === department) &&
      (!availableOnly || hasSlots(item)) &&
      `${item.name} ${item.description} ${item.tags.join(" ")} ${item.department}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function mutate(
    update: (s: LabState) => LabState,
    reset = false,
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      setState(await transact(update, reset));
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openRequest(item: Equipment, isConflict = false) {
    setConflict(isConflict);
    setSelected(item);
  }
  async function demoConflict() {
    const success = await mutate((s) => {
      const seed = initialState().requests[0];
      let next = s;
      while (
        isAvailable(
          next.requests,
          "oscilloscope",
          tomorrow,
          600,
          120,
          undefined,
          s.stock,
        )
      ) {
        next = {
          ...next,
          requests: [...next.requests, { ...seed, id: crypto.randomUUID() }],
        };
      }
      return next;
    });
    if (success) openRequest(equipment[1], true);
  }
  const nav = (next: View) => {
    setView(next);
    setNotice("");
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              nav("discover");
            }}
            aria-label="LabLink home"
          >
            <span className="brand-icon">
              <FlaskConical size={23} />
            </span>
            lablink<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Main navigation">
            <button
              className={view === "discover" ? "nav-link active" : "nav-link"}
              onClick={() => nav("discover")}
            >
              <LayoutGrid size={16} />
              Discover
            </button>
            <button
              className={view === "requests" ? "nav-link active" : "nav-link"}
              onClick={() => nav("requests")}
            >
              <CalendarDays size={16} />
              My requests
              {pending > 0 && <span className="nav-count">{pending}</span>}
            </button>
          </nav>
          <button
            className={`faculty-switch ${view === "faculty" ? "selected" : ""}`}
            onClick={() => nav(view === "faculty" ? "discover" : "faculty")}
          >
            <GraduationCap size={18} />
            <span>{view === "faculty" ? "Student view" : "Faculty demo"}</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <div className="demo-banner">
        <ShieldCheck size={14} />
        <span>
          Open campus. Open possibilities.{" "}
          <span className="banner-detail">
            A public demo — no account needed.
          </span>
        </span>
        <span className="local-badge">Browser-local data</span>
      </div>
      <main id="main">
        {error && (
          <div className="global-alert" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}
        {notice && (
          <div className="global-notice" role="status">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}
        {view === "discover" ? (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="hero-kicker">
                  <span />
                  THE WHOLE CAMPUS IS YOUR LAB
                </div>
                <h1>
                  Big ideas deserve
                  <br />
                  the <span>right resources.</span>
                  <svg
                    className="title-underline"
                    width="277"
                    height="13"
                    viewBox="0 0 277 13"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 9C74 1 193 2 273 7"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </h1>
                <p>
                  Discover equipment beyond your department. Book your lab time.
                  <br className="desktop-break" /> Bring your next breakthrough
                  to life.
                </p>
                <div className="hero-actions">
                  <a className="button primary" href="#resources">
                    Explore resources <ArrowDown size={17} />
                  </a>
                  <button
                    className="demo-action"
                    onClick={demoConflict}
                    disabled={busy}
                  >
                    <Sparkles size={17} />
                    Try a scheduling conflict
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="hero-social">
                  <div className="avatar-stack">
                    <span>AS</span>
                    <span>MR</span>
                    <span>JK</span>
                    <span>+</span>
                  </div>
                  <p>
                    Built for curious minds.
                    <br />
                    <strong>Across every department.</strong>
                  </p>
                </div>
              </div>
              <div className="hero-illustration" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <span className="deco-plus plus-one">+</span>
                <span className="deco-plus plus-two">+</span>
                <div className="floating-label label-top">
                  <span className="tiny-icon">
                    <CheckCircle2 size={16} />
                  </span>
                  More access. Less friction.
                </div>
                <div className="hero-equipment">
                  <div className="hero-card-top">
                    <span>YOUR NEXT BIG IDEA</span>
                    <span className="mini-dots">•••</span>
                  </div>
                  <EquipmentArt kind="scope" />
                  <div className="hero-card-bottom">
                    <div>
                      <strong>Ideas, meet possibilities.</strong>
                      <span>One campus. Endless potential.</span>
                    </div>
                    <span className="round-arrow">
                      <ArrowUpRight size={21} />
                    </span>
                  </div>
                </div>
                <div className="floating-label label-bottom">
                  <span className="tiny-icon mint">
                    <CalendarDays size={17} />
                  </span>
                  <div>
                    Less waiting.<strong>More creating.</strong>
                  </div>
                  <span className="floating-tick">
                    <CheckCircle2 size={17} />
                  </span>
                </div>
                <div className="hero-small-chip">
                  <Beaker size={17} />
                  Made for collaboration
                </div>
              </div>
            </section>
            <section
              className="stats-strip"
              aria-label="Campus resource summary"
            >
              <div>
                <span className="stat-icon">
                  <Beaker size={21} />
                </span>
                <p>
                  <strong>
                    12<span> resources</span>
                  </strong>
                  <span>Ready for your next project</span>
                </p>
              </div>
              <div>
                <span className="stat-icon">
                  <GraduationCap size={22} />
                </span>
                <p>
                  <strong>
                    4<span> departments</span>
                  </strong>
                  <span>Connected, not siloed</span>
                </p>
              </div>
              <div>
                <span className="stat-icon">
                  <Clock3 size={21} />
                </span>
                <p>
                  <strong>
                    Smarter<span> scheduling</span>
                  </strong>
                  <span>Fair slots. Fewer conflicts.</span>
                </p>
              </div>
              <div>
                <span className="stat-icon">
                  <Users size={22} />
                </span>
                <p>
                  <strong>
                    One<span> shared campus</span>
                  </strong>
                  <span>Better together, by design</span>
                </p>
              </div>
            </section>
            <section className="catalogue" id="resources">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">FIND YOUR NEXT POSSIBILITY</p>
                  <h2>Good tools. Great potential.</h2>
                  <p className="muted">
                    From your first prototype to your final-year project — find
                    what you need.
                  </p>
                </div>
                <span className="catalogue-label">
                  <span className="green-dot" />
                  Campus resources
                </span>
              </div>
              <div className="search-row">
                <label className="search-input">
                  <Search size={19} />
                  <span className="sr-only">Search equipment</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search equipment, skills, or a project idea…"
                  />
                  {query && (
                    <button
                      className="icon-button"
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </label>
                <label className="department-select">
                  <SlidersHorizontal size={17} />
                  <span className="sr-only">Filter by department</span>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option>All departments</option>
                    {[
                      "Electronics",
                      "Mechanical",
                      "Computer Science",
                      "Biotechnology",
                    ].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </label>
              </div>
              <div className="filter-row">
                <div className="category-tabs" aria-label="Resource categories">
                  {[
                    "All resources",
                    "Development kits",
                    "Lab equipment",
                    "Workstations",
                    "Fabrication",
                  ].map((c) => (
                    <button
                      key={c}
                      className={
                        category === c ? "category-tab active" : "category-tab"
                      }
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c === "All resources" && <LayoutGrid size={14} />}
                      {c}
                    </button>
                  ))}
                </div>
                <label className="availability-filter">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  Available tomorrow
                </label>
              </div>
              <div className="results-label" role="status">
                Showing <strong>{filtered.length}</strong> resources
                <span>Campus hours · 09:00–17:00 daily</span>
              </div>
              <div className="equipment-grid">
                {filtered.map((item) => (
                  <article className="equipment-card" key={item.id}>
                    <div className={`equipment-visual visual-${item.visual}`}>
                      <span className="department-tag">{item.department}</span>
                      <EquipmentArt kind={item.visual} />
                      <span
                        className={`availability-pill ${hasSlots(item) ? "" : "fully-booked"}`}
                      >
                        <span />
                        {hasSlots(item) ? "Slots tomorrow" : "Booked tomorrow"}
                      </span>
                    </div>
                    <div className="equipment-body">
                      <span className="equipment-category">
                        {item.category}
                      </span>
                      <h3>{item.name}</h3>
                      <p className="muted">
                        {stockCount(item.id, state.stock)} units total · 1 unit
                        per booking
                      </p>
                      <p className="equipment-location">
                        <MapPin size={13} />
                        {item.location}
                      </p>
                      <p className="equipment-description">
                        {item.description}
                      </p>
                      <div className="equipment-tags">
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <div className="equipment-footer">
                        <span>
                          <Clock3 size={14} />
                          30 min – 4 hrs
                        </span>
                        <button
                          onClick={() => openRequest(item)}
                          aria-label={`Request access to ${item.name}`}
                        >
                          Request access
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>No matching resources</h3>
                  <p>Try another keyword or department.</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setQuery("");
                      setDepartment("All departments");
                      setCategory("All resources");
                      setAvailableOnly(false);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>
            <section className="how-it-works">
              <div>
                <p className="eyebrow">LESS ADMIN. MORE DISCOVERY.</p>
                <h2>Your idea → your next lab session.</h2>
              </div>
              <div className="steps">
                <div>
                  <span>01</span>
                  <h3>Find your resource</h3>
                  <p>
                    Explore equipment across departments, not just your own.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <h3>Tell us your plan</h3>
                  <p>Share your project, deadline, and preferred lab time.</p>
                </div>
                <div>
                  <span>03</span>
                  <h3>Get the green light</h3>
                  <p>Faculty review fair, conflict-free recommendations.</p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="dashboard-container">
            {view === "faculty" && (
              <div className="faculty-demo-notice">
                <ShieldCheck size={20} />
                <div>
                  <strong>Public demo — simulated faculty approvals</strong>
                  <p>
                    No identity checks. These controls only change this
                    browser’s data, not real campus bookings.
                  </p>
                </div>
              </div>
            )}
            {view === "faculty" && <AISchedulingAssistant state={state} />}
            <RequestList
              state={state}
              faculty={view === "faculty"}
              busy={busy}
              onRelocate={async (id, move) => {
                const saved = await mutate((s) =>
                  approveWithRelocation(s, id, move),
                );
                if (saved)
                  setNotice(
                    "Flexible booking moved and exact-slot request approved together. Both change histories have been updated.",
                  );
                return saved;
              }}
              onDecide={async (id, decision, slot) => {
                if (await mutate((s) => decideRequest(s, id, decision, slot)))
                  setNotice(
                    decision === "approved"
                      ? "Booking approved. The equipment slot is now reserved in this browser."
                      : "Request rejected. No equipment time has been reserved.",
                  );
              }}
            />
            {view === "faculty" && (
              <StockEditor
                state={state}
                busy={busy}
                onSave={async (id, count) => {
                  const saved = await mutate((s) => updateStock(s, id, count));
                  if (saved)
                    setNotice("Equipment stock updated in this browser.");
                  return saved;
                }}
              />
            )}
            <button
              className="button secondary back-button"
              onClick={() => nav("discover")}
            >
              <BookOpen size={17} />
              Browse equipment
            </button>
          </div>
        )}
      </main>
      <footer>
        <div className="footer-top">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              nav("discover");
            }}
          >
            <span className="brand-icon">
              <FlaskConical size={21} />
            </span>
            lablink<span className="brand-dot">.</span>
          </a>
          <p>Resources shared. Possibilities multiplied.</p>
          <span className="footer-note">
            Built for a more connected campus.
          </span>
        </div>
        <div className="footer-bottom">
          <span>LabLink · PromptWars 2026 · Public prototype</span>
          <div>
            <span>No login. No real student data.</span>
            <button onClick={() => setResetConfirm(!resetConfirm)}>
              Reset demo
            </button>
          </div>
        </div>
        {resetConfirm && (
          <div className="reset-confirm">
            <span>Replace all requests in this browser with sample data?</span>
            <button
              className="button secondary small"
              onClick={() => setResetConfirm(false)}
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="button primary small"
              onClick={async () => {
                if (await mutate(() => initialState(), true)) {
                  setResetConfirm(false);
                  setNotice("Demo reset. Sample equipment requests restored.");
                }
              }}
            >
              Confirm reset
            </button>
          </div>
        )}
      </footer>
      {selected && (
        <RequestDialog
          key={selected.id}
          item={selected}
          state={state}
          conflict={conflict}
          onClose={() => setSelected(null)}
          onViewRequests={() => {
            setSelected(null);
            nav("requests");
          }}
          onSubmit={(input) => mutate((s) => createRequest(s, input))}
        />
      )}
    </>
  );
}
