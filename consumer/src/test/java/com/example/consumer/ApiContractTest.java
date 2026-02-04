package com.example.consumer;

import com.example.library.User;
import com.example.library.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Explicit API contract tests using reflection.
 * These tests verify the exact method signatures exist, providing
 * early detection of breaking changes even before runtime.
 */
@DisplayName("API Contract Verification Tests")
class ApiContractTest {

    @Test
    @DisplayName("UserService should have findById(Long) method returning User")
    void verifyFindByIdSignature() throws NoSuchMethodException {
        Class<UserService> clazz = UserService.class;

        // Verify method exists with exact signature
        Method method = clazz.getMethod("findById", Long.class);

        assertThat(method.getReturnType())
                .as("findById should return User type")
                .isEqualTo(User.class);

        assertThat(Modifier.isPublic(method.getModifiers()))
                .as("findById should be public")
                .isTrue();
    }

    @Test
    @DisplayName("UserService should have findAll() method returning List")
    void verifyFindAllSignature() throws NoSuchMethodException {
        Class<UserService> clazz = UserService.class;

        Method method = clazz.getMethod("findAll");

        assertThat(method.getReturnType())
                .as("findAll should return List type")
                .isEqualTo(List.class);
    }

    @Test
    @DisplayName("UserService should have createUser(String, String) method")
    void verifyCreateUserSignature() throws NoSuchMethodException {
        Class<UserService> clazz = UserService.class;

        Method method = clazz.getMethod("createUser", String.class, String.class);

        assertThat(method.getReturnType())
                .as("createUser should return User type")
                .isEqualTo(User.class);
    }

    @Test
    @DisplayName("User class should have getId() returning Long")
    void verifyUserGetIdReturnsLong() throws NoSuchMethodException {
        Class<User> clazz = User.class;

        Method method = clazz.getMethod("getId");

        assertThat(method.getReturnType())
                .as("getId should return Long type")
                .isEqualTo(Long.class);
    }

    @Test
    @DisplayName("User class should have getEmail() returning String")
    void verifyUserGetEmailReturnsString() throws NoSuchMethodException {
        Class<User> clazz = User.class;

        assertThat(clazz.getMethod("getEmail").getReturnType())
                .isEqualTo(String.class);
    }

    @Test
    @DisplayName("User class should have getName() returning String")
    void verifyUserGetNameReturnsString() throws NoSuchMethodException {
        Class<User> clazz = User.class;

        assertThat(clazz.getMethod("getName").getReturnType())
                .isEqualTo(String.class);
    }
}
