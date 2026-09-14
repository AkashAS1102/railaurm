ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

UPDATE public.stations SET latitude = v.lat, longitude = v.lng
FROM (VALUES
 ('NDLS',28.6425,77.2192),('BCT',18.9690,72.8193),('HWH',22.5839,88.3425),
 ('MAS',13.0827,80.2757),('SBC',12.9776,77.5713),('HYB',17.3850,78.4867),
 ('PUNE',18.5286,73.8743),('ADI',23.0258,72.5873),('JP',26.9196,75.7880),
 ('LKO',26.8310,80.9231)
) AS v(code,lat,lng)
WHERE stations.station_code = v.code;

INSERT INTO public.stations (station_code, station_name, city, latitude, longitude) VALUES
 ('BPL','Bhopal Junction','Bhopal',23.2683,77.4030),
 ('NGP','Nagpur Junction','Nagpur',21.1527,79.0882),
 ('PNBE','Patna Junction','Patna',25.6019,85.1376),
 ('GHY','Guwahati','Guwahati',26.1830,91.7500),
 ('ERS','Ernakulam Junction','Kochi',9.9700,76.2870),
 ('BSB','Varanasi Junction','Varanasi',25.3272,82.9860)
ON CONFLICT (station_code) DO NOTHING;

WITH newt(num, nm, src, dst, seats, dep, arr, base) AS (VALUES
 ('12155','Bhopal Express','NDLS','BPL',520,'21:05'::time,'07:20'::time,760),
 ('12156','Bhopal Express Return','BPL','NDLS',520,'22:10'::time,'08:35'::time,760),
 ('12290','Nagpur Duronto','NGP','BCT',480,'20:45'::time,'09:05'::time,890),
 ('12289','Mumbai Duronto','BCT','NGP',480,'21:15'::time,'09:40'::time,890),
 ('12310','Patna Rajdhani','PNBE','NDLS',430,'19:20'::time,'07:40'::time,1120),
 ('12309','Rajendra Nagar Rajdhani','NDLS','PNBE',430,'19:00'::time,'07:15'::time,1120),
 ('12424','Dibrugarh Rajdhani','NDLS','GHY',450,'16:10'::time,'06:00'::time,1580),
 ('12423','Guwahati Rajdhani','GHY','NDLS',450,'17:30'::time,'07:55'::time,1580),
 ('12626','Kerala Express','NDLS','ERS',560,'11:25'::time,'15:50'::time,1460),
 ('12625','Kerala Express Return','ERS','NDLS',560,'13:40'::time,'18:20'::time,1460),
 ('12559','Shiv Ganga Express','BSB','NDLS',500,'19:00'::time,'07:10'::time,820),
 ('12560','Shiv Ganga Express Return','NDLS','BSB',500,'20:05'::time,'08:15'::time,820),
 ('12628','Karnataka Express','SBC','NDLS',540,'19:20'::time,'06:40'::time,1390),
 ('12627','Karnataka Express Return','NDLS','SBC',540,'20:45'::time,'08:05'::time,1390)
), ins AS (
  INSERT INTO public.trains (train_number, train_name, source_station_id, destination_station_id, total_seats)
  SELECT n.num, n.nm, s1.id, s2.id, n.seats
  FROM newt n
  JOIN public.stations s1 ON s1.station_code = n.src
  JOIN public.stations s2 ON s2.station_code = n.dst
  ON CONFLICT (train_number) DO NOTHING
  RETURNING id, train_number, total_seats
)
INSERT INTO public.schedules (train_id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats)
SELECT i.id,
       d::date,
       n.dep,
       n.arr,
       c.cls,
       round(n.base * c.mult),
       greatest(12, floor(i.total_seats * c.share))::int
FROM ins i
JOIN newt n ON n.num = i.train_number
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + 44, interval '1 day') d
CROSS JOIN (VALUES ('SL',1.0,0.55),('3A',2.6,0.28),('2A',3.8,0.17)) AS c(cls,mult,share)
ON CONFLICT (train_id, journey_date, travel_class) DO NOTHING;