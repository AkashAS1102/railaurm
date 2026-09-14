package com.railaurum.backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record Schedule(
    UUID id,
    UUID trainId,
    LocalDate journeyDate,
    LocalTime departureTime,
    LocalTime arrivalTime,
    String travelClass,
    BigDecimal fare,
    Integer availableSeats,
    // Extra fields needed for the frontend when searching
    Train train,
    Station sourceStation,
    Station destinationStation
) {}
