package com.railaurum.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.railaurum.backend.repository.BookingRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingRepository bookingRepository;

    public BookingController(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @PostMapping
    public Map<String, String> bookTicket(@AuthenticationPrincipal Jwt jwt, @RequestBody BookingRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String pnr = bookingRepository.bookTicket(userId, request.scheduleId(), request.passengers());
        return Map.of("pnr", pnr);
    }
}

record BookingRequest(UUID scheduleId, JsonNode passengers) {}
