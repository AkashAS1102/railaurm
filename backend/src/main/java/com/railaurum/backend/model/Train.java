package com.railaurum.backend.model;

import java.util.UUID;

public record Train(
    UUID id,
    String trainNumber,
    String trainName,
    UUID sourceStationId,
    UUID destinationStationId,
    Integer totalSeats
) {}
