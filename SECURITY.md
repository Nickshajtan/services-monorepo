# Security Policy

This document describes how to report security vulnerabilities in the **HCC Services Platform (polyglot monorepo)** and what you can expect from the maintainer in response.

The repository currently contains shared infrastructure, scripts, and service boilerplate. As the project evolves and new services are added, this policy will continue to apply to all code in this monorepo unless explicitly stated otherwise.

---

## Supported Versions

This is an evolving monorepo and does not yet have formal, tagged releases.

Until a stable `v1.0.0` is published:

- Only the **`main`** branch is considered _actively maintained_.
- Any security fix will typically be applied to `main` and may later be included in tagged releases when versioning is introduced.
- Experimental / feature branches are **not** covered by this policy.

After stable releases exist, this section will be updated to reflect supported versions and maintenance windows.

---

## Reporting a Vulnerability

If you believe you have found a security vulnerability in this repository, **please do not open a public GitHub Issue or Pull Request.**

Instead, use one of the following private channels:

1. **GitHub Security Advisories (preferred)**
   If the repository has security reporting enabled, please use the built-in
   **“Report a vulnerability”** feature on GitHub.

2. **Private contact**
   If you cannot use GitHub’s security reporting, please contact the **[maintainer](mailto:shajtanuch@gmail.com)**
