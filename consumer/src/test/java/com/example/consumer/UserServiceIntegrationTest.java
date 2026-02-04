package com.example.consumer;

import com.example.library.User;
import com.example.library.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests that verify the library API contract.
 * These tests serve as an early warning system for breaking changes.
 *
 * BREAKING CHANGE DETECTION:
 * - Compile-time: If method signatures change, this file won't compile
 * - Runtime: If behavior changes, assertions will fail
 */
@DisplayName("UserService Integration Tests")
class UserServiceIntegrationTest {

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService();
    }

    @Nested
    @DisplayName("findById() API Contract Tests")
    class FindByIdContract {

        @Test
        @DisplayName("Should find existing user by Long ID")
        void shouldFindExistingUserByLongId() {
            // This test verifies the method signature: User findById(Long userId)
            // BREAKING CHANGE: If parameter type changes from Long to String,
            // this test will fail to compile

            Long userId = 1L;  // Explicit Long type

            // Method call that will break if signature changes
            User user = userService.findById(userId);

            // Assertions that verify expected behavior
            assertThat(user).isNotNull();
            assertThat(user.getId()).isEqualTo(1L);
            assertThat(user.getEmail()).isEqualTo("john.doe@example.com");
        }

        @Test
        @DisplayName("Should return null for non-existent user (v1.0 behavior)")
        void shouldReturnNullForNonExistentUser() {
            // This test verifies the null-return behavior
            // BREAKING CHANGE: If the method starts throwing exceptions
            // instead of returning null, this test will fail at runtime

            Long nonExistentId = 999L;

            User user = userService.findById(nonExistentId);

            // v1.0 contract: returns null for missing users
            assertThat(user).isNull();
        }

        @Test
        @DisplayName("Should accept primitive long via autoboxing")
        void shouldAcceptPrimitiveLong() {
            // Tests autoboxing behavior
            long primitiveId = 1L;

            User user = userService.findById(primitiveId);

            assertThat(user).isNotNull();
        }

        @Test
        @DisplayName("User.getId() should return Long type")
        void userIdShouldBeLongType() {
            Long userId = 1L;
            User user = userService.findById(userId);

            // This assertion will fail to compile if getId() returns String instead of Long
            Long retrievedId = user.getId();
            assertThat(retrievedId).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("findAll() API Contract Tests")
    class FindAllContract {

        @Test
        @DisplayName("Should return list of all users")
        void shouldReturnAllUsers() {
            List<User> users = userService.findAll();

            assertThat(users)
                    .isNotNull()
                    .isNotEmpty()
                    .hasSize(2);
        }

        @Test
        @DisplayName("Should return User objects with valid properties")
        void shouldReturnValidUserObjects() {
            List<User> users = userService.findAll();

            assertThat(users)
                    .allSatisfy(user -> {
                        assertThat(user.getId()).isNotNull();
                        assertThat(user.getEmail()).isNotBlank();
                        assertThat(user.getName()).isNotBlank();
                    });
        }
    }

    @Nested
    @DisplayName("createUser() API Contract Tests")
    class CreateUserContract {

        @Test
        @DisplayName("Should create user with email and name parameters")
        void shouldCreateUserWithEmailAndName() {
            // Verifies method signature: User createUser(String email, String name)
            String email = "new.user@example.com";
            String name = "New User";

            User created = userService.createUser(email, name);

            assertThat(created).isNotNull();
            assertThat(created.getId()).isNotNull();
            assertThat(created.getEmail()).isEqualTo(email);
            assertThat(created.getName()).isEqualTo(name);
        }

        @Test
        @DisplayName("Should assign incremental ID to new users")
        void shouldAssignIncrementalId() {
            User first = userService.createUser("first@test.com", "First");
            User second = userService.createUser("second@test.com", "Second");

            assertThat(second.getId()).isGreaterThan(first.getId());
        }
    }
}
