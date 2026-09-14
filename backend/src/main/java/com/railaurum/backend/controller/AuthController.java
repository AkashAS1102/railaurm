package com.railaurum.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/demo-account")
    public Map<String, String> createDemoAccount(@RequestBody Map<String, String> payload) {
        String role = payload.get("role");
        if (!"customer".equals(role) && !"admin".equals(role)) {
            throw new RuntimeException("Role must be 'customer' or 'admin'");
        }

        String email = role + "@railaurum.app";
        String password = "railaurum-" + role + "-2026";
        String name = "Demo " + (role.substring(0, 1).toUpperCase() + role.substring(1));

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
                throw new RuntimeException("Failed to create user: " + e.getResponseBodyAsString());
            }
        }

        return Map.of("email", email, "password", password);
    }
}
