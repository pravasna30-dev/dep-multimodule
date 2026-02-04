package com.example.library;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for managing users.
 * API Version: 1.0.0
 */
public class UserService {

    private final Map<Long, User> users = new HashMap<>();

    public UserService() {
        // Seed with sample data
        users.put(1L, new User(1L, "john.doe@example.com", "John Doe"));
        users.put(2L, new User(2L, "jane.doe@example.com", "Jane Doe"));
    }

    /**
     * Find a user by their numeric ID.
     *
     * @param userId the user's numeric ID
     * @return the User object, or null if not found
     */
    public User findById(Long userId) {
        return users.get(userId);
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
        Long id = (long) (users.size() + 1);
        User user = new User(id, email, name);
        users.put(id, user);
        return user;
    }
}
