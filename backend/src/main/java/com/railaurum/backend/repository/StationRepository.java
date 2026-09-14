package com.railaurum.backend.repository;

import com.railaurum.backend.model.Station;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class StationRepository {
    private final JdbcTemplate jdbcTemplate;

    public StationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Station> findAll() {
        String sql = "SELECT id, station_code, station_name, city FROM stations ORDER BY station_name ASC";
        return jdbcTemplate.query(sql, (rs, rowNum) -> new Station(
            rs.getObject("id", UUID.class),
            rs.getString("station_code"),
            rs.getString("station_name"),
            rs.getString("city")
        ));
    }
}
