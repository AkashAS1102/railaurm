package com.railaurum.backend.repository;

import com.railaurum.backend.model.Schedule;
import com.railaurum.backend.model.Station;
import com.railaurum.backend.model.Train;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public class ScheduleRepository {
    private final JdbcTemplate jdbcTemplate;

    public ScheduleRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Schedule> searchSchedules(String fromStation, String toStation, LocalDate date, String travelClass) {
        String sql = """
            SELECT s.id as s_id, s.journey_date, s.departure_time, s.arrival_time, 
                   s.travel_class, s.fare, s.available_seats,
                   t.id as t_id, t.train_number, t.train_name, t.total_seats,
                   src.id as src_id, src.station_code as src_code, src.station_name as src_name, src.city as src_city,
                   dst.id as dst_id, dst.station_code as dst_code, dst.station_name as dst_name, dst.city as dst_city
            FROM schedules s
            JOIN trains t ON t.id = s.train_id
            JOIN stations src ON src.id = t.source_station_id
            JOIN stations dst ON dst.id = t.destination_station_id
            WHERE src.station_code = ? AND dst.station_code = ? AND s.journey_date = ? AND s.travel_class = ?
            ORDER BY s.departure_time ASC
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            Station source = new Station(rs.getObject("src_id", UUID.class), rs.getString("src_code"), rs.getString("src_name"), rs.getString("src_city"));
            Station dest = new Station(rs.getObject("dst_id", UUID.class), rs.getString("dst_code"), rs.getString("dst_name"), rs.getString("dst_city"));
            Train train = new Train(rs.getObject("t_id", UUID.class), rs.getString("train_number"), rs.getString("train_name"), source.id(), dest.id(), rs.getInt("total_seats"));
            
            return new Schedule(
                rs.getObject("s_id", UUID.class),
                train.id(),
                rs.getDate("journey_date").toLocalDate(),
                rs.getTime("departure_time").toLocalTime(),
                rs.getTime("arrival_time").toLocalTime(),
                rs.getString("travel_class"),
                rs.getBigDecimal("fare"),
                rs.getInt("available_seats"),
                train,
                source,
                dest
            );
        }, fromStation, toStation, date, travelClass);
    }
}
