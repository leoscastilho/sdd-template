.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help setup spec-lint spec-index spec-drift spec-audit spec-dashboard security-scan

help: ## Show available checks
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-16s %s\n", $$1, $$2}'

setup: ## Install the local hook and check required tools
	@git config core.hooksPath .githooks
	@command -v bash >/dev/null || { echo "bash is required"; exit 1; }
	@command -v git >/dev/null || { echo "git is required"; exit 1; }
	@command -v make >/dev/null || { echo "make is required"; exit 1; }
	@command -v node >/dev/null || echo "note: node is needed for the dashboard"
	@echo "ok: SDD checks are ready"

spec-lint: ## Validate spec frontmatter and references
	@scripts/spec/lint.sh

spec-index: ## Regenerate the spec catalog
	@scripts/spec/index.sh > specs/INDEX.md
	@echo "wrote specs/INDEX.md"

spec-drift: ## Check changed code has an updated governing spec
	@scripts/spec/drift.sh

spec-audit: ## Find unclaimed code and dangling implements globs
	@scripts/spec/audit.sh

spec-dashboard: ## Render the local spec dashboard (NO_OPEN=1 skips opening)
	@mkdir -p specs/__generated__
	@node scripts/spec/dashboard.mjs > specs/__generated__/dashboard.html
	@if [ -z "$$NO_OPEN" ] && command -v open >/dev/null 2>&1; then open specs/__generated__/dashboard.html; fi

security-scan: ## Run the heuristic security scan
	@scripts/security/quick-scan.sh --all

