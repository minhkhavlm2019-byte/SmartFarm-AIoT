BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "action_logs" (
	"log_id"	INTEGER NOT NULL,
	"device_id"	VARCHAR(50),
	"timestamp"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"action"	VARCHAR(9),
	"trigger"	VARCHAR(8),
	"reason"	VARCHAR(255),
	PRIMARY KEY("log_id"),
	FOREIGN KEY("device_id") REFERENCES "devices"("device_id")
);
CREATE TABLE IF NOT EXISTS "devices" (
	"device_id"	VARCHAR(50) NOT NULL,
	"zone_id"	INTEGER,
	"name"	VARCHAR(100),
	"status"	VARCHAR(7),
	"last_seen"	DATETIME,
	"fw_version"	VARCHAR(20),
	PRIMARY KEY("device_id"),
	FOREIGN KEY("zone_id") REFERENCES "zones"("zone_id")
);
CREATE TABLE IF NOT EXISTS "sensor_data" (
	"id"	INTEGER NOT NULL,
	"device_id"	VARCHAR(50),
	"timestamp"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	"temp"	FLOAT,
	"hum_air"	FLOAT,
	"hum_soil"	FLOAT,
	"light"	FLOAT,
	PRIMARY KEY("id"),
	FOREIGN KEY("device_id") REFERENCES "devices"("device_id")
);
CREATE TABLE IF NOT EXISTS "users" (
	"user_id"	INTEGER NOT NULL,
	"username"	VARCHAR(50) NOT NULL,
	"password_hash"	VARCHAR(255) NOT NULL,
	"full_name"	VARCHAR(100),
	"email"	VARCHAR(100),
	"role"	VARCHAR(6),
	"is_active"	BOOLEAN,
	"created_at"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("user_id")
);
CREATE TABLE IF NOT EXISTS "zone_settings" (
	"setting_id"	INTEGER NOT NULL,
	"zone_id"	INTEGER,
	"min_soil_moisture"	FLOAT,
	"max_soil_moisture"	FLOAT,
	"heat_shock_temp"	FLOAT,
	"pump_duration"	INTEGER,
	"mist_duration"	INTEGER,
	"mode"	VARCHAR(20),
	PRIMARY KEY("setting_id"),
	UNIQUE("zone_id"),
	FOREIGN KEY("zone_id") REFERENCES "zones"("zone_id")
);
CREATE TABLE IF NOT EXISTS "zones" (
	"zone_id"	INTEGER NOT NULL,
	"name"	VARCHAR(100) NOT NULL,
	"description"	VARCHAR(255),
	"crop_type"	VARCHAR(50),
	"owner_id"	INTEGER,
	"technician_id"	INTEGER,
	"farmer_id"	INTEGER,
	PRIMARY KEY("zone_id"),
	FOREIGN KEY("farmer_id") REFERENCES "users"("user_id"),
	FOREIGN KEY("owner_id") REFERENCES "users"("user_id"),
	FOREIGN KEY("technician_id") REFERENCES "users"("user_id")
);
INSERT INTO "devices" ("device_id","zone_id","name","status","last_seen","fw_version") VALUES ('ESP32_WOKWI_01',1,'New ESP32 (I_01)','ONLINE','2026-02-18 07:59:36.619093',NULL);
INSERT INTO "devices" ("device_id","zone_id","name","status","last_seen","fw_version") VALUES ('ESP32_REALX23_01',2,'ESP32 VƯỜN CẢI NGỌT','OFFLINE',NULL,NULL);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (1,'ESP32_WOKWI_01','2026-02-14 00:22:56',24.0,40.0,0.0,0.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (2,'ESP32_WOKWI_01','2026-02-14 00:23:11',24.0,40.0,0.0,0.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (3,'ESP32_WOKWI_01','2026-02-14 00:23:25',24.0,40.0,0.0,0.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (4,'ESP32_WOKWI_01','2026-02-17 10:02:36',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (5,'ESP32_WOKWI_01','2026-02-17 10:02:41',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (6,'ESP32_WOKWI_01','2026-02-17 10:02:47',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (7,'ESP32_WOKWI_01','2026-02-17 10:02:52',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (8,'ESP32_WOKWI_01','2026-02-17 10:02:58',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (9,'ESP32_WOKWI_01','2026-02-17 10:03:03',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (10,'ESP32_WOKWI_01','2026-02-17 10:03:08',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (11,'ESP32_WOKWI_01','2026-02-17 10:03:14',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (12,'ESP32_WOKWI_01','2026-02-17 10:03:19',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (13,'ESP32_WOKWI_01','2026-02-17 10:03:25',45.59999847,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (14,'ESP32_WOKWI_01','2026-02-17 10:03:30',45.59999847,40.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (15,'ESP32_WOKWI_01','2026-02-17 10:03:36',45.59999847,40.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (16,'ESP32_WOKWI_01','2026-02-17 10:03:41',45.59999847,40.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (17,'ESP32_WOKWI_01','2026-02-17 10:03:46',45.59999847,40.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (18,'ESP32_WOKWI_01','2026-02-17 10:03:52',45.59999847,40.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (19,'ESP32_WOKWI_01','2026-02-17 10:03:57',45.59999847,40.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (20,'ESP32_WOKWI_01','2026-02-18 00:50:22',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (21,'ESP32_WOKWI_01','2026-02-18 00:50:28',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (22,'ESP32_WOKWI_01','2026-02-18 00:50:34',24.0,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (23,'ESP32_WOKWI_01','2026-02-18 00:50:40',6.5,60.0,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (24,'ESP32_WOKWI_01','2026-02-18 00:50:45',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (25,'ESP32_WOKWI_01','2026-02-18 00:50:51',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (26,'ESP32_WOKWI_01','2026-02-18 00:50:57',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (27,'ESP32_WOKWI_01','2026-02-18 00:51:03',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (28,'ESP32_WOKWI_01','2026-02-18 00:51:09',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (29,'ESP32_WOKWI_01','2026-02-18 00:51:16',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (30,'ESP32_WOKWI_01','2026-02-18 00:51:22',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (31,'ESP32_WOKWI_01','2026-02-18 00:51:29',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (32,'ESP32_WOKWI_01','2026-02-18 00:51:35',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (33,'ESP32_WOKWI_01','2026-02-18 00:51:42',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (34,'ESP32_WOKWI_01','2026-02-18 00:51:48',6.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (35,'ESP32_WOKWI_01','2026-02-18 00:51:54',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (36,'ESP32_WOKWI_01','2026-02-18 00:52:00',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (37,'ESP32_WOKWI_01','2026-02-18 00:52:06',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (38,'ESP32_WOKWI_01','2026-02-18 00:52:13',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (39,'ESP32_WOKWI_01','2026-02-18 00:52:18',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (40,'ESP32_WOKWI_01','2026-02-18 00:52:25',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (41,'ESP32_WOKWI_01','2026-02-18 00:52:31',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (42,'ESP32_WOKWI_01','2026-02-18 00:52:38',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (43,'ESP32_WOKWI_01','2026-02-18 00:52:44',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (44,'ESP32_WOKWI_01','2026-02-18 00:52:50',37.5,69.5,0.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (45,'ESP32_WOKWI_01','2026-02-18 00:52:56',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (46,'ESP32_WOKWI_01','2026-02-18 00:53:02',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (47,'ESP32_WOKWI_01','2026-02-18 00:53:09',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (48,'ESP32_WOKWI_01','2026-02-18 00:53:15',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (49,'ESP32_WOKWI_01','2026-02-18 00:53:20',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (50,'ESP32_WOKWI_01','2026-02-18 00:53:26',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (51,'ESP32_WOKWI_01','2026-02-18 00:53:33',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (52,'ESP32_WOKWI_01','2026-02-18 00:53:39',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (53,'ESP32_WOKWI_01','2026-02-18 00:53:44',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (54,'ESP32_WOKWI_01','2026-02-18 00:53:51',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (55,'ESP32_WOKWI_01','2026-02-18 00:53:56',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (56,'ESP32_WOKWI_01','2026-02-18 00:54:02',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (57,'ESP32_WOKWI_01','2026-02-18 00:54:08',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (58,'ESP32_WOKWI_01','2026-02-18 00:54:14',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (59,'ESP32_WOKWI_01','2026-02-18 00:54:20',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (60,'ESP32_WOKWI_01','2026-02-18 00:54:26',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (61,'ESP32_WOKWI_01','2026-02-18 00:54:32',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (62,'ESP32_WOKWI_01','2026-02-18 00:54:38',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (63,'ESP32_WOKWI_01','2026-02-18 00:54:44',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (64,'ESP32_WOKWI_01','2026-02-18 00:54:49',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (65,'ESP32_WOKWI_01','2026-02-18 00:54:55',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (66,'ESP32_WOKWI_01','2026-02-18 00:55:02',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (67,'ESP32_WOKWI_01','2026-02-18 00:55:07',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (68,'ESP32_WOKWI_01','2026-02-18 00:55:13',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (69,'ESP32_WOKWI_01','2026-02-18 00:55:20',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (70,'ESP32_WOKWI_01','2026-02-18 00:55:25',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (71,'ESP32_WOKWI_01','2026-02-18 00:55:31',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (72,'ESP32_WOKWI_01','2026-02-18 00:55:37',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (73,'ESP32_WOKWI_01','2026-02-18 00:55:43',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (74,'ESP32_WOKWI_01','2026-02-18 00:55:49',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (75,'ESP32_WOKWI_01','2026-02-18 00:55:56',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (76,'ESP32_WOKWI_01','2026-02-18 00:56:01',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (77,'ESP32_WOKWI_01','2026-02-18 00:56:08',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (78,'ESP32_WOKWI_01','2026-02-18 00:56:14',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (79,'ESP32_WOKWI_01','2026-02-18 00:56:21',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (80,'ESP32_WOKWI_01','2026-02-18 00:56:27',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (81,'ESP32_WOKWI_01','2026-02-18 00:56:34',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (82,'ESP32_WOKWI_01','2026-02-18 00:56:40',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (83,'ESP32_WOKWI_01','2026-02-18 00:56:46',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (84,'ESP32_WOKWI_01','2026-02-18 00:56:53',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (85,'ESP32_WOKWI_01','2026-02-18 00:56:59',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (86,'ESP32_WOKWI_01','2026-02-18 00:57:05',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (87,'ESP32_WOKWI_01','2026-02-18 00:57:11',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (88,'ESP32_WOKWI_01','2026-02-18 00:57:16',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (89,'ESP32_WOKWI_01','2026-02-18 00:57:23',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (90,'ESP32_WOKWI_01','2026-02-18 00:57:29',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (91,'ESP32_WOKWI_01','2026-02-18 00:57:35',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (92,'ESP32_WOKWI_01','2026-02-18 00:57:41',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (93,'ESP32_WOKWI_01','2026-02-18 00:57:47',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (94,'ESP32_WOKWI_01','2026-02-18 00:57:53',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (95,'ESP32_WOKWI_01','2026-02-18 00:58:00',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (96,'ESP32_WOKWI_01','2026-02-18 00:58:05',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (97,'ESP32_WOKWI_01','2026-02-18 00:58:11',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (98,'ESP32_WOKWI_01','2026-02-18 00:58:17',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (99,'ESP32_WOKWI_01','2026-02-18 00:58:23',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (100,'ESP32_WOKWI_01','2026-02-18 00:58:29',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (101,'ESP32_WOKWI_01','2026-02-18 00:58:35',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (102,'ESP32_WOKWI_01','2026-02-18 00:58:41',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (103,'ESP32_WOKWI_01','2026-02-18 00:58:48',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (104,'ESP32_WOKWI_01','2026-02-18 00:58:53',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (105,'ESP32_WOKWI_01','2026-02-18 00:58:59',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (106,'ESP32_WOKWI_01','2026-02-18 00:59:05',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (107,'ESP32_WOKWI_01','2026-02-18 00:59:11',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (108,'ESP32_WOKWI_01','2026-02-18 00:59:17',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (109,'ESP32_WOKWI_01','2026-02-18 00:59:24',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (110,'ESP32_WOKWI_01','2026-02-18 00:59:30',37.5,69.5,41.0,24.0);
INSERT INTO "sensor_data" ("id","device_id","timestamp","temp","hum_air","hum_soil","light") VALUES (111,'ESP32_WOKWI_01','2026-02-18 00:59:36',37.5,69.5,41.0,24.0);
INSERT INTO "users" ("user_id","username","password_hash","full_name","email","role","is_active","created_at") VALUES (1,'admin','$2b$12$4cJJv4RgSSso9/9uHrvJS.YTiMpmF1T0360du9RyjBQHD8Zq.DOoi','Super Admin',NULL,'ADMIN',1,'2026-02-12 02:41:34');
INSERT INTO "users" ("user_id","username","password_hash","full_name","email","role","is_active","created_at") VALUES (2,'tech','$2b$12$yPTljbN7CnHZu/oid.0vOO8ruAuFTHIybWo4AaNGzIlVCGHNjABK6','Kỹ Thuật Viên',NULL,'FARMER',1,'2026-02-12 03:42:38');
INSERT INTO "users" ("user_id","username","password_hash","full_name","email","role","is_active","created_at") VALUES (3,'tech1','$2b$12$r8fTRmDtfrrVpAmP0JaghOt2PWwgkBbZN8txmeB9o.itXMpgyew4S','KTV',NULL,'FARMER',1,'2026-02-12 03:43:34');
INSERT INTO "users" ("user_id","username","password_hash","full_name","email","role","is_active","created_at") VALUES (4,'techa','$2b$12$AVqUL976MGnj0AaqukYEAeiAYzZxMBvfXpGjkubidpJoorGQBRT5e','techa',NULL,'TECH',1,'2026-02-12 03:49:58');
INSERT INTO "zones" ("zone_id","name","description","crop_type","owner_id","technician_id","farmer_id") VALUES (1,'Vườn xà lách','trồng xà lách ăn tết','Rau Cải',1,4,2);
INSERT INTO "zones" ("zone_id","name","description","crop_type","owner_id","technician_id","farmer_id") VALUES (2,'Vườn cải ngọt','trồng cải ngọt bán lấy tiền','Rau Cải',1,4,2);
CREATE INDEX IF NOT EXISTS "ix_action_logs_log_id" ON "action_logs" (
	"log_id"
);
CREATE INDEX IF NOT EXISTS "ix_sensor_data_id" ON "sensor_data" (
	"id"
);
CREATE INDEX IF NOT EXISTS "ix_users_user_id" ON "users" (
	"user_id"
);
CREATE UNIQUE INDEX IF NOT EXISTS "ix_users_username" ON "users" (
	"username"
);
CREATE INDEX IF NOT EXISTS "ix_zone_settings_setting_id" ON "zone_settings" (
	"setting_id"
);
CREATE INDEX IF NOT EXISTS "ix_zones_zone_id" ON "zones" (
	"zone_id"
);
COMMIT;
