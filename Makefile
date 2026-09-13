# Stack-neutral SDD tools. Add application commands after recording your stack decisions.
.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help setup check test lint spec-lint spec-index spec-drift spec-audit spec-dashboard security-scan security-report

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Check tool prerequisites and install local Git hooks (no app dependencies)
	@for tool in git node bash; do command -v $$tool >/dev/null || { echo "missing prerequisite: $$tool"; exit 1; }; done
	@node -e 'if (+process.versions.node.split(".")[0] < 18) { console.error("Node 18 or newer is required"); process.exit(1); }'
	git config core.hooksPath .githooks
	@echo "ok: Git hooks installed; no application stack selected"
	@command -v jq >/dev/null || echo "optional: install jq to use the Claude Code hooks"

check: lint spec-drift spec-audit test ## Validate the starter and run tooling regression tests

lint: spec-lint security-scan ## Validate specs and scan for common security patterns

test: ## Run isolated tooling fixture tests (no application dependencies)
	node --test scripts/test/tooling.test.mjs

spec-lint: ## Validate spec frontmatter, ids and references
	scripts/spec/lint.sh

spec-index: ## Regenerate specs/INDEX.md from frontmatter
	@mkdir -p specs
	@scripts/spec/index.sh > specs/INDEX.md && echo "wrote specs/INDEX.md"

spec-drift: ## Report code changes not reflected in their governing specs
	scripts/spec/drift.sh

spec-audit: ## Audit traceability, missing implementations and spec validity
	scripts/spec/audit.sh

spec-dashboard: spec-lint ## Render a local HTML dashboard; NO_OPEN=1 skips opening
	@mkdir -p specs/__generated__
	@node scripts/spec/dashboard.mjs > specs/__generated__/dashboard.html && echo "wrote specs/__generated__/dashboard.html"
	@if [ -z "$$NO_OPEN" ] && command -v open >/dev/null 2>&1; then open specs/__generated__/dashboard.html; fi

security-scan: ## Run heuristic checks; use the security-audit skill for a full review
	scripts/security/quick-scan.sh --all

security-report: ## Open the newest local audit report; NO_OPEN=1 skips opening
	@f="$$(ls -t reports/security/*.html 2>/dev/null | head -1)"; \
	if [ -z "$$f" ]; then echo "no report yet — run the security-audit skill"; exit 1; fi; \
	echo "$$f"; \
	if [ -z "$$NO_OPEN" ] && command -v open >/dev/null 2>&1; then open "$$f"; fi
