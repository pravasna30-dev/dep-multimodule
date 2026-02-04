package com.example.library;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing users.
 * API Version: 2.0.0
 *
 * BREAKING CHANGES from 1.0.0:
 * - findById() now takes String (UUID) instead of Long
 * - findById() now returns Optional<User> instead of User
 */
public class UserService {

    private final Map<String, User> users = new HashMap<>();

    public UserService() {
        // v2.0: IDs are now UUIDs (String)
        users.put("550e8400-e29b-41d4-a716-446655440001",
                new User("550e8400-e29b-41d4-a716-446655440001", "john.doe@example.com", "John Doe"));
        users.put("550e8400-e29b-41d4-a716-446655440002",
                new User("550e8400-e29b-41d4-a716-446655440002", "jane.doe@example.com", "Jane Doe"));
    }

    /**
     * Find a user by their UUID.
     *
     * BREAKING CHANGE: Parameter changed from Long to String
     * BREAKING CHANGE: Return type changed from User to Optional<User>
     *
     * @param userId the user's UUID as a String
     * @return Optional containing the User, or empty if not found
     */
    public Optional<User> findById(String userId) {
        return Optional.ofNullable(users.get(userId));
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
        String id = UUID.randomUUID().toString();
        User user = new User(id, email, name);
        users.put(id, user);
        return user;
    }
}
