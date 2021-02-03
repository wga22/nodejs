create table tesla.attic_temps(
	entry_id SERIAL PRIMARY KEY,
	tp_entry_id integer,
	created_at timestamp DEFAULT current_timestamp,
	attic_temp real,
	attic_humidity real,
	internet_temp real,
	CONSTRAINT pkey_attic_temps UNIQUE(entry_id)
);

--------

INSERT INTO tesla.attic_temps
(tp_entry_id, created_at, attic_temp, attic_humidity, internet_temp)
VALUES(0, now(), 0, 0, 0);

select * from
(select count(*) row_count from tesla.attic_temps) sp1,
(select max(attic_temp) max_attic_temp from tesla.attic_temps) sp2,
(select max(attic_humidity) max_attic_humidity  from tesla.attic_temps) sp3,
(select max(internet_temp) max_internet_temp from tesla.attic_temps) sp4;



select max(attic_temp) from tesla.attic_temps spl;
select max(attic_humidity) from tesla.attic_temps spl;
select max(internet_temp) from tesla.attic_temps spl;

--best days
select sp1.mbv attic_temp, sp2.created_at::date  from tesla.attic_temps sp2, (select max(attic_temp) as mbv from tesla.attic_temps) as sp1 where sp1.mbv = sp2.attic_temp;
select sp1.mbv attic_humidity, sp2.created_at::date  from tesla.attic_temps sp2, (select max(attic_humidity) as mbv from tesla.attic_temps) as sp1 where sp1.mbv = sp2.attic_humidity;
select sp1.mbv internet_temp, sp2.created_at::date  from tesla.attic_temps sp2, (select max(internet_temp) as mbv from tesla.attic_temps) as sp1 where sp1.mbv = sp2.internet_temp;



