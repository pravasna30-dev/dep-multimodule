#!/bin/bash
#===============================================================================
# NARRATOR DEMO SCRIPT: Happy Path - Producer/Consumer Workflow
#===============================================================================
# This script demonstrates the successful integration between:
#   - dep-library (Producer): Publishes a versioned library to Maven Local
#   - dep-consumer (Consumer): Depends on and uses the library
#
# Prerequisites:
#   - Java 21+ installed
#   - Projects cloned side-by-side in same parent directory
#
# Usage: ./01-happy-path-demo.sh
#===============================================================================

set -e  # Exit on any error

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

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

show_code() {
    echo -e "${YELLOW}📄 $1:${NC}"
    echo ""
    cat "$2"
    echo ""
}

pause_for_effect() {
    echo ""
    echo -e "${CYAN}[Press Enter to continue...]${NC}"
    read -r
}

#===============================================================================
# DEMO BEGINS
#===============================================================================

clear
echo ""
echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║     MULTI-REPO DEPENDENCY MANAGEMENT DEMO                                  ║"
echo "║     Part 1: Happy Path - Producer/Consumer Workflow                        ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 1: Introduction
#-------------------------------------------------------------------------------

narrator "Welcome to the Multi-Repo Dependency Management demo! Today we'll explore
how a library producer and consumer work together in separate repositories."

section "SCENARIO OVERVIEW"

echo "We have two independent projects:"
echo ""
echo -e "  ${GREEN}dep-library${NC} (Producer)"
echo "    └── Publishes a User management library"
echo "    └── Contains: User.java, UserService.java"
echo "    └── Publishes to Maven Local"
echo ""
echo -e "  ${GREEN}dep-consumer${NC} (Consumer)"
echo "    └── An application that uses the library"
echo "    └── Declares dependency: com.example:library:1.0.0"
echo "    └── Has contract tests to verify API compatibility"
echo ""

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 2: The Library (Producer)
#-------------------------------------------------------------------------------

narrator "Let's start by examining our library - the PRODUCER in this relationship."

section "STEP 1: Examining the Library Structure"

echo "Library location: $LIBRARY_DIR"
echo ""
echo "Key files:"
run_command "ls -la src/main/java/com/example/library/" "$LIBRARY_DIR"

pause_for_effect

narrator "The library exposes a simple but clean API for user management."

section "STEP 2: Library Public API"

echo -e "${YELLOW}📄 User.java - The data model:${NC}"
echo ""
echo "  class User {"
echo "      Long getId()"
echo "      String getEmail()"
echo "      String getName()"
echo "  }"
echo ""
echo -e "${YELLOW}📄 UserService.java - The service layer:${NC}"
echo ""
echo "  class UserService {"
echo "      User findById(Long userId)        // Find user by ID"
echo "      List<User> findAll()              // Get all users"
echo "      User createUser(String, String)   // Create new user"
echo "  }"
echo ""

pause_for_effect

narrator "Now let's publish this library to Maven Local so consumers can use it."

section "STEP 3: Publishing the Library"

echo "Publishing version 1.0.0 to Maven Local..."
echo ""

run_command "./gradlew clean publishToMavenLocal -Pversion=1.0.0" "$LIBRARY_DIR"

success "Library published to ~/.m2/repository/com/example/library/1.0.0/"

echo ""
echo "Let's verify the published artifacts:"
run_command "ls -la ~/.m2/repository/com/example/library/1.0.0/" "$LIBRARY_DIR"

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 3: The Consumer
#-------------------------------------------------------------------------------

narrator "Now let's switch to the CONSUMER - an application that depends on our library."

section "STEP 4: Consumer's Dependency Declaration"

echo "Consumer's build.gradle.kts declares:"
echo ""
echo -e "${YELLOW}dependencies {${NC}"
echo -e "${YELLOW}    implementation(\"com.example:library:\$libraryVersion\")${NC}"
echo -e "${YELLOW}}${NC}"
echo ""
echo "The library version is configurable via project property (default: 1.0.0)"
echo ""

pause_for_effect

narrator "The consumer has comprehensive tests to verify the library API contract."

section "STEP 5: Consumer's Contract Tests"

echo "The consumer uses reflection-based contract tests to verify:"
echo ""
echo "  ✓ UserService.findById(Long) returns User"
echo "  ✓ UserService.findAll() returns List"
echo "  ✓ UserService.createUser(String, String) returns User"
echo "  ✓ User.getId() returns Long"
echo "  ✓ User.getEmail() returns String"
echo "  ✓ User.getName() returns String"
echo ""
echo "These tests will FAIL FAST if the library changes its API!"
echo ""

pause_for_effect

narrator "Let's run the consumer's tests against the published library."

section "STEP 6: Running Consumer Tests"

echo "Running tests with library version 1.0.0..."
echo ""

run_command "./gradlew clean test -PlibraryVersion=1.0.0" "$CONSUMER_DIR"

success "All tests passed! The consumer is compatible with library v1.0.0"

pause_for_effect

#-------------------------------------------------------------------------------
# ACT 4: Running the Application
#-------------------------------------------------------------------------------

narrator "With all tests passing, let's run the actual application."

section "STEP 7: Running the Consumer Application"

run_command "./gradlew run -PlibraryVersion=1.0.0 --quiet" "$CONSUMER_DIR"

success "Application ran successfully using the library!"

pause_for_effect

#-------------------------------------------------------------------------------
# CONCLUSION
#-------------------------------------------------------------------------------

narrator "That concludes the Happy Path demo!"

section "SUMMARY"

echo -e "${GREEN}✓${NC} Library v1.0.0 published to Maven Local"
echo -e "${GREEN}✓${NC} Consumer declares dependency on library"
echo -e "${GREEN}✓${NC} Contract tests verify API compatibility"
echo -e "${GREEN}✓${NC} All tests pass"
echo -e "${GREEN}✓${NC} Application runs successfully"
echo ""
echo "Key Takeaways:"
echo ""
echo "  1. ${BOLD}Versioned Publishing${NC}: Library uses semantic versioning"
echo "  2. ${BOLD}Contract Tests${NC}: Consumer verifies expected API exists"
echo "  3. ${BOLD}Loose Coupling${NC}: Projects can evolve independently"
echo "  4. ${BOLD}Early Detection${NC}: Tests catch incompatibilities at compile/test time"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Next: Run 02-breaking-change-demo.sh to see what happens when the${NC}"
echo -e "${CYAN}  library introduces a breaking change!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
