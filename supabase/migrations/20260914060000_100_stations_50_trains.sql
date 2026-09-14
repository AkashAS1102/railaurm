-- ==============================================================================
-- Migration: 100 Indian Railway Stations, 50 Trains, 60-Day Schedules & Admin RPC
-- ==============================================================================

-- 1. Ensure latitude and longitude exist on stations
ALTER TABLE public.stations
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- 2. Insert or update 100 Indian Railway Stations
INSERT INTO public.stations (station_code, station_name, city, latitude, longitude) VALUES
 ('NDLS', 'New Delhi', 'Delhi', 28.6425, 77.2192),
 ('CSMT', 'Chhatrapati Shivaji Maharaj Terminus', 'Mumbai', 18.9401, 72.8354),
 ('BCT', 'Mumbai Central', 'Mumbai', 18.9690, 72.8193),
 ('LTT', 'Lokmanya Tilak Terminus', 'Mumbai', 19.0699, 72.8911),
 ('BDTS', 'Bandra Terminus', 'Mumbai', 19.0620, 72.8407),
 ('HWH', 'Howrah Junction', 'Kolkata', 22.5839, 88.3425),
 ('SDAH', 'Sealdah', 'Kolkata', 22.5674, 88.3712),
 ('KOAA', 'Kolkata Chitpur', 'Kolkata', 22.6025, 88.3764),
 ('MAS', 'MGR Chennai Central', 'Chennai', 13.0827, 80.2757),
 ('MS', 'Chennai Egmore', 'Chennai', 13.0784, 80.2608),
 ('SBC', 'KSR Bengaluru', 'Bengaluru', 12.9776, 77.5713),
 ('YPR', 'Yesvantpur Junction', 'Bengaluru', 13.0238, 77.5503),
 ('SMVB', 'Sir M. Visvesvaraya Terminal', 'Bengaluru', 13.0033, 77.6547),
 ('HYB', 'Hyderabad Deccan', 'Hyderabad', 17.3850, 78.4867),
 ('SC', 'Secunderabad Junction', 'Hyderabad', 17.4334, 78.5015),
 ('KCG', 'Kacheguda', 'Hyderabad', 17.3879, 78.4983),
 ('PUNE', 'Pune Junction', 'Pune', 18.5286, 73.8743),
 ('ADI', 'Ahmedabad Junction', 'Ahmedabad', 23.0258, 72.5873),
 ('JP', 'Jaipur Junction', 'Jaipur', 26.9196, 75.7880),
 ('LKO', 'Lucknow Charbagh', 'Lucknow', 26.8310, 80.9231),
 ('LJN', 'Lucknow Junction', 'Lucknow', 26.8322, 80.9214),
 ('CNB', 'Kanpur Central', 'Kanpur', 26.4547, 80.3507),
 ('PRYJ', 'Prayagraj Junction', 'Prayagraj', 25.4484, 81.8333),
 ('BSB', 'Varanasi Junction', 'Varanasi', 25.3272, 82.9860),
 ('DDU', 'Pt. Deen Dayal Upadhyaya Junction', 'Mughalsarai', 25.2818, 83.1189),
 ('GKP', 'Gorakhpur Junction', 'Gorakhpur', 26.7598, 83.3814),
 ('PNBE', 'Patna Junction', 'Patna', 25.6019, 85.1376),
 ('GAYA', 'Gaya Junction', 'Gaya', 24.8028, 84.9996),
 ('DHN', 'Dhanbad Junction', 'Dhanbad', 23.7957, 86.4304),
 ('TATA', 'Tatanagar Junction', 'Jamshedpur', 22.7667, 86.2000),
 ('RNC', 'Ranchi Junction', 'Ranchi', 23.3441, 85.3240),
 ('BBS', 'Bhubaneswar', 'Bhubaneswar', 20.2666, 85.8436),
 ('CTC', 'Cuttack Junction', 'Cuttack', 20.4633, 85.8943),
 ('PURI', 'Puri Terminus', 'Puri', 19.8135, 85.8312),
 ('VSKP', 'Visakhapatnam Junction', 'Visakhapatnam', 17.7215, 83.2878),
 ('BZA', 'Vijayawada Junction', 'Vijayawada', 16.5186, 80.6200),
 ('TPTY', 'Tirupati', 'Tirupati', 13.6288, 79.4192),
 ('NGP', 'Nagpur Junction', 'Nagpur', 21.1527, 79.0882),
 ('BPL', 'Bhopal Junction', 'Bhopal', 23.2683, 77.4030),
 ('RKMP', 'Rani Kamlapati', 'Bhopal', 23.2081, 77.4419),
 ('GWL', 'Gwalior Junction', 'Gwalior', 26.2183, 78.1828),
 ('VGLJ', 'Virangana Lakshmibai Jhansi', 'Jhansi', 25.4484, 78.5685),
 ('AGC', 'Agra Cantt', 'Agra', 27.1593, 78.0050),
 ('MTJ', 'Mathura Junction', 'Mathura', 27.4924, 77.6737),
 ('ET', 'Itarsi Junction', 'Itarsi', 22.6128, 77.7607),
 ('JBP', 'Jabalpur Junction', 'Jabalpur', 23.1670, 79.9540),
 ('R', 'Raipur Junction', 'Raipur', 21.2514, 81.6296),
 ('BSP', 'Bilaspur Junction', 'Bilaspur', 22.0797, 82.1409),
 ('GHY', 'Guwahati', 'Guwahati', 26.1830, 91.7500),
 ('NJP', 'New Jalpaiguri', 'Siliguri', 26.6844, 88.4411),
 ('UMB', 'Ambala Cantt', 'Ambala', 30.3609, 76.8286),
 ('ASR', 'Amritsar Junction', 'Amritsar', 31.6340, 74.8723),
 ('JAT', 'Jammu Tawi', 'Jammu', 32.7060, 74.8797),
 ('SVDK', 'Shri Mata Vaishno Devi Katra', 'Katra', 32.9922, 74.9317),
 ('CDG', 'Chandigarh Junction', 'Chandigarh', 30.7020, 76.8197),
 ('DDN', 'Dehradun', 'Dehradun', 30.3165, 78.0322),
 ('HW', 'Haridwar Junction', 'Haridwar', 29.9457, 78.1642),
 ('ERS', 'Ernakulam Junction', 'Kochi', 9.9700, 76.2870),
 ('TVC', 'Thiruvananthapuram Central', 'Trivandrum', 8.4875, 76.9525),
 ('CLT', 'Kozhikode Main', 'Calicut', 11.2464, 75.7797),
 ('CBE', 'Coimbatore Junction', 'Coimbatore', 11.0016, 76.9628),
 ('MDU', 'Madurai Junction', 'Madurai', 9.9197, 78.1118),
 ('TPJ', 'Tiruchchirappalli Junction', 'Trichy', 10.7938, 78.6856),
 ('MYS', 'Mysuru Junction', 'Mysore', 12.3160, 76.6499),
 ('UBL', 'SSS Hubballi Junction', 'Hubli', 15.3524, 75.1479),
 ('MAO', 'Madgaon Junction', 'Goa', 15.2757, 73.9774),
 ('MAQ', 'Mangaluru Central', 'Mangalore', 12.8654, 74.8426),
 ('BKN', 'Bikaner Junction', 'Bikaner', 28.0167, 73.3119),
 ('JU', 'Jodhpur Junction', 'Jodhpur', 26.2837, 73.0207),
 ('AII', 'Ajmer Junction', 'Ajmer', 26.4525, 74.6399),
 ('UDZ', 'Udaipur City', 'Udaipur', 24.5775, 73.6975),
 ('KOTA', 'Kota Junction', 'Kota', 25.2235, 75.8770),
 ('RTM', 'Ratlam Junction', 'Ratlam', 23.3364, 75.0370),
 ('BRC', 'Vadodara Junction', 'Vadodara', 22.3107, 73.1812),
 ('ST', 'Surat', 'Surat', 21.2049, 72.8407),
 ('BVI', 'Borivali', 'Mumbai', 19.2290, 72.8573),
 ('TNA', 'Thane', 'Thane', 19.1860, 72.9759),
 ('KYN', 'Kalyan Junction', 'Kalyan', 19.2437, 73.1355),
 ('MMR', 'Manmad Junction', 'Manmad', 20.2524, 74.4363),
 ('BSL', 'Bhusaval Junction', 'Bhusaval', 21.0455, 75.7885),
 ('SUR', 'Solapur Junction', 'Solapur', 17.6599, 75.9064),
 ('WL', 'Warangal', 'Warangal', 17.9689, 79.5941),
 ('GNT', 'Guntur Junction', 'Guntur', 16.2997, 80.4437),
 ('RU', 'Renigunta Junction', 'Tirupati', 13.6489, 79.5133),
 ('DBRG', 'Dibrugarh', 'Dibrugarh', 27.4728, 94.9120),
 ('AGTL', 'Agartala', 'Agartala', 23.7950, 91.2722),
 ('ROU', 'Rourkela Junction', 'Rourkela', 22.2334, 84.8774),
 ('KGP', 'Kharagpur Junction', 'Kharagpur', 22.3435, 87.3228),
 ('ASN', 'Asansol Junction', 'Asansol', 23.6845, 86.9746),
 ('DGR', 'Durgapur', 'Durgapur', 23.4984, 87.3119),
 ('MLDT', 'Malda Town', 'Malda', 25.0108, 88.1411),
 ('KIR', 'Katihar Junction', 'Katihar', 25.5540, 87.5724),
 ('MFP', 'Muzaffarpur Junction', 'Muzaffarpur', 26.1226, 85.3906),
 ('CPR', 'Chhapra Junction', 'Chhapra', 25.7811, 84.7339),
 ('GD', 'Gonda Junction', 'Gonda', 27.1332, 81.9619),
 ('MB', 'Moradabad Junction', 'Moradabad', 28.8386, 78.7733),
 ('BE', 'Bareilly Junction', 'Bareilly', 28.3470, 79.4180),
 ('DLI', 'Old Delhi Junction', 'Delhi', 28.6619, 77.2280),
 ('NZM', 'Hazrat Nizamuddin', 'Delhi', 28.5892, 77.2530),
 ('ANVT', 'Anand Vihar Terminal', 'Delhi', 28.6508, 77.3153)
ON CONFLICT (station_code) DO UPDATE
SET station_name = EXCLUDED.station_name,
    city = EXCLUDED.city,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

-- 3. Insert or update 50 Trains
WITH train_data(num, nm, src, dst, seats, dep, arr, fare, cls_type) AS (VALUES
 -- Vande Bharat Expresses (Chair Car & Executive Chair Car)
 ('22436', 'Vande Bharat Express', 'NDLS', 'BSB', 530, '06:00'::time, '14:00'::time, 1750, 'VB'),
 ('22435', 'Vande Bharat Express Return', 'BSB', 'NDLS', 530, '15:00'::time, '23:00'::time, 1750, 'VB'),
 ('22439', 'Vande Bharat Express', 'NDLS', 'SVDK', 530, '06:00'::time, '14:00'::time, 1630, 'VB'),
 ('22440', 'Vande Bharat Express Return', 'SVDK', 'NDLS', 530, '15:00'::time, '23:00'::time, 1630, 'VB'),
 ('20901', 'Vande Bharat Express', 'CSMT', 'ADI', 530, '06:10'::time, '11:25'::time, 1420, 'VB'),
 ('20902', 'Vande Bharat Express Return', 'ADI', 'CSMT', 530, '15:00'::time, '20:25'::time, 1420, 'VB'),
 ('20607', 'Vande Bharat Express', 'MAS', 'MYS', 530, '05:50'::time, '12:20'::time, 1365, 'VB'),
 ('20608', 'Vande Bharat Express Return', 'MYS', 'MAS', 530, '13:05'::time, '19:30'::time, 1365, 'VB'),
 ('20833', 'Vande Bharat Express', 'VSKP', 'SC', 530, '05:45'::time, '14:15'::time, 1720, 'VB'),
 ('20834', 'Vande Bharat Express Return', 'SC', 'VSKP', 530, '15:00'::time, '23:30'::time, 1720, 'VB'),
 ('22301', 'Vande Bharat Express', 'HWH', 'NJP', 530, '05:55'::time, '13:25'::time, 1565, 'VB'),
 ('22302', 'Vande Bharat Express Return', 'NJP', 'HWH', 530, '15:05'::time, '22:35'::time, 1565, 'VB'),
 ('20171', 'Vande Bharat Express', 'RKMP', 'NZM', 530, '05:40'::time, '13:10'::time, 1665, 'VB'),
 ('20172', 'Vande Bharat Express Return', 'NZM', 'RKMP', 530, '14:40'::time, '22:10'::time, 1665, 'VB'),
 ('20661', 'Vande Bharat Express', 'SBC', 'UBL', 530, '05:45'::time, '10:45'::time, 1010, 'VB'),
 ('20662', 'Vande Bharat Express Return', 'UBL', 'SBC', 530, '13:15'::time, '18:20'::time, 1010, 'VB'),

 -- Rajdhani Expresses (3A, 2A, 1A)
 ('12951', 'Mumbai Rajdhani Express', 'BCT', 'NDLS', 620, '17:00'::time, '08:32'::time, 2150, 'RAJ'),
 ('12952', 'Mumbai Rajdhani Return', 'NDLS', 'BCT', 620, '16:55'::time, '08:35'::time, 2150, 'RAJ'),
 ('12301', 'Howrah Rajdhani Express', 'HWH', 'NDLS', 620, '16:50'::time, '10:05'::time, 2280, 'RAJ'),
 ('12302', 'Howrah Rajdhani Return', 'NDLS', 'HWH', 620, '16:55'::time, '09:55'::time, 2280, 'RAJ'),
 ('12423', 'Dibrugarh Rajdhani Express', 'DBRG', 'NDLS', 580, '20:55'::time, '10:30'::time, 2950, 'RAJ'),
 ('12424', 'Dibrugarh Rajdhani Return', 'NDLS', 'DBRG', 580, '16:10'::time, '07:00'::time, 2950, 'RAJ'),
 ('12309', 'Patna Rajdhani Express', 'PNBE', 'NDLS', 580, '19:25'::time, '07:40'::time, 1850, 'RAJ'),
 ('12310', 'Patna Rajdhani Return', 'NDLS', 'PNBE', 580, '17:10'::time, '05:15'::time, 1850, 'RAJ'),
 ('12431', 'Trivandrum Rajdhani', 'TVC', 'NZM', 580, '19:15'::time, '12:30'::time, 3350, 'RAJ'),
 ('12432', 'Trivandrum Rajdhani Return', 'NZM', 'TVC', 580, '06:16'::time, '23:35'::time, 3350, 'RAJ'),
 ('12437', 'Secunderabad Rajdhani', 'SC', 'NZM', 580, '12:45'::time, '10:30'::time, 2450, 'RAJ'),
 ('12438', 'Secunderabad Rajdhani Return', 'NZM', 'SC', 580, '15:35'::time, '13:35'::time, 2450, 'RAJ'),
 ('12433', 'Chennai Rajdhani Express', 'MAS', 'NZM', 580, '06:05'::time, '10:30'::time, 2780, 'RAJ'),
 ('12434', 'Chennai Rajdhani Return', 'NZM', 'MAS', 580, '15:35'::time, '20:45'::time, 2780, 'RAJ'),
 ('12425', 'Jammu Rajdhani Express', 'NDLS', 'JAT', 580, '20:40'::time, '05:00'::time, 1540, 'RAJ'),
 ('12426', 'Jammu Rajdhani Return', 'JAT', 'NDLS', 580, '21:25'::time, '05:55'::time, 1540, 'RAJ'),
 ('12957', 'Swarna Jayanti Rajdhani', 'ADI', 'NDLS', 580, '17:45'::time, '07:30'::time, 1890, 'RAJ'),
 ('12958', 'Swarna Jayanti Rajdhani Return', 'NDLS', 'ADI', 580, '19:55'::time, '09:30'::time, 1890, 'RAJ'),

 -- Shatabdi Expresses (CC, EC)
 ('12002', 'Bhopal Shatabdi Express', 'NDLS', 'RKMP', 500, '06:00'::time, '14:40'::time, 1485, 'VB'),
 ('12001', 'Bhopal Shatabdi Return', 'RKMP', 'NDLS', 500, '15:15'::time, '23:50'::time, 1485, 'VB'),
 ('12004', 'Lucknow Shatabdi Express', 'NDLS', 'LKO', 500, '06:10'::time, '12:40'::time, 1165, 'VB'),
 ('12003', 'Lucknow Shatabdi Return', 'LKO', 'NDLS', 500, '15:35'::time, '22:20'::time, 1165, 'VB'),
 ('12015', 'Ajmer Shatabdi Express', 'NDLS', 'AII', 500, '06:10'::time, '12:55'::time, 1090, 'VB'),
 ('12016', 'Ajmer Shatabdi Return', 'AII', 'NDLS', 500, '15:55'::time, '22:40'::time, 1090, 'VB'),
 ('12027', 'Bengaluru Shatabdi Express', 'MAS', 'SBC', 500, '17:30'::time, '22:25'::time, 980, 'VB'),
 ('12028', 'Bengaluru Shatabdi Return', 'SBC', 'MAS', 500, '06:00'::time, '11:00'::time, 980, 'VB'),
 ('12009', 'Ahmedabad Shatabdi Express', 'BCT', 'ADI', 500, '06:20'::time, '12:45'::time, 1350, 'VB'),
 ('12010', 'Ahmedabad Shatabdi Return', 'ADI', 'BCT', 500, '15:10'::time, '21:45'::time, 1350, 'VB'),

 -- Duronto & Superfast Flagships (SL, 3A, 2A, 1A)
 ('12290', 'Nagpur Duronto Express', 'NGP', 'CSMT', 700, '20:40'::time, '08:05'::time, 1120, 'SF'),
 ('12289', 'Mumbai Duronto Express', 'CSMT', 'NGP', 700, '20:15'::time, '07:20'::time, 1120, 'SF'),
 ('12621', 'Tamil Nadu Express', 'MAS', 'NDLS', 850, '22:00'::time, '06:30'::time, 840, 'SF'),
 ('12622', 'Tamil Nadu Express Return', 'NDLS', 'MAS', 850, '21:05'::time, '06:15'::time, 840, 'SF'),
 ('12627', 'Karnataka Express', 'SBC', 'NDLS', 850, '19:20'::time, '09:00'::time, 860, 'SF'),
 ('12628', 'Karnataka Express Return', 'NDLS', 'SBC', 850, '20:20'::time, '12:00'::time, 860, 'SF')
)
INSERT INTO public.trains (train_number, train_name, source_station_id, destination_station_id, total_seats)
SELECT d.num, d.nm, s.id, t.id, d.seats
FROM train_data d
JOIN public.stations s ON s.station_code = d.src
JOIN public.stations t ON t.station_code = d.dst
ON CONFLICT (train_number) DO UPDATE
SET train_name = EXCLUDED.train_name,
    total_seats = EXCLUDED.total_seats,
    source_station_id = EXCLUDED.source_station_id,
    destination_station_id = EXCLUDED.destination_station_id;

-- 4. Populate train stops (Timetable for Live Map)
INSERT INTO public.train_stops (train_id, station_id, stop_order, arrival_time, departure_time, day_offset, distance_km, halt_minutes)
SELECT tr.id, tr.source_station_id, 1, NULL, s.departure_time, 0, 0, 0
FROM public.trains tr
CROSS JOIN LATERAL (
  SELECT departure_time FROM (VALUES
   ('22436','06:00'::time),('22435','15:00'::time),('22439','06:00'::time),('22440','15:00'::time),
   ('20901','06:10'::time),('20902','15:00'::time),('20607','05:50'::time),('20608','13:05'::time),
   ('20833','05:45'::time),('20834','15:00'::time),('22301','05:55'::time),('22302','15:05'::time),
   ('20171','05:40'::time),('20172','14:40'::time),('20661','05:45'::time),('20662','13:15'::time),
   ('12951','17:00'::time),('12952','16:55'::time),('12301','16:50'::time),('12302','16:55'::time),
   ('12423','20:55'::time),('12424','16:10'::time),('12309','19:25'::time),('12310','17:10'::time),
   ('12431','19:15'::time),('12432','06:16'::time),('12437','12:45'::time),('12438','15:35'::time),
   ('12433','06:05'::time),('12434','15:35'::time),('12425','20:40'::time),('12426','21:25'::time),
   ('12957','17:45'::time),('12958','19:55'::time),('12002','06:00'::time),('12001','15:15'::time),
   ('12004','06:10'::time),('12003','15:35'::time),('12015','06:10'::time),('12016','15:55'::time),
   ('12027','17:30'::time),('12028','06:00'::time),('12009','06:20'::time),('12010','15:10'::time),
   ('12290','20:40'::time),('12289','20:15'::time),('12621','22:00'::time),('12622','21:05'::time),
   ('12627','19:20'::time),('12628','20:20'::time)
  ) AS t(num, departure_time)
  WHERE t.num = tr.train_number
) s
ON CONFLICT (train_id, stop_order) DO UPDATE
SET departure_time = EXCLUDED.departure_time;

INSERT INTO public.train_stops (train_id, station_id, stop_order, arrival_time, departure_time, day_offset, distance_km, halt_minutes)
SELECT tr.id, tr.destination_station_id, 2, s.arrival_time, NULL, 0, 800, 0
FROM public.trains tr
CROSS JOIN LATERAL (
  SELECT arrival_time FROM (VALUES
   ('22436','14:00'::time),('22435','23:00'::time),('22439','14:00'::time),('22440','23:00'::time),
   ('20901','11:25'::time),('20902','20:25'::time),('20607','12:20'::time),('20608','19:30'::time),
   ('20833','14:15'::time),('20834','23:30'::time),('22301','13:25'::time),('22302','22:35'::time),
   ('20171','13:10'::time),('20172','22:10'::time),('20661','10:45'::time),('20662','18:20'::time),
   ('12951','08:32'::time),('12952','08:35'::time),('12301','10:05'::time),('12302','09:55'::time),
   ('12423','10:30'::time),('12424','07:00'::time),('12309','07:40'::time),('12310','05:15'::time),
   ('12431','12:30'::time),('12432','23:35'::time),('12437','10:30'::time),('12438','13:35'::time),
   ('12433','10:30'::time),('12434','20:45'::time),('12425','05:00'::time),('12426','05:55'::time),
   ('12957','07:30'::time),('12958','09:30'::time),('12002','14:40'::time),('12001','23:50'::time),
   ('12004','12:40'::time),('12003','22:20'::time),('12015','12:55'::time),('12016','22:40'::time),
   ('12027','22:25'::time),('12028','11:00'::time),('12009','12:45'::time),('12010','21:45'::time),
   ('12290','08:05'::time),('12289','07:20'::time),('12621','06:30'::time),('12622','06:15'::time),
   ('12627','09:00'::time),('12628','12:00'::time)
  ) AS t(num, arrival_time)
  WHERE t.num = tr.train_number
) s
ON CONFLICT (train_id, stop_order) DO UPDATE
SET arrival_time = EXCLUDED.arrival_time;

-- 5. Generate Recurring Schedules for the next 60 days
-- For Vande Bharat & Shatabdi (CC and EC)
INSERT INTO public.schedules (train_id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats)
SELECT tr.id,
       d::date,
       ts1.departure_time,
       ts2.arrival_time,
       c.cls,
       round(c.base_multiplier * (1200 + (('x' || substr(md5(tr.train_number), 1, 4))::bit(16)::int % 500))),
       (tr.total_seats * c.share)::int
FROM public.trains tr
JOIN public.train_stops ts1 ON ts1.train_id = tr.id AND ts1.stop_order = 1
JOIN public.train_stops ts2 ON ts2.train_id = tr.id AND ts2.stop_order = 2
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + 60, interval '1 day') AS d
CROSS JOIN (VALUES
  ('CC', 1.0, 0.8),
  ('EC', 1.8, 0.2)
) AS c(cls, base_multiplier, share)
WHERE tr.train_number IN ('22436','22435','22439','22440','20901','20902','20607','20608','20833','20834','22301','22302','20171','20172','20661','20662','12002','12001','12004','12003','12015','12016','12027','12028','12009','12010')
ON CONFLICT (train_id, journey_date, travel_class) DO NOTHING;

-- For Rajdhani, Duronto & Superfast (SL, 3A, 2A, 1A)
INSERT INTO public.schedules (train_id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats)
SELECT tr.id,
       d::date,
       ts1.departure_time,
       ts2.arrival_time,
       c.cls,
       round(c.base_multiplier * (800 + (('x' || substr(md5(tr.train_number), 1, 4))::bit(16)::int % 700))),
       greatest(20, (tr.total_seats * c.share)::int)
FROM public.trains tr
JOIN public.train_stops ts1 ON ts1.train_id = tr.id AND ts1.stop_order = 1
JOIN public.train_stops ts2 ON ts2.train_id = tr.id AND ts2.stop_order = 2
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + 60, interval '1 day') AS d
CROSS JOIN (VALUES
  ('SL', 1.0, 0.45),
  ('3A', 2.3, 0.35),
  ('2A', 3.4, 0.15),
  ('1A', 5.0, 0.05)
) AS c(cls, base_multiplier, share)
WHERE tr.train_number NOT IN ('22436','22435','22439','22440','20901','20902','20607','20608','20833','20834','22301','22302','20171','20172','20661','20662','12002','12001','12004','12003','12015','12016','12027','12028','12009','12010')
ON CONFLICT (train_id, journey_date, travel_class) DO NOTHING;

-- 6. Add grant_admin_by_email RPC
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_user_id uuid;
  v_clean_email text := lower(trim(p_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only existing administrators can grant admin privileges.';
  END IF;

  IF v_clean_email = '' OR v_clean_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please enter a valid email address.');
  END IF;

  -- 1. Try finding in public.profiles
  SELECT id INTO v_user_id FROM public.profiles WHERE lower(email) = v_clean_email LIMIT 1;

  -- 2. Try finding in auth.users if not in profiles yet
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_clean_email LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User with email "' || p_email || '" was not found. Please ask them to sign up on RailAurum first.'
    );
  END IF;

  -- Grant the admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Admin privileges granted to ' || p_email || '.',
    'user_id', v_user_id
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.grant_admin_by_email(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;
