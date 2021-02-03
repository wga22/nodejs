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

--max entries
select max(tp_entry_id) from tesla.solar_panel;


--max stuff
select max(batt_volt) from tesla.solar_panel spl;
select max(batt_current) from tesla.solar_panel spl;
select max(panel_volt) from tesla.solar_panel spl;
select max(lifetime_power) from tesla.solar_panel spl;
select max(daily_max_power) from tesla.solar_panel spl;
select max(daily_yield) from tesla.solar_panel spl;

--best days
select sp1.mbv batt_volt, sp2.created_at::date  from tesla.solar_panel sp2, (select max(batt_volt) as mbv from tesla.solar_panel) as sp1 where sp1.mbv = sp2.batt_volt;
select sp1.mbv batt_current, sp2.created_at::date  from tesla.solar_panel sp2, (select max(batt_current) as mbv from tesla.solar_panel) as sp1 where sp1.mbv = sp2.batt_current;
select sp1.mbv panel_volt, sp2.created_at::date  from tesla.solar_panel sp2, (select max(panel_volt) as mbv from tesla.solar_panel) as sp1 where sp1.mbv = sp2.panel_volt;
select sp1.mbv lifetime_power, sp2.created_at::date  from tesla.solar_panel sp2, (select max(lifetime_power) as mbv from tesla.solar_panel) as sp1 where sp1.mbv = sp2.lifetime_power;
select sp1.mbv daily_max_power, sp2.created_at::date  from tesla.solar_panel sp2, (select max(daily_max_power) as mbv from tesla.solar_panel) as sp1 where sp1.mbv = sp2.daily_max_power;
select sp1.mbv daily_yield, sp2.created_at::date  from tesla.solar_panel sp2, (select max(daily_yield) as mbv from tesla.solar_panel) as sp1 where sp1.mbv = sp2.daily_yield;



