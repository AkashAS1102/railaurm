package com.railaurum.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Value("${supabase.url:https://jdhmgnoigrgndeqjlafs.supabase.co}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key:}")
    private String serviceRoleKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, Map<String, String>> DEMO_ACCOUNTS = Map.of(
        "customer", Map.of(
            "email", "demo@railaurum.app",
            "password", "railaurum-demo-2026",
            "name", "Demo Traveller"
        ),
        "admin", Map.of(
            "email", "admin@railaurum.app",
            "password", "railaurum-admin-2026",
            "name", "Demo Admin"
        )
    );

    @PostMapping("/demo-account")
    public Map<String, String> createDemoAccount(@RequestBody Map<String, String> payload) {
        String role = payload.get("role");
        Map<String, String> account = DEMO_ACCOUNTS.get(role);
        if (account == null) {
            throw new RuntimeException("Role must be 'customer' or 'admin'");
        }

        String email = account.get("email");
        String password = account.get("password");
        String name = account.get("name");

        // Only call Supabase Admin API if a valid service role key is provided
        if (serviceRoleKey != null && !serviceRoleKey.isBlank() && !serviceRoleKey.startsWith("PUT_") && !serviceRoleKey.startsWith("your-")) {
            String adminApiUrl = supabaseUrl + "/auth/v1/admin/users";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + serviceRoleKey);
            headers.set("apikey", serviceRoleKey);
            headers.set("Content-Type", "application/json");

            Map<String, Object> body = new HashMap<>();
            body.put("email", email);
            body.put("password", password);
            body.put("email_confirm", true);
            body.put("user_metadata", Map.of("name", name));

            try {
                HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
                restTemplate.exchange(adminApiUrl, HttpMethod.POST, request, String.class);
            } catch (HttpClientErrorException e) {
                // Ignore if user already exists
                if (!e.getResponseBodyAsString().contains("already exists") && !e.getResponseBodyAsString().contains("registered")) {
                    // Log but don't fail, since demo account might already be present
                    System.err.println("Warning: Supabase user creation: " + e.getResponseBodyAsString());
                }
            } catch (Exception e) {
                System.err.println("Warning: Admin API call failed: " + e.getMessage());
            }
        }

        return Map.of("email", email, "password", password);
    }

    @GetMapping("/test")
    public String test() {
        return "Backend is running! Supabase URL is " + supabaseUrl;
    }
}
