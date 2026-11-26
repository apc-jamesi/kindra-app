# Local demo, GitHub, and deployment handoff

Read this reference for the post-pitch demo, GitHub sync, or deployment-preparation stage. Preserve established project choices, ownership, authorization, and scope.

Read the primary `FDE_TECH_STACK.md` as directed in SKILL.md before technical work. The standard's applicable quality gates and required engineering deliverables supplement this workflow; a shorter checklist here does not waive them. Readiness must cover each affected independently deployable unit and shared API compatibility.

## Local client demo

1. Read the brief, prototype plan, pitch feedback, existing code, and applicable repository instructions. Reuse the project architecture where practical. Do not turn a small demonstration into an unsolicited production rewrite.
2. Build the agreed journey with synthetic data and actual supplied brand assets. For a new API-backed application, keep frontend and backend independently buildable/runnable/deployable; a shared local command may start both. Put authoritative scoring, authorization, and business invariants in the API, with a documented contract and typed client where applicable. Do not collapse production architecture into a frontend-only implementation merely because the pitch demo is small. A deliberately reduced UI-only demonstration is acceptable only as a clearly scoped demo with the architectural gap documented. Keep simulated login, in-memory/local storage, mocked APIs, and disconnected services clearly labelled in the demo and notes. A demo may work without live credentials, but that is not proof of Neon or Entra integration.
3. Create `DEMO_GUIDE.md` with prerequisites, exact install/run commands, local URL, example data or test identities, a three-minute demonstration, reset steps, how to stop it, integration status, and known limitations. Put project setup instructions in the application's README as appropriate.
4. Start the local server using the available runtime when permitted. Keep it local rather than opening a public tunnel by default. Report the actual URL and whether the process is running. Do not promise that the client can open a localhost address on another computer; screen sharing or demonstrating on the user's computer is sufficient. Document restart commands because the server may not survive a session or app restart.
5. Verify the primary flow and significant validation/error states. Use a browser or appropriate UI tool when available for visual and interactive checks, plus relevant build/type/test commands. If visual inspection or any required check cannot run, record that limitation explicitly. Do not equate a successful server start with a verified client flow.
6. Save observed evidence and limitations in `WORKFLOW_STATUS.md`. Return the URL, guide, what works, and what is simulated. The user can then demonstrate it and provide feedback.

## GitHub sync

The user's chosen organization is `apcdevs-repo`. For Quick Career Navigator, the screenshot appears to list `Quick_Career_Navigator-`; treat that as a candidate until its exact live repository identity is confirmed. Do not invent a repository URL or assume a similarly named repository is the target.

- Inspect the current git repository, remotes, branch, changes, available GitHub tools/CLI, account, and organization permissions. Prefer an adequate connected GitHub tool; otherwise use available CLI access. Do not request tokens in chat. If authentication is missing, complete the local work and identify the exact access step needed.
- Prefer a known existing project repository. If the target is ambiguous, prepare the local changes and ask which repository to use. Once the exact target and scope are established, a request to sync or prepare deployment authorizes committing/pushing those intended changes; do not ask again merely because it writes to GitHub.
- If a new repository is needed, create a private repository with a project-appropriate name when authorized and permitted. Do not change existing visibility or organization settings.
- Review only intended files before staging. Exclude credentials, `.env` values, generated dependencies, real applicant records, exports, and irrelevant client files. Include `.env.example` with names/placeholders and useful synthetic fixtures. Preserve unrelated user changes, do not force-push, and do not overwrite remote history.
- Check the known deployment integration before a push. A push to a connected branch may trigger Vercel automatically. Since production deployment is assigned to IT, use a non-production branch/draft PR according to the repo workflow; never merge or push to the production branch if this would trigger release. If the trigger mapping cannot be established and a push might publish production, finish the local commit and flag the pending safe publication step.
- Verify a successful push and the remote commit identity. Report the actual repository, branch, commit, and PR link when available. If sync fails, report it as pending; do not manufacture a URL or mark the published code current. Draft PRs should summarize behaviour, checks, and remaining admin configuration.

## Prepare for deployment

The trigger is `Prepare for deployment`. The user may write `This is ready for deployment`; interpret it as a request to verify and prepare, never a reason to skip checks. Do not deploy Vercel or send the admin message yourself.

First inspect the current accepted scope and feedback. Run checks appropriate to that project, fix authorized reversible defects, and repeat only affected checks after changes. Record commands, dates, exit status, results, and the exact checked commit. Distinguish executed checks from a checklist that someone still needs to perform.

Assess at least:

- Required journeys and acceptance criteria, including observed UI behaviour.
- Applicable production build, lint/type checks, and meaningful existing tests.
- Required database schema/migrations and synthetic test setup; no destructive production migrations performed as part of preparation.
- Required authentication and authorization, denied-access cases, and whether any demo bypass/mock remains. Entra and Neon must not be described as verified when they have never been exercised. An untested required integration remains a blocker unless the user explicitly scopes the deliverable to a demo.
- Environment variable names, server/client exposure boundaries, ignored secret files, sensitive-data handling, and the intended diff to publish. A scoped check does not justify claiming a comprehensive security audit.
- Brand assets and important responsive layouts against supplied references; record unresolved brand decisions.
- Install/start/build configuration, migration sequence, required IT-owned domain/redirect/environment configuration, post-deploy smoke checks, and practical rollback instructions. Separate rollback of code from recovery of data; do not invent backup/restore guarantees.
- Confirmed repository destination, published branch/commit, and pending CI outcomes where relevant. When remote CI is required, wait for it or mark readiness pending.
- Applicable engineering-standard gates, including independent frontend/backend build and deployment contracts, strict types, compatible OpenAPI, critical unit/integration/contract/end-to-end tests, secret/dependency scanning, environment separation, and review of provider-appropriate IaC. Record significant decisions/deviations in `docs/adr/`, architecture in `docs/architecture.md`, operational/recovery instructions, and scope-appropriate cost/privacy/security assumptions. If staging verification required by the accepted scope is unavailable, report that as pending rather than asserting production readiness. Vercel hosting does not silently waive the IaC requirement; document the accepted provider-specific approach with IT.

Write the following within the project, linking to actual artifacts:

1. `DEPLOYMENT_READINESS.md`: checked commit, scope, observed checks, integration status, blockers, and remaining IT configuration. Use one verdict: `READY FOR IT DEPLOYMENT` or `NOT READY - ACTION REQUIRED`. The ready verdict means the scoped application is validated for IT to deploy; it does not mean production is already live or verified. It requires no unresolved implementation/test/publication blocker. Routine production configuration owned by IT may remain if precisely documented. For a demo-only scope say `READY FOR IT DEPLOYMENT - DEMO ONLY` and prominently identify mocks and prohibit representing it as the completed production application.
2. `DEPLOYMENT.md`: stack-specific prerequisites, environment variable names/placeholders, branch/commit, Vercel build settings where applicable, database migration plan, Entra registration/redirect requirements when applicable, deployment steps, smoke checks, and rollback. Verify current technical instructions against the project's configuration and official documentation. Include no secret values.
3. `.env.example`: align it with actual code; do not guess variable names or overwrite user values.
4. `IT_HANDOFF_MESSAGE.md`: ready-to-copy subject and message containing the verified repo/branch/commit, readiness verdict, checks passed, known limitations, required admin steps, docs, post-deploy verification, and requested URL/status reply. If blocked, make the message an assistance request specifying blockers, not a deployment request. This file is a draft; creating it does not authorize sending it.

Update `WORKFLOW_STATUS.md` with the result. If a check, integration credential, repository permission, or required decision is unavailable, finish all independent work and list precisely what remains. Never replace missing evidence with a passing status.

## Admin-message shape

Subject: Deployment handoff - <project> - <readiness verdict>

Hi IT Team,

Please deploy <project> to Vercel from <verified repository>, branch <branch>, commit <sha>.

Validation: <actual checks and results>.
Configuration required: <variable names, database migration steps, Entra/domain setup as applicable; no secrets>.
Instructions: <real deployment-document location>.
Limitations: <material limitations, or none identified within checked scope>.
After deployment: <specific smoke checks>. Please return the deployed URL and verification status.

Adapt this wording to the actual verdict; do not request deployment when checks are blocked.
