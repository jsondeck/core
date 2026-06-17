# Security Policy

## Supported Versions

`@jsondeck/core` is pre-1.0. Security fixes are applied to the latest `0.x`
release line. Once 1.0 ships, this policy will list supported major versions.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅        |

## Reporting a Vulnerability

Please report security issues privately rather than opening a public issue.

- Use GitHub's **"Report a vulnerability"** (Security → Advisories) on
  https://github.com/jsondeck/core/security/advisories/new, or
- email the maintainers at **security@jsondeck.dev**.

Include a description, reproduction steps, affected version, and impact. We aim
to acknowledge reports within 5 business days and to ship a fix or mitigation
for confirmed issues as promptly as the severity warrants. Please give us a
reasonable disclosure window before publishing details.

## Security Posture

`@jsondeck/core` is a pure, headless runtime:

- No network, filesystem, or process access.
- No `eval`, `Function`, dynamic `import`, or code generation.
- Deterministic: no randomness, timers, or wall-clock access.
- A single runtime dependency (`zod`) used only for input validation.

The library treats game definitions as **untrusted input** and validates them
structurally and semantically before execution, returning structured errors
rather than throwing on malformed data (`safeCompileGame`). It does not protect
against application-level concerns such as resource exhaustion from extremely
large game definitions supplied by an attacker; callers that accept untrusted
DSL should impose their own size/complexity limits.
