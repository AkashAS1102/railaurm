package com.railaurum.backend.controller;

import com.railaurum.backend.model.Schedule;
import com.railaurum.backend.model.Station;
import com.railaurum.backend.repository.ScheduleRepository;
import com.railaurum.backend.repository.StationRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class PublicController {
    
    private final StationRepository stationRepository;
    private final ScheduleRepository scheduleRepository;

    public PublicController(StationRepository stationRepository, ScheduleRepository scheduleRepository) {
        this.stationRepository = stationRepository;
        this.scheduleRepository = scheduleRepository;
    }

    @GetMapping("/stations")
    public List<Station> getStations() {
        return stationRepository.findAll();
    }

    @GetMapping("/schedules/search")
    public List<Schedule> searchSchedules(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam String date,
            @RequestParam String cls) {
        return scheduleRepository.searchSchedules(from, to, LocalDate.parse(date), cls);
    }
}
