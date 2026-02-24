# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-02-21

### Added

- Company employee roster: positions with `is_current`, `show_on_company_page`, `started_at`, `ended_at`
- Featured workers per company
- Position visibility API and worker dashboard toggle
- HR dashboard: onboarding, pending positions, verification events
- Company memberships and HR profiles
- Rate limiting table and RPC
- Position roster UPDATE hardening: workers and admins restricted to roster fields only

### Changed

- RLS policies for positions, company roster, featured workers
- SELECT policy for roster-visible positions
