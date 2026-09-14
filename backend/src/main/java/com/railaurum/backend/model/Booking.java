package com.railaurum.backend.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record Booking(
    UUID id,
    String pnrNumber,
    UUID userId,
    UUID scheduleId,
    OffsetDateTime bookingDate,
    String status,
    BigDecimal totalAmount,
    Schedule schedule,
    List<Passenger> passengers
) {}
