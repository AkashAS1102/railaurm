package com.railaurum.backend.repository;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public class BookingRepository {
    private final JdbcTemplate jdbcTemplate;

    public BookingRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public String bookTicket(UUID userId, UUID scheduleId, JsonNode passengers) {
        // Re-implementing the Supabase book_ticket RPC in Java
        int count = passengers.size();
        if (count < 1 || count > 6) {
            throw new RuntimeException("Add between 1 and 6 passengers.");
        }

        // Lock schedule for update
        String lockSql = "SELECT s.available_seats, s.fare, t.total_seats FROM schedules s JOIN trains t ON t.id = s.train_id WHERE s.id = ? FOR UPDATE OF s";
        var row = jdbcTemplate.queryForMap(lockSql, scheduleId);
        
        int availableSeats = (Integer) row.get("available_seats");
        BigDecimal fare = (BigDecimal) row.get("fare");
        int totalSeats = (Integer) row.get("total_seats");

        if (availableSeats < count) {
            throw new RuntimeException("Only " + availableSeats + " seat(s) left on this train.");
        }

        String pnr = UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        BigDecimal totalAmount = fare.multiply(new BigDecimal(count));

        // Insert booking
        UUID bookingId = jdbcTemplate.queryForObject(
            "INSERT INTO bookings (pnr_number, user_id, schedule_id, total_amount) VALUES (?, ?, ?, ?) RETURNING id",
            UUID.class, pnr, userId, scheduleId, totalAmount
        );

        // Insert passengers
        int idx = 0;
        for (JsonNode p : passengers) {
            idx++;
            int seatBase = totalSeats - availableSeats + idx - 1;
            String seatNumber = "S" + ((seatBase / 8) + 1) + "-" + ((seatBase % 8) + 1);

            jdbcTemplate.update(
                "INSERT INTO passengers (booking_id, name, age, gender, seat_number) VALUES (?, ?, ?, ?, ?)",
                bookingId, p.get("name").asText(), p.get("age").asInt(), p.get("gender").asText(), seatNumber
            );
        }

        // Update available seats
        jdbcTemplate.update("UPDATE schedules SET available_seats = available_seats - ? WHERE id = ?", count, scheduleId);

        return pnr;
    }
}
