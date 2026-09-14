package com.railaurum.backend.model;

import java.util.UUID;

public record Passenger(
    UUID id,
    UUID bookingId,
    String name,
    Integer age,
    String gender,
    String seatNumber
) {}
