package com.example.consumer;

import com.example.library.User;
import com.example.library.UserService;

import java.util.List;

/**
 * Sample application that uses the library.
 */
public class Application {

    public static void main(String[] args) {
        UserService userService = new UserService();

        // Find user by ID (uses Long parameter)
        Long userId = 1L;
        User user = userService.findById(userId);

        if (user != null) {
            System.out.println("Found user: " + user.getName());
            System.out.println("User ID (Long): " + user.getId());
        }

        // List all users
        List<User> allUsers = userService.findAll();
        System.out.println("Total users: " + allUsers.size());

        // Create a new user
        User newUser = userService.createUser("new.user@example.com", "New User");
        System.out.println("Created user with ID: " + newUser.getId());
    }
}
