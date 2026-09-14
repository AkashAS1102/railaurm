package com.railaurum.backend.model;

import java.util.UUID;

public record Station(
    UUID id,
    String stationCode,
    String stationName,
    String city
) {}
