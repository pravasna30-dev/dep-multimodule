#!/bin/bash
#===============================================================================
# NARRATOR DEMO SCRIPT: Breaking Change Scenario
#===============================================================================
# This script demonstrates what happens when the library introduces a
# breaking change and how the consumer's tests detect it.
#
# SCENARIO: Library v2.0.0 changes findById(Long) to findById(String)
#           This is a breaking API change!
#
# Prerequisites:
#   - Run 01-happy-path-demo.sh first (or have v1.0.0 published)
#   - Java 21+ installed
#
# Usage: ./02-breaking-change-demo.sh
#===============================================================================

set -e  # Exit on any error (we'll handle expected failures)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Project paths (sibling repos to dep-multimodule)
LIBRARY_DIR="$PROJECT_ROOT/dep-library"
CONSUMER_DIR="$PROJECT_ROOT/dep-consumer"

# Backup files
USER_SERVICE_BACKUP=""
USER_BACKUP=""

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

narrator() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  🎙️  NARRATOR: $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

section() {
    echo ""
    echo -e "${BLUE}┌──────────────────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BLUE}│ ${BOLD}$1${NC}${BLUE}$(printf '%*s' $((76 - ${#1})) '')│${NC}"
    echo -e "${BLUE}└──────────────────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

run_command() {
    echo -e "${YELLOW}▶ Running:${NC} $1"
    echo -e "${YELLOW}  In:${NC} $2"
    echo ""
    eval "cd $2 && $1"
    local exit_code=$?
    echo ""
    return $exit_code
}

run_command_expect_failure() {
    echo -e "${YELLOW}▶ Running:${NC} $1"
    echo -e "${YELLOW}  In:${NC} $2"
    echo -e "${RED}  (Expected to fail!)${NC}"
    echo ""
    set +e
    eval "cd $2 && $1"
    local exit_code=$?
    set -e
    echo ""
    return $exit_code
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

failure() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

pause_for_effect() {
    echo ""
    echo -e "${CYAN}[Press Enter to continue...]${NC}"
    read -r
}

show_diff() {
    echo -e "${YELLOW}📝 Changes being made:${NC}"
    echo ""
    echo "$1"
    echo ""
}

#-------------------------------------------------------------------------------
# Cleanup function to restore original files
#-------------------------------------------------------------------------------
cleanup() {
    echo ""
    echo -e "${YELLOW}Restoring original library files...${NC}"

    # Restore UserService.java
    if [ -f "$LIBRARY_DIR/src/main/java/com/example/library/UserService.java.backup" ]; then
        mv "$LIBRARY_DIR/src/main/java/com/example/library/UserService.java.backup" \
           "$LIBRARY_DIR/src/main/java/com/example/library/UserService.java"
        echo "  ✓ Restored UserService.java"
    fi

    # Republish v1.0.0
    echo "  Republishing v1.0.0..."
    cd "$LIBRARY_DIR" && ./gradlew publishToMavenLocal -Pversion=1.0.0 --quiet 2>/dev/null || true
    echo "  ✓ Library v1.0.0 restored"
    echo ""
}

# Set trap to cleanup on exit
trap cleanup EXIT

#===============================================================================
# DEMO BEGINS
#===============================================================================

clear
echo ""
echo -e "${BOLD}${RED}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║     MULTI-REPO DEPENDENCY MANAGEMENT DEMO                                  ║"
echo "║     Part 2: Breaking Change Detection                                      ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 1: Setup
#-------------------------------------------------------------------------------

narrator "In this demo, we'll see what happens when a library maintainer
introduces a BREAKING CHANGE to the API."

section "THE SCENARIO"

echo "Current state (v1.0.0):"
echo ""
echo "  UserService.findById(${GREEN}Long${NC} userId)  →  Returns User by numeric ID"
echo ""
echo "Proposed change (v2.0.0):"
echo ""
echo "  UserService.findById(${RED}String${NC} uuid)   →  Returns User by UUID string"
echo ""
echo -e "${YELLOW}This is a BREAKING CHANGE because:${NC}"
echo "  • Method signature changes (Long → String parameter)"
echo "  • Existing consumers will fail to compile"
echo "  • No backward compatibility"
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 2: Verify Current State
#-------------------------------------------------------------------------------

narrator "First, let's verify everything works with the current v1.0.0"

section "STEP 1: Verify v1.0.0 Works"

echo "Running consumer tests against v1.0.0..."
echo ""

run_command "./gradlew test -PlibraryVersion=1.0.0 --quiet" "$CONSUMER_DIR"

success "All tests pass with v1.0.0 - this is our baseline"

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 3: Introduce Breaking Change
#-------------------------------------------------------------------------------

narrator "Now, let's simulate a library developer making a breaking change..."

section "STEP 2: Introducing the Breaking Change"

echo "The library maintainer decides to change findById to use String UUIDs"
echo "instead of Long IDs for 'better scalability'..."
echo ""

# Backup original file
cp "$LIBRARY_DIR/src/main/java/com/example/library/UserService.java" \
   "$LIBRARY_DIR/src/main/java/com/example/library/UserService.java.backup"

# Create the breaking change version
cat > "$LIBRARY_DIR/src/main/java/com/example/library/UserService.java" << 'BREAKING_CHANGE'
package com.example.library;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for managing users.
 * API Version: 2.0.0
 *
 * BREAKING CHANGE: findById now takes String UUID instead of Long
 */
public class UserService {

    private final Map<String, User> users = new HashMap<>();

    public UserService() {
        // Seed with sample data - now using UUIDs
        String uuid1 = UUID.randomUUID().toString();
        String uuid2 = UUID.randomUUID().toString();
        users.put(uuid1, new User(1L, "john.doe@example.com", "John Doe"));
        users.put(uuid2, new User(2L, "jane.doe@example.com", "Jane Doe"));
    }

    /**
     * Find a user by their UUID.
     *
     * BREAKING CHANGE: Parameter changed from Long to String!
     *
     * @param uuid the user's UUID string
     * @return the User object, or null if not found
     */
    public User findById(String uuid) {  // <-- BREAKING: was Long, now String
        return users.get(uuid);
    }

    /**
     * Find all users.
     *
     * @return list of all users
     */
    public List<User> findAll() {
        return new ArrayList<>(users.values());
    }

    /**
     * Create a new user.
     *
     * @param email user's email
     * @param name  user's full name
     * @return the created User
     */
    public User createUser(String email, String name) {
        String uuid = UUID.randomUUID().toString();
        Long id = (long) (users.size() + 1);
        User user = new User(id, email, name);
        users.put(uuid, user);
        return user;
    }
}
BREAKING_CHANGE

echo -e "${RED}Breaking change introduced!${NC}"
echo ""
show_diff "  - public User findById(Long userId)    // OLD
  + public User findById(String uuid)     // NEW - BREAKING!"

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 4: Publish Breaking Version
#-------------------------------------------------------------------------------

narrator "The library maintainer publishes this as version 2.0.0..."

section "STEP 3: Publishing v2.0.0 with Breaking Change"

run_command "./gradlew clean publishToMavenLocal -Pversion=2.0.0" "$LIBRARY_DIR"

success "Library v2.0.0 published to Maven Local"
warning "But this version has a breaking API change!"

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 5: Consumer Tries to Update
#-------------------------------------------------------------------------------

narrator "Now imagine a consumer tries to upgrade to v2.0.0..."

section "STEP 4: Consumer Attempts to Use v2.0.0"

echo "The consumer updates their dependency to version 2.0.0"
echo "and runs their test suite..."
echo ""

failure "Running tests with library version 2.0.0..."
echo ""

run_command_expect_failure "./gradlew clean test -PlibraryVersion=2.0.0 2>&1 | head -80" "$CONSUMER_DIR"

echo ""
echo -e "${RED}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  TESTS FAILED! The contract tests detected the breaking change!           ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 6: Analysis
#-------------------------------------------------------------------------------

narrator "Let's analyze what the tests caught..."

section "STEP 5: Understanding the Failure"

echo "The contract test 'verifyFindByIdSignature' failed because:"
echo ""
echo -e "  ${RED}Expected:${NC} findById(Long.class)"
echo -e "  ${RED}Actual:${NC}   findById(String.class)"
echo ""
echo "The reflection-based test explicitly verified:"
echo ""
echo -e "  ${YELLOW}Method method = clazz.getMethod(\"findById\", Long.class);${NC}"
echo ""
echo "Since the method signature changed, getMethod() threw NoSuchMethodException"
echo ""
echo -e "${GREEN}This is exactly what we want!${NC}"
echo "The tests caught the incompatibility BEFORE the code reached production."
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 7: The Right Way
#-------------------------------------------------------------------------------

narrator "So what's the right way to handle this situation?"

section "BEST PRACTICES FOR API EVOLUTION"

echo -e "${BOLD}Option 1: Deprecate and Add (Backward Compatible)${NC}"
echo ""
echo "  // Keep old method, mark deprecated"
echo "  @Deprecated"
echo "  public User findById(Long userId) { ... }"
echo ""
echo "  // Add new method with different name"
echo "  public User findByUuid(String uuid) { ... }"
echo ""
echo ""
echo -e "${BOLD}Option 2: Major Version Bump with Migration Guide${NC}"
echo ""
echo "  • Publish as v2.0.0 (signals breaking change)"
echo "  • Provide migration documentation"
echo "  • Give consumers time to adapt"
echo "  • Consider providing a migration tool"
echo ""
echo ""
echo -e "${BOLD}Option 3: Composite Build Testing (Recommended!)${NC}"
echo ""
echo "  • Test changes BEFORE publishing"
echo "  • Use Gradle composite builds"
echo "  • Run consumer tests against local changes"
echo "  • Catch breaks during development, not after release"
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# CONCLUSION
#-------------------------------------------------------------------------------

narrator "That concludes the Breaking Change demo!"

section "SUMMARY"

echo -e "${RED}✗${NC} Library v2.0.0 changed findById(Long) → findById(String)"
echo -e "${RED}✗${NC} Consumer tests immediately detected the incompatibility"
echo -e "${GREEN}✓${NC} Breaking change caught BEFORE production deployment"
echo -e "${GREEN}✓${NC} Contract tests provided clear error messages"
echo ""
echo "Key Takeaways:"
echo ""
echo "  1. ${BOLD}Contract Tests Are Essential${NC}"
echo "     They catch breaking changes at test time, not runtime"
echo ""
echo "  2. ${BOLD}Semantic Versioning Matters${NC}"
echo "     Major version bumps (1.x → 2.x) signal breaking changes"
echo ""
echo "  3. ${BOLD}Test Before Publish${NC}"
echo "     Use composite builds to test changes against consumers"
echo ""
echo "  4. ${BOLD}Communication Is Key${NC}"
echo "     Document breaking changes and provide migration paths"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  The original library files will be restored when this script exits.${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Cleanup happens automatically via trap
