create table tesla.solar_panel(
	entry_id SERIAL PRIMARY KEY,
	tp_entry_id integer,
	created_at timestamp DEFAULT current_timestamp,
	batt_volt integer,
	batt_current integer,
	panel_volt integer,
	lifetime_power integer,
	charge_state integer,
	load_current integer,
	daily_yield integer,
	daily_max_power integer,
	CONSTRAINT pkey2 UNIQUE(entry_id)
);

--		{"dbname":"created_at", "dbtype":"timestamp", "tp_field":"created_at"},
--		{"dbname":"tp_entry_id", "dbtype":"int", "tp_field":"entry_id"},
--		{"dbname":"batt_volt", "dbtype":"int", "tp_field":"field1"},
--		{"dbname":"batt_current", "dbtype":"int", "tp_field":"field2"},
--		{"dbname":"panel_volt", "dbtype":"int", "tp_field":"field3"},
--		{"dbname":"lifetime_power", "dbtype":"int", "tp_field":"field4"},
--		{"dbname":"charge_state", "dbtype":"int", "tp_field":"field5"},
--		{"dbname":"load_current", "dbtype":"int", "tp_field":"field6"},
--		{"dbname":"daily_yield", "dbtype":"int", "tp_field":"field7"},
--		{"dbname":"daily_max_power", "dbtype":"int", "tp_field":"field8"}

--------

INSERT INTO tesla.solar_panel
(tp_entry_id, created_at, batt_volt, batt_current, panel_volt, lifetime_power, charge_state, load_current, daily_yield, daily_max_power)
VALUES(0, now(), 0, 0, 0, 0, 0, 0, 0, 0);

INSERT INTO tesla.tesla_logs
(created_at,
tp_entry_id,
 battery_level,
 speed,
heading,
 battery_range,
 est_battery_range,
 ideal_battery_range,
 latitude,
 longitude,
 car_version)
values
('2019-01-30 06:17:06 EST',26455,75,null,48537.093528,175.26,136.78,218.69,38.924889,-77.278816,'2018.48.12.1 d6999f5'),
('2019-01-30 07:17:08 EST',26456,75,null,48537.093528,175.26,136.78,218.69,38.924889,-77.278816,'2018.48.12.1 d6999f5'),

--max entries
select max(tp_entry_id) from tesla.tesla_logs tl;

--versions
select car_version, count(*), max(created_at) from tesla.tesla_logs tl group by car_version order by max(created_at);

--max speed
select max(speed) from tesla.tesla_logs tl;

--furthest
select latitude, longitude, 
((sqrt(power((latitude-38.924874),2)+power((longitude+77.278824),2)))*55) as dist_approx_miles
from tesla.tesla_logs tl
where latitude is not null and longitude is not null
order by dist_approx_miles desc;

--battery range per level
select t1.battery_level, Max(t1.battery_range) as max_range, min(t1.battery_range) min_range, 
max(t1.created_at ) created
from tesla.tesla_logs t1
where t1.battery_level is not null and t1.battery_range is not null
group by t1.battery_level
order by t1.battery_level desc;

--battery loss per battery level (with max and min dates)
select t1.battery_level, max(t1.battery_range) as max_range, min(t1.battery_range) min_range, 
round((max(t1.battery_range)-min(t1.battery_range))/min(t1.battery_range)*100) as perc_diff,
(select t2.created_at from tesla.tesla_logs t2 where t2.battery_level = t1.battery_level and max(t1.battery_range) = t2.battery_range order by t2.created_at desc limit 1) as time_of_max,
(select t3.created_at from tesla.tesla_logs t3 where t3.battery_level = t1.battery_level and min(t1.battery_range) = t3.battery_range order by t3.created_at desc limit 1) as time_of_min
from tesla.tesla_logs t1
where t1.battery_level is not null and t1.battery_range is not null
group by t1.battery_level
order by t1.battery_level desc




