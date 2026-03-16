# GCPro Documentation Index

Welcome to the GCPro documentation. This folder contains all technical documentation, guides, and standards for the project.

## 🚀 Quick Start Guides

### For API Testing
- **[Postman Collection Creation Guide](./POSTMAN-COLLECTION-CREATION-GUIDE.md)** ⭐ START HERE
  - Comprehensive guide to creating accurate Postman collections
  - Step-by-step process to prevent schema mismatches
  - Examples and common mistakes to avoid

- **[Postman Creation Checklist](./POSTMAN-CREATION-CHECKLIST.md)**
  - Printable checklist for creating new collections
  - Verification steps and quality checks
  - Template for consistent collection creation

- **[Postman Quick Reference](./POSTMAN-QUICK-REFERENCE.md)**
  - Quick reference card (keep open while working)
  - Field name mappings and common mistakes
  - Error message diagnostics

### For Development
- **[Bootstrap Guide](../BOOTSTRAP-GUIDE.md)**
  - How to set up initial admin user
  - Solving the chicken-egg permission problem
  - Database seeding instructions

## 📋 Architecture & Standards

### Core Standards
- **[COREKIT-STANDARD.md](./COREKIT-STANDARD.md)**
  - Core infrastructure patterns
  - Guard → Write → Emit → Commit workflow
  - Transaction and outbox service usage

- **[DATABASE-STANDARD.md](./DATABASE-STANDARD.md)**
  - Database naming conventions
  - Schema design principles
  - Migration best practices

- **[WORKFLOW-RULES.md](./WORKFLOW-RULES.md)**
  - Workflow discipline rules
  - Command pattern implementation
  - State transition guidelines

- **[ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md)**
  - System architecture overview
  - Design principles and patterns
  - Plugin boundaries and isolation

- **[PLUGIN-BOUNDARIES.md](./PLUGIN-BOUNDARIES.md)**
  - Plugin isolation rules
  - Cross-plugin communication
  - Dependency management

## 📖 Pillar Development

### Pillar Specification
- **[PILLAR-YAML-SPEC-GUIDE.md](./PILLAR-YAML-SPEC-GUIDE.md)**
  - YAML specification format
  - Schema, commands, and events
  - Complete pillar.v2.yml guide

- **[HOW-TO-CREATE-PILLAR-SPEC.V2.md](./HOW-TO-CREATE-PILLAR-SPEC.V2.md)**
  - Step-by-step pillar creation
  - From business requirements to YAML spec
  - Examples and templates

### Planning & Progress
- **[PILLAR-ROADMAP.md](./PILLAR-ROADMAP.md)**
  - Complete pillar roadmap
  - P0, P1, P2 priorities
  - Implementation timeline

- **[P0-PILLAR-BUILD-PLAN.md](./P0-PILLAR-BUILD-PLAN.md)**
  - P0 foundation pillars
  - Build order and dependencies
  - Current progress tracking

## 🔧 Plugin Documentation

### Mission System
- **[MISSION-IMPLEMENTATION-PLAN.md](./MISSION-IMPLEMENTATION-PLAN.md)**
  - Mission system implementation plan
  - State machines and workflows
  - API endpoints and database schema

- **[MISSION-PILLAR-V1-ANALYSIS.md](./MISSION-PILLAR-V1-ANALYSIS.md)**
  - Analysis of v1 specification
  - Migration to v2 considerations
  - Breaking changes and improvements

- **[MISSION-SPEC-COMPARISON.md](./MISSION-SPEC-COMPARISON.md)**
  - Comparison between v1 and v2
  - Feature differences
  - Upgrade path

- **[MISSION-APIS-SUMMARY.md](./MISSION-APIS-SUMMARY.md)**
  - Complete API endpoint summary
  - Request/response examples
  - Testing scenarios

### Testing Guides
- **[TESTING-PUBLISH-MISSION-API.md](./TESTING-PUBLISH-MISSION-API.md)**
  - How to test mission publishing
  - Sample requests and responses
  - Common issues and fixes

- **[TESTING-APPROVE-SUBMISSION-API.md](./TESTING-APPROVE-SUBMISSION-API.md)**
  - How to test submission approval
  - Reviewer workflow testing
  - Edge cases and validations

## 📊 Database

### Schema Documentation
- **[database/FULL-DDL.md](./database/FULL-DDL.md)** ⭐ SOURCE OF TRUTH
  - Complete database schema
  - All table definitions
  - Indexes and constraints

## 📈 Progress & Summaries

- **[FOUNDATION-IMPLEMENTATION-COMPLETE.md](./FOUNDATION-IMPLEMENTATION-COMPLETE.md)**
  - Foundation implementation summary
  - CoreKit services and patterns
  - Infrastructure setup

- **[FOUNDATION-TESTS-COMPLETE.md](./FOUNDATION-TESTS-COMPLETE.md)**
  - Testing infrastructure
  - Test coverage summary
  - Testing best practices

- **[COMPLETE-IMPLEMENTATION-SUMMARY.md](./COMPLETE-IMPLEMENTATION-SUMMARY.md)**
  - Overall implementation summary
  - All completed features
  - System capabilities

- **[implementation-progress.md](./implementation-progress.md)**
  - Current implementation status
  - Completed vs pending features
  - Next steps

## 🎯 Quick Links by Task

### "I want to create a Postman collection"
1. Read [Postman Collection Creation Guide](./POSTMAN-COLLECTION-CREATION-GUIDE.md)
2. Use [Postman Creation Checklist](./POSTMAN-CREATION-CHECKLIST.md)
3. Keep [Postman Quick Reference](./POSTMAN-QUICK-REFERENCE.md) open

### "I want to create a new pillar"
1. Read [HOW-TO-CREATE-PILLAR-SPEC.V2.md](./HOW-TO-CREATE-PILLAR-SPEC.V2.md)
2. Reference [PILLAR-YAML-SPEC-GUIDE.md](./PILLAR-YAML-SPEC-GUIDE.md)
3. Follow [COREKIT-STANDARD.md](./COREKIT-STANDARD.md) for implementation

### "I want to understand the database schema"
1. Check [database/FULL-DDL.md](./database/FULL-DDL.md) (source of truth)
2. Read [DATABASE-STANDARD.md](./DATABASE-STANDARD.md) for conventions
3. Review entity files in `src/plugins/{plugin}/entities/`

### "I want to implement a new plugin"
1. Read [COREKIT-STANDARD.md](./COREKIT-STANDARD.md)
2. Check [PLUGIN-BOUNDARIES.md](./PLUGIN-BOUNDARIES.md)
3. Follow [WORKFLOW-RULES.md](./WORKFLOW-RULES.md)
4. Reference existing plugins for examples

### "I'm getting API errors"
1. Check [Postman Quick Reference](./POSTMAN-QUICK-REFERENCE.md) error section
2. Verify fields match [database/FULL-DDL.md](./database/FULL-DDL.md)
3. Check DTO files in `src/plugins/{plugin}/dto/`
4. Run [Bootstrap Guide](../BOOTSTRAP-GUIDE.md) if permission errors

### "I want to understand the system"
1. Start with [business-overview.md](./business-overview.md)
2. Read [ARCHITECTURE-PRINCIPLES.md](./ARCHITECTURE-PRINCIPLES.md)
3. Check [PILLAR-ROADMAP.md](./PILLAR-ROADMAP.md) for big picture
4. Review [COMPLETE-IMPLEMENTATION-SUMMARY.md](./COMPLETE-IMPLEMENTATION-SUMMARY.md)

## 📝 Document Categories

### Standards & Conventions
- COREKIT-STANDARD.md
- DATABASE-STANDARD.md
- WORKFLOW-RULES.md
- ARCHITECTURE-PRINCIPLES.md
- PLUGIN-BOUNDARIES.md

### Guides & How-Tos
- **POSTMAN-COLLECTION-CREATION-GUIDE.md** ⭐
- **POSTMAN-CREATION-CHECKLIST.md** ⭐
- **POSTMAN-QUICK-REFERENCE.md** ⭐
- HOW-TO-CREATE-PILLAR-SPEC.V2.md
- PILLAR-YAML-SPEC-GUIDE.md

### Planning & Roadmaps
- PILLAR-ROADMAP.md
- P0-PILLAR-BUILD-PLAN.md
- implementation-progress.md

### Plugin-Specific
- MISSION-IMPLEMENTATION-PLAN.md
- MISSION-PILLAR-V1-ANALYSIS.md
- MISSION-SPEC-COMPARISON.md
- MISSION-APIS-SUMMARY.md

### Testing
- TESTING-PUBLISH-MISSION-API.md
- TESTING-APPROVE-SUBMISSION-API.md

### Progress Reports
- FOUNDATION-IMPLEMENTATION-COMPLETE.md
- FOUNDATION-TESTS-COMPLETE.md
- COMPLETE-IMPLEMENTATION-SUMMARY.md

## 🆕 Recently Added

- **POSTMAN-COLLECTION-CREATION-GUIDE.md** (Mar 16, 2026) - Comprehensive Postman guide
- **POSTMAN-CREATION-CHECKLIST.md** (Mar 16, 2026) - Checklist template
- **POSTMAN-QUICK-REFERENCE.md** (Mar 16, 2026) - Quick reference card

## 🔍 Search Tips

Use these grep commands to find information:

```bash
# Find all mentions of a specific topic
grep -r "topic" docs/

# Find all standards documents
ls docs/*-STANDARD.md

# Find all guides
ls docs/*-GUIDE.md

# Find all testing docs
ls docs/TESTING-*.md
```

## 📞 Need Help?

1. **Search this README** for your task
2. **Check the relevant guide** linked above
3. **Review existing code** in `src/plugins/` for examples
4. **Check git history** for similar implementations
5. **Ask for code review** before finalizing

---

**Last Updated:** March 16, 2026

**Documentation Maintainer:** Development Team

**Contributing:** When adding new documentation, update this README index
