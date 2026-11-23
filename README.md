# LabLink

**A public, no-login campus laboratory sharing prototype for PromptWars 2026.**

Discover 12 resources across four departments, submit a project-based request, resolve scheduling conflicts, and approve a feasible booking through a clearly labelled faculty demo.

Repository: https://github.com/Lavesh-77/promptwars_cynergy

## Run locally

Requires Node.js **24 LTS** and npm. No accounts, database, environment variables, or API keys are needed.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. Production: `npm run build`, then `npm run preview`.

## One-minute evaluator walkthrough

1. Open the public site; no login is required.
2. Search equipment or filter by department and category.
3. Select **Try a scheduling conflict**. Tomorrow’s oscilloscope already has an approved 10:00–12:00 booking.
4. Use a fictional name, a project title, and a short description. Either select a suggested alternative, or submit the conflicting slot for faculty review.
5. Open **Faculty demo**. Review the deadline/fair-share ordered queue. A conflicting preferred slot cannot be approved; select one of the feasible alternatives instead.
6. Observe the approved status. Reload and open **My requests** to verify persistence.
7. **Reset demo** in the footer restores samples after confirmation.

## Implemented

- Responsive resource catalogue with keyword, department, category, and next-day availability filters.
- Project-linked access requests with equipment requirements, date, deadline, duration, and explicit flexibility preference.
- Runtime input validation, bounded text, real calendar date checks, operating-hour checks, past-time checks, 30-day booking horizon.
- Conflict detection, deadline-bounded alternative suggestions, public simulated faculty approval/rejection.
- Fair request ordering: earlier deadline, fewer approved minutes under the same demo name, earlier submission.
- Approval-time revalidation; pending requests do not reserve equipment; approved sessions are never silently moved.
- Browser-local persistence, cross-tab updates, Web Locks for approval serialization on supported browsers, explicit demo reset and storage error recovery.
- Native modal focus trapping, labelled fields, keyboard focus styles, skip link, reduced-motion support, textual status indicators.
- Unit/integration tests, Playwright desktop/mobile workflows and accessibility checks, main-only deployment workflow.

## Architecture

```text
React UI → Zod request validation → deterministic scheduling → browser-local store
             src/lib/scheduler.ts                    src/lib/store.ts
```

- `src/data.ts`: synthetic catalogue and access requirements.
- `src/components/`: resource illustrations, request modal, faculty/student request list.
- `src/lib/scheduler.ts`: pure overlap/availability, slot recommendation, and fairness functions.
- `src/lib/store.ts`: validated storage, request lifecycle, approval-time checks, transaction lock.
- `src/App.tsx`: navigation, catalogue filters, state coordination.
- `e2e/`: browser workflow, concurrency, mobile layout and axe accessibility tests.

**Scheduling policy:** daily 09:00–17:00, 30-minute increments, 30-minute to four-hour sessions. Dates use the browser's local wall-clock timezone as the demo campus timezone. Alternatives fit the entire session before the project deadline, preferring the requested day and nearby times. Exact-slot requests are not automatically moved. Faculty retain discretion; queue ranking is advisory, not forced preemption.

## Important limitations — not a production booking system

- **No generative AI is integrated.** Recommendations are deterministic and labelled honestly. GenAI was explicitly deferred until a provider account/key is available. This does **not yet fulfil the statement's GenAI requirement**.
- **Requests are not shared across users/devices.** They belong to this browser and origin. “My requests” also includes seeded projects; no identity is verified.
- Faculty approvals are public, simulated demo controls, not authorisation. Use fictional data only.
- Fairness uses display names and can be bypassed by changing a name. Requirements are advisory, not verified certifications.
- Web Locks serialize cooperating tabs on supported browsers. Without Web Locks, cross-tab atomicity is not guaranteed. Local storage can always be manually edited.
- A real campus rollout needs a server-side database with atomic booking constraints, faculty authorisation, verified student identity, fixed campus timezone, policy enforcement, rate limits, and audit records.
- Google Fonts is optional; system sans-serif fallbacks keep the application usable offline. There are no required remote data services.

## Verification

```bash
npm test                       # scheduler, validation, persistence, UI integration
npm run build                  # strict TypeScript + production bundle
npm run format:check
npm audit
npx playwright install chromium
npm run test:e2e                # desktop + mobile, accessibility, cross-tab checks
```

Browser installation requires access to Playwright's CDN. Automated browser tests must be reported separately from passing unit/integration tests if that download is unavailable.

## Public deployment — main only

The GitHub Actions workflow builds, tests, and publishes an artifact to **GitHub Pages**, without creating a `gh-pages` branch.

1. Push the project to `main` in `Lavesh-77/promptwars_cynergy`.
2. Repository **Settings → Pages → Source: GitHub Actions**.
3. Run **Check and deploy LabLink**, or push a change to `main`.
4. Expected address after successful deployment: https://lavesh-77.github.io/promptwars_cynergy/

Alternatively import the repository into Vercel. Framework: Vite; build: `npm run build`; output: `dist`. No secrets or environment variables are required. Ensure deployment protection is off for the evaluator's URL.

## Evaluation alignment

| Criterion         | Evidence                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Code quality      | Strict TypeScript; isolated scheduler/store; reusable components; formatting and documented policy                                 |
| Security          | No secrets; bounded validated input; React-escaped output; no HTML injection; honest public-demo boundary                          |
| Efficiency        | Small static deployment; bounded catalogue and 30-day search; no unnecessary network/AI calls                                      |
| Testing           | Scheduling edge cases, request lifecycle, corrupted storage recovery, UI workflows; browser test suite                             |
| Accessibility     | Semantic headings, labelled forms, native modal, skip link, keyboard focus, reduced motion, axe checks                             |
| Problem alignment | Cross-department discovery, project access, faculty demo, deadline-aware conflict resolution; GenAI and shared storage remain gaps |

## Next priorities

1. Verify the deployed public user journey and accessibility.
2. Add a shared database and real atomic booking protection if multi-user persistence becomes required.
3. Add optional server-side GenAI project-to-equipment matching and explanations using only validated catalogue IDs and feasible slots. Never place a provider key in a `VITE_*` variable.
4. Add a utilisation view if time remains; no chart library is necessary.
