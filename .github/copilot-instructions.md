# Copilot Instructions
- Follow MEDIArate architectural baseline v1.1.1
- Use hexagonal architecture strictly
- No "any" types allowed
- Every module must have unit, integration, and e2e tests
- Run full quality cycle before committing
- **Read docs/PADROES_DESENVOLVIMENTO.md before planning or coding** — it is the
  single source of dev criteria (PRD, UML, RBAC, RLS, secrets, feature flags,
  error reporting, tests, security gate, WAF/rate-limit, TLS/HSTS, observability,
  motion design, SEO/AEO/AIO/GEO, Zero Trust) and the Issue→PR workflow.
- Every task (fix, improvement, feature) must have a GitHub Issue BEFORE code;
  work in a branch; the PR must mention the Issue (`Closes #NN`) in its description.
- Test first: create the test, confirm it fails, fix only the root cause, run the
  new test + related suite.
