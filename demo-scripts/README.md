# Demo Scripts for Multi-Repo Dependency Management

These scripts are designed for live demonstrations or walkthroughs of the producer/consumer dependency workflow.

## Prerequisites

- Java 21+ installed
- All projects (dep-library, dep-consumer, dep-multimodule) in the same parent directory
- Terminal with ANSI color support

## Scripts

### 1. Happy Path Demo (`01-happy-path-demo.sh`)

Demonstrates the normal workflow when everything works correctly:

- Library publishes version 1.0.0 to Maven Local
- Consumer declares dependency on the library
- Consumer's contract tests verify API compatibility
- Application runs successfully

**Run with:**
```bash
./01-happy-path-demo.sh
```

### 2. Breaking Change Demo (`02-breaking-change-demo.sh`)

Demonstrates what happens when a library introduces a breaking change:

- Shows the current working state (v1.0.0)
- Introduces a breaking change (findById parameter type change)
- Publishes as v2.0.0
- Shows consumer tests catching the incompatibility
- Discusses best practices for API evolution

**Run with:**
```bash
./02-breaking-change-demo.sh
```

> **Note:** This script automatically restores the original library files when it exits.

## Interactive Features

Both scripts include:
- **Narrator sections** explaining what's happening
- **Pause points** (press Enter to continue)
- **Color-coded output** for clarity
- **Step-by-step progression** through the workflow

## Customization

You can modify the scripts to:
- Remove pause points for automated runs (remove `pause_for_effect` calls)
- Add additional scenarios
- Adjust the breaking change example
