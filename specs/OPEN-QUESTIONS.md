# Open questions

Everything not yet decided. Each entry has a recommendation so the user can decide quickly with `/decide Qn`. **An agent never resolves one of these by picking silently.** "Blocks" means the listed specs cannot leave `draft` (or be implemented) until decided. **Nothing below blocks M0 (v1).**

Ordering is by how early the decision is needed.

### Q4 — Source of the page count in the status strip
**Context:** The strip shows `COMPILADO • 1/2 • 412 ms`. The page total currently comes from react-pdf's `onLoadSuccess({ numPages })` in the browser (ARCH-FRONTEND-SHELL §5), so it is known only after the PDF is parsed client-side and it is not available to the API or to REST clients. The Go service could read the page count from the PDF (`/Type /Pages … /Count N`) or from `main.log` (`Output written on main.pdf (2 pages`) and return it as `X-Pages`, and the WS `compiled` message could carry `pages`.
**Recommendation:** keep `onLoadSuccess` for v1 (zero extra parsing, always consistent with what is rendered). Add `X-Pages` from the log line and `pages` in `compiled` only if a non-browser consumer needs it (M5 signatures may).
**Blocks:** nothing. **Affects:** F-DOCUMENT-EDITOR, C-WS-MESSAGES, C-LATEX-RENDER-API.

### Q5 — Electronic signature / ICP-Brasil in the future
**Context:** Today the document is printed, signed and stamped. Courts and institutions increasingly accept digitally signed PDFs; CFP resolutions allow electronic documents with a qualified signature (ICP-Brasil A1/A3) or gov.br signature. Signing requires a certificate on the psychologist's machine or a cloud HSM, a PAdES signer, and a stored final PDF — none of which exist (PDFs are never stored, ARCH-DATA-MODEL).
**Recommendation:** M5 at the earliest, as a separate feature: "finalise" a document into an immutable `documents` row with the PDF bytes (encrypted like drafts), then sign client-side with a browser extension/desktop signer (gov.br or a PKCS#11 bridge) and store the signed PDF. Do not embed private keys server-side. Until then the signature block stays a physical one.
**Blocks:** nothing. **Affects:** ARCH-DATA-MODEL (`documents`), ARCH-SECURITY, F-DOCUMENT-EDITOR ("Finalizar" action), ROADMAP M5.

### Q9 — Network-level egress block for the render sandbox
**Context:** ARCH-SECURITY wanted `latex` on an `internal: true` Compose network. On the Easypanel host (Docker 29.0.0) the embedded DNS resolver does not answer for service names/aliases on internal networks (verified 2026-09-12: IP connectivity fine, name resolution fails), which broke `migrate → psico-db`. The `internal` network is now a plain bridge; `latex` still opens no sockets (`--only-cached`, `--untrusted`, `cap_drop ALL`).
**Options:** (a) wait for a Docker fix and re-enable `internal: true`; (b) static `ipv4_address` for db/latex on an internal network and reference by IP; (c) an iptables `DOCKER-USER` rule on the host dropping egress from the latex bridge.
**Recommendation:** (a), re-test on the next Docker Engine release; (c) is a one-line hardening the operator can apply today.
**Blocks:** nothing. **Affects:** ARCH-INFRA §8, ARCH-SECURITY §2.

### Q12 — Cross-user invite rotation
**Context:** ARCH-AUTH §3/§14 keep one invite row per e-mail and let any signed-in user re-invite it, which rotates the token and moves the row to the new inviter — a colleague's pending link dies silently (2026-09-12 security audit, low). There are no roles (ADR-0023), so every user is trusted; still, the write path bypasses the owner scoping that `DELETE /api/invites/:id` enforces.
**Recommendation:** answer 409 `invite_pending` when the pending invite belongs to another user; only the original inviter (or an expired/accepted row) rotates. Contract + copy change ("Este e-mail já foi convidado por outra pessoa.").
**Blocks:** nothing. **Affects:** ARCH-AUTH §14, F-AUTH (Convites box copy), C-OPENAPI.

### Q14 — Blur granularity in multi-value editors (F-LATEX-COMPILE-PERF)
**Context:** ADR-0032 moves the compile trigger to field blur. The professionals, sections and references editors have several sub-fields per row; leaving one sub-field for another within the same group should not each fire a compile.
**Recommendation:** detect "leaving the group" with a group-level `focusout` (relatedTarget outside the group) so a group exit yields one compile; if that proves awkward in the existing editors, rely on ADR-0004 latest-wins coalescing to collapse per-sub-field blurs. Not blocking — both satisfy the acceptance criteria.
**Blocks:** nothing. **Affects:** F-LATEX-COMPILE-PERF.

### Q15 — Identical-tex comparison key (F-LATEX-COMPILE-PERF)
**Context:** ADR-0032 skips a compile when the freshly rendered tex is byte-identical to the displayed PDF's tex. The client can hold either the full tex string or a hash of it, in memory only (never logged/persisted).
**Recommendation:** a hash (cheap, small); either is acceptable. Not blocking.
**Blocks:** nothing. **Affects:** F-LATEX-COMPILE-PERF.

### Q20 — AI filling provider/model and evaluation gate
**Context:** F-AI-DOCUMENT-FILLING proposes a cheap, fast field-mapping call with slight Portuguese grammar/tone correction. GPT-5.4 nano without reasoning is the initial candidate, not an accepted provider decision.
**Recommendation:** evaluate it on anonymized fixtures covering all six types, missing/ambiguous facts and meaning preservation; record model choice and measurable quality/latency/cost acceptance thresholds via `$decide` before implementation.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** C-OPENAPI, ARCH-API-CONVENTIONS.

### Q21 — AI provider retention and data-use controls
**Context:** The application will not persist or log pasted source, but external processing exposes clinical text to the provider. Provider retention and data-use configuration have not been verified.
**Recommendation:** verify non-training terms and the shortest available retention; document residual retention and required account/settings configuration rather than claiming zero retention from application non-persistence. Resolve before clinical requests or implementation.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** ARCH-SECURITY, ARCH-API-CONVENTIONS.

### Q22 — AI ambiguity review presentation
**Context:** Ambiguous information must be flagged rather than guessed; the brief leaves presentation and field association unresolved.
**Recommendation:** an ephemeral pt-BR review list with links to affected fields and unassigned excerpts where mapping is uncertain. Do not persist the review list or transcript; keep guessed values out of the form.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** F-DOCUMENT-EDITOR.

### Q23 — AI filling UI copy, placement and transient state lifecycle
**Context:** The agreed flow needs a paste input, replacement warning, loading/error/retry states and precise transient-state handling.
**Recommendation:** an editor-local panel with “Preencher com IA”; disable whitespace-only submission; confirm with “Substituir conteúdo” and “Cancelar”; state that finalidade is replaced while timbre/location are kept. Use “Organizando texto…” and a retryable failure message. Clear transient source/review state on leaving the editor. Final protected-field copy depends on Q24; follow the Caderneta surface brief and DESIGN.md.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** F-DOCUMENT-EDITOR, ARCH-FRONTEND-SHELL.

### Q24 — AI filling complete protected-field and replacement scope
**Context:** The user explicitly preserves timbre and location and replaces finalidade. The registry separately defines autoria and issue date, plus professionals/references and values retained for inactive types; these details were not explicitly decided.
**Recommendation:** preserve timbre/letterhead, cidade, autoria and data; replace applicable clinical fields (including finalidade), sections and collections; leave inactive-type retained values untouched. Approve an explicit field/group matrix before implementation.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** F-DOCUMENT-EDITOR, F-LETTERHEAD-PROFILE, C-DOCUMENT-TYPES.

### Q25 — AI filling stale responses and edits during processing
**Context:** Keeping fields intact during processing does not determine what happens when the user edits or changes type/draft before a response arrives. Applying the original confirmation to newer work could lose edits.
**Recommendation:** discard responses when the editor revision, type or draft has changed and show a retry message; never apply a response to another document or silently replace newer edits.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** F-DOCUMENT-EDITOR.

### Q26 — AI mapping HTTP contract and operational limits
**Context:** The existing API has no specified AI mapping operation; raw-input size, output schema, timeout and request-rate limits are undecided. Registry V21–V22 constrain resulting values, not the raw transcript request.
**Recommendation:** one synchronous authenticated operation under existing CSRF/error conventions, strict registry-derived output validation, bounded input/output and timeout, per-user rate limiting, and no background queue. Choose concrete limits and record request/response/error shapes in C-OPENAPI and its YAML before code.
**Blocks:** F-AI-DOCUMENT-FILLING approval. **Affects:** C-OPENAPI, ARCH-API-CONVENTIONS, ARCH-SECURITY.

### Q28 — M2 patient-to-document identification mapping
**Context:** Structured documents expose identification fields, but their labels and semantics vary; in parecer, `atendido` means “Objeto do questionamento”, and a patient is not automatically the requester. Simple documents have no Identificação box.
**Recommendation:** approve a per-type mapping against C-DOCUMENT-TYPES, always including the patient's name where patient identification is applied; populate only declared fields and never infer the requester or the parecer's object from the patient link alone.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** F-DOCUMENT-EDITOR, C-DOCUMENT-TYPES.

### Q29 — Citar Paciente: CPF and exact phrase
**Context:** The initial example included name and CPF. The user clarified that the name must appear in the document because CPF is not recognizable to the psychologist; whether CPF accompanies the name remains open.
**Recommendation:** use the patient's name as the default citation and agree whether CPF is an optional addition. Approve exact wording and grammatical agreement; never insert CPF alone or invent a missing identifier.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** F-DOCUMENT-EDITOR, C-DOCUMENT-TYPES.

### Q30 — Citar Paciente: placement, supported targets and empty state
**Context:** The button belongs beside “Citar Referência”, but supported fields/types and behavior without a selected patient or usable name are unresolved.
**Recommendation:** place “Citar Paciente” in the section toolbar, including simple-document body sections; disable it without a selected named patient and explain how to select one. Confirm the complete target matrix and pt-BR copy before approval.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** F-DOCUMENT-EDITOR, F-EDITOR-VISUAL-REVAMP, ARCH-FRONTEND-SHELL.

### Q31 — Patient citation as copied text or live reference
**Context:** The brief recommends editable text at the cursor but does not decide whether existing citations track subsequent patient changes.
**Recommendation:** insert ordinary editable text at the cursor as a snapshot; changes to the patient record do not rewrite existing documents. Avoid introducing a new mini-markup token unless a live-reference requirement is explicitly approved.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** F-DOCUMENT-EDITOR, C-DOCUMENT-TYPES, F-DOCUMENT-DRAFTS.

### Q32 — Patient prefill and document lifecycle conflicts
**Context:** Prefill must coexist with manual edits, switching patient/type, restoring drafts and later patient-record updates. The existing editor does not copy identification between types and gives restored drafts precedence.
**Recommendation:** preserve existing lifecycle rules; apply initial prefill to empty mapped fields and require an explicit reviewed replacement for populated identification when changing patient. Restore saved content without silently refreshing it from the registry. Define handling of the previous responsible person and citations so documents cannot silently mix patients.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** F-DOCUMENT-EDITOR, F-DOCUMENT-DRAFTS, C-OPENAPI.

### Q33 — Patient selection and prefill transient states
**Context:** The brief requires empty/loading/error behavior but leaves exact presentation, retry and stale-response handling undecided.
**Recommendation:** show loading in the selector, preserve document values until successful application, show a retryable pt-BR error, and discard results when the patient, draft, type or document revision changed. Approve copy and the behavior for deleted or inaccessible patients.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** F-DOCUMENT-EDITOR, ARCH-FRONTEND-SHELL, C-OPENAPI.

### Q34 — M2 patient/responsible data policy and foundation
**Context:** M2 has no F-PATIENTS spec yet. Draft encryption and ownership already exist, but patient/responsible access, encrypted fields, search, retention, deletion and effects on linked drafts have not been specified. Draft expiry does not establish patient-record retention.
**Recommendation:** specify the patient foundation before implementing this integration: authenticated owner-scoped access as the initial proposal, encrypted identifying/contact/clinical values, no PII logging, explicit retention and deletion rules including linked drafts. Approve the policy through `$decide`, then define F-PATIENTS, ARCH-DATA-MODEL and C-OPENAPI interfaces before code; do not inherit the 90-day draft TTL for patients.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** ARCH-DATA-MODEL, ARCH-SECURITY, C-OPENAPI, F-DOCUMENT-DRAFTS, future F-PATIENTS.

### Q35 — M2 age evaluation and legal-guardian validation lifecycle
**Context:** ADR-0038 requires a legal guardian for patients under 18, but the source and evaluation date of age, missing/invalid birth dates, validation moments and eighteenth-birthday transition are not specified.
**Recommendation:** use a validated date of birth and calendar age on the patient-save date in the agreed application timezone; prevent completing a patient record with unknown age or a missing guardian when under 18. Define leap-day handling and revalidation on birth-date edits; preserve existing guardian data and document snapshots when the patient turns 18. Confirm the exact rule before implementation.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** ARCH-DATA-MODEL, C-OPENAPI, future F-PATIENTS.

### Q36 — M2 legal-guardian and reference-person field schema
**Context:** ADR-0038 distinguishes both roles and requires a relationship field for the optional reference person. The user has not decided the complete fields, requiredness of relationship, or CPF/contact details proposed earlier.
**Recommendation:** require a name whenever either person is supplied, require the reference person's relationship when that optional record is present, and keep CPF/phone/email optional if needed. Approve the final field list and validation before defining database or API properties; do not treat the earlier suggestions as accepted.
**Blocks:** F-M2-PACIENTES-IDENTIFICACAO approval. **Affects:** ARCH-DATA-MODEL, C-OPENAPI, C-DOCUMENT-TYPES, future F-PATIENTS.

## Resolved

| Q | Resolution |
| --- | --- |
| Q27 | ADR-0038 (2026-09-13): legal guardian required under 18; optional non-legal reference person at any age with a relationship field. Remaining age evaluation and field schema are Q35–Q36. |
| Monorepo tooling | ADR-0001 — pnpm workspaces, Node 20, TypeScript strict, Biome, Vitest, `go test` |
| Frontend stack | ADR-0002 — React 18 + Vite + TypeScript, Zustand, react-pdf |
| API framework | ADR-0003 — NestJS |
| Live compile transport | ADR-0004 — WebSocket via the `ws` adapter, latest-wins coalescing |
| Render engine and isolation | ADR-0005 — Go + Tectonic microservice, compile-only, cache baked at build |
| Where document knowledge lives | ADR-0006 — `packages/shared` owns registry, validation and `renderTex` |
| Database and migrations | ADR-0007 — PostgreSQL 16 + Prisma, migrations as a discrete job |
| Drafts at rest | ADR-0008 — application-layer AES-256-GCM |
| Auth in v1 | ADR-0009 — none; draft id as capability; auth is M1 |
| UI language | ADR-0010 — pt-BR only, no i18n framework |
| Deployment | ADR-0011 — Compose at repo root via Easypanel, no IaC |
| LaTeX source location | ADR-0012 — `services/latex/templates`, original folder removed |
| Design direction and styling | ADR-0013 — Impeccable "Caderneta", plain CSS tokens, no Tailwind/component library |
| Agent workflow | ADR-0014 — orchestrator session plus tiered agents |
| Security process | ADR-0015 — continuous audit with five categories |
| Structure inside free text | ADR-0016 — section mini-markup instead of raw LaTeX |
| Interim access control before M1 auth | ADR-0017 — HTTP Basic Auth gate at the `web` edge (nginx), until M1 ships real auth; **retired 2026-09-13** (ARCH-AUTH §12), ADR-0017 superseded by ADR-0023 |
| Editor split divider minimums | ADR-0019 — 50/50 default, form ≥ 480 px, preview ≥ 360 px, nothing persisted |
| PDF zoom ladder and inputs | ADR-0020 — fit/manual, ladder 50–300 %, wheel + buttons, no keyboard zoom in v1 |
| Markup help popover | ADR-0021 — removed; toolbar teaches the markup, shortcuts on the controls they drive |
| Field fill and border tokens | ADR-0022 — --field #fefdfb, --rule-strong #7c818a, "no white surfaces except the PDF page and text controls" |
| Auth provider for M1 | ADR-0023 — own email+password (argon2id) and Google OIDC behind a Verifier; fixed 24 h server-side cookie sessions in Postgres |
| Drafts list before/after auth | ADR-0024 — stays behind the edge gate until M1, then scoped by owner_id; foreign ids 404; no unscoped list |
| Draft expiry / TTL | ADR-0025 — 90 days after last edit, visible "expira em" + "manter", discrete nightly purge job |
| Treatment of the author | ADR-0026 — users.tratamento (psicóloga / psicólogo / neutro, default neutro), sent in the payload, \tratamento in the class; not a document field |
| SMTP for reset/invite mail | ADR-0027 — optional; nodemailer SMTP when SMTP_URL is set, links shown to the operator/inviter otherwise |
| Account creation | ADR-0028 — invitation-only (any user may invite, 7-day single-use link, password or Google); operator script for the first user; no open sign-up or toggle |
| Q1 | ADR-0029 (2026-09-12): letterheads per user with an encrypted logo; logo shipped as a per-request `assets` entry on `/v1/compile`, PNG/JPEG sniffed, 256 KiB; ships with F-LETTERHEAD-PROFILE (M1.5). |
| Q8 | ADR-0030 (2026-09-12): nginx `real_ip` over `TRUSTED_PROXY_CIDRS` (env, empty locally) resolves the visitor behind Traefik; API keeps `trust proxy 1`; unblocks ARCH-AUTH §12. |
| Q13 | ADR-0031 (2026-09-12): the Basic Auth gate loses its loopback allow (ungated nginx-local `/healthz` for the container healthcheck), `35-real-ip.sh` refuses `/0` prefixes, Cloudflare's ranges join `TRUSTED_PROXY_CIDRS` when the domain is proxied through Cloudflare, forged-header step in the production check. |
| Q19 (multiprofissional seed) | ADR-0036 (2026-09-13) chose a one-time seed from autoria; **superseded by ADR-0037** (2026-09-13) after the implement-time check: `cfpdoc.cls` already prints the psychologist from box-1 autoria, so the professionals list holds co-signers only — no seed. |
| Q18 (show_logo needs a logo) | ADR-0035 (2026-09-13): saving a letterhead with show_logo on and no logo is refused (422); the placeholder never prints on a user document. |
| Q17 (autoria name) | ADR-0034 (2026-09-13): the autoria author name mirrors the account `name`; autoria adds only `crp`/`titulacao` on `users`. |
| Q16 (letterhead selection) | ADR-0033 (2026-09-13): a selector in box 1 pre-set to the user's default; the chosen `letterheadId` is stored on the draft and resolved server-side on compile. |
| Live compile trigger | ADR-0032 (2026-09-13): compile on field blur (not the 600 ms keystroke debounce) and skip an identical rendered tex; amends ADR-0004's trigger, coalescing unchanged. Ships as F-LATEX-COMPILE-PERF. |
