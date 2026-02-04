package com.example.library;

import java.util.Objects;

/**
 * Represents a user in the system.
 * API Version: 2.0.0
 *
 * BREAKING CHANGE from 1.0.0: ID changed from Long to String (UUID format)
 */
public class User {

    private final String id;  // BREAKING CHANGE: was Long
    private final String email;
    private final String name;

    public User(String id, String email, String name) {
        this.id = Objects.requireNonNull(id, "id must not be null");
        this.email = Objects.requireNonNull(email, "email must not be null");
        this.name = Objects.requireNonNull(name, "name must not be null");
    }

    /**
     * BREAKING CHANGE: Return type changed from Long to String
     */
    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getName() {
        return name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "User{id='" + id + "', email='" + email + "', name='" + name + "'}";
    }
}
