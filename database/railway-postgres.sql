-- MySQL 8.0 / MariaDB schema and seed data for Railway.
-- Run this file once in the Railway MySQL Query tab or with the mysql CLI.
-- The filename is retained for continuity; its contents are MySQL, not PostgreSQL.
--
-- IMPORTANT: password_hash contains bcrypt values. The application must verify
-- these hashes on the server and must never return them to the browser.

CREATE TABLE IF NOT EXISTS data_student (
  student_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fullname VARCHAR(255) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  gender VARCHAR(30) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  symptom VARCHAR(30) NOT NULL DEFAULT '',
  other_symptom VARCHAR(255) NOT NULL DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id),
  CONSTRAINT data_student_age_check CHECK (age <= 130)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_admin (
  admin_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL,
  permissions JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id),
  UNIQUE KEY data_admin_admin_name_uq (admin_name),
  CONSTRAINT data_admin_role_check CHECK (role IN ('Super Admin', 'Admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_product (
  product_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  image_url TEXT NULL,
  description TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  CONSTRAINT data_product_price_check CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_payment (
  payment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  course VARCHAR(30) NOT NULL,
  level VARCHAR(30) NOT NULL,
  payment_date DATE NOT NULL,
  start_study DATE NOT NULL,
  end_study DATE NOT NULL,
  time_study INT UNSIGNED NOT NULL,
  no_of_weeks INT UNSIGNED NOT NULL,
  usd DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  place VARCHAR(30) NOT NULL,
  PRIMARY KEY (payment_id),
  KEY data_payment_student_id_idx (student_id),
  KEY data_payment_payment_date_idx (payment_date),
  CONSTRAINT data_payment_student_fk FOREIGN KEY (student_id)
    REFERENCES data_student(student_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT data_payment_dates_check CHECK (end_study >= start_study),
  CONSTRAINT data_payment_time_check CHECK (time_study > 0 AND no_of_weeks > 0),
  CONSTRAINT data_payment_amount_check CHECK (usd >= 0 AND discount >= 0 AND discount <= usd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product fields on an order are intentionally retained as a sale-time snapshot.
CREATE TABLE IF NOT EXISTS data_order (
  order_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total DECIMAL(14, 2) GENERATED ALWAYS AS (quantity * price) STORED,
  order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY data_order_product_id_idx (product_id),
  KEY data_order_order_date_idx (order_date),
  CONSTRAINT data_order_product_fk FOREIGN KEY (product_id)
    REFERENCES data_product(product_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT data_order_quantity_check CHECK (quantity > 0),
  CONSTRAINT data_order_price_check CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The imported accounts use the bcrypt hash for the temporary password "password".
-- Reset each password immediately after deployment.
INSERT INTO data_admin (admin_id, admin_name, password_hash, role, permissions, updated_at) VALUES
  (1, 't', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Super Admin', JSON_ARRAY('manage_students', 'manage_payments', 'manage_products', 'view_product_report'), '2026-07-27 00:00:00'),
  (3, 'T1', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Super Admin', JSON_ARRAY('manage_students', 'manage_payments'), '2026-04-14 00:00:00'),
  (4, 'Admin2', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin', JSON_ARRAY('manage_students'), '2026-04-15 00:00:00')
ON DUPLICATE KEY UPDATE admin_id = admin_id;

INSERT INTO data_student (student_id, fullname, age, gender, phone, symptom, other_symptom, updated_at) VALUES
  (1, 'Test', 15, 'Male', '020', 'Sickness', '', '2026-04-15 00:00:00'),
  (2, 'Test1', 15, 'Female', '020', 'Other', 'ddddd', '2026-04-14 00:00:00'),
  (3, 'John Smith', 45, 'Male', '020-5512-3456', '', '', '2020-05-12 00:00:00'),
  (4, 'Emily Johnson', 29, 'Female', '020-2234-5678', '', '', '2020-11-20 00:00:00'),
  (5, 'Michael Brown', 34, 'Male', '020-9987-6543', '', '', '2021-02-05 00:00:00'),
  (6, 'Jessica Davis', 52, 'Female', '020-5543-2109', '', '', '2021-08-14 00:00:00'),
  (7, 'William Wilson', 22, 'Male', '020-2211-3344', '', '', '2021-12-25 00:00:00'),
  (8, 'Sophia Martinez', 31, 'Female', '020-7766-5544', '', '', '2022-03-10 00:00:00'),
  (9, 'James Anderson', 40, 'Male', '020-9900-1122', '', '', '2022-07-22 00:00:00'),
  (10, 'Isabella Taylor', 27, 'Female', '020-5566-7788', '', '', '2022-10-05 00:00:00'),
  (11, 'Benjamin Thomas', 38, 'Male', '020-2288-9900', '', '', '2023-01-18 00:00:00'),
  (12, 'Mia Hernandez', 44, 'Female', '020-9944-5566', '', '', '2023-06-30 00:00:00'),
  (13, 'Lucas Moore', 25, 'Male', '020-7733-2211', '', '', '2023-09-12 00:00:00'),
  (14, 'Charlotte Martin', 33, 'Female', '020-5577-8899', '', '', '2024-02-14 00:00:00'),
  (15, 'Henry Garcia', 50, 'Male', '020-2244-6688', '', '', '2024-05-20 00:00:00'),
  (16, 'Amelia Rodriguez', 28, 'Female', '020-9911-2233', '', '', '2024-11-03 00:00:00'),
  (17, 'Alexander Lewis', 42, 'Male', '020-5599-0011', '', '', '2025-01-25 00:00:00'),
  (18, 'Evelyn Walker', 36, 'Female', '020-2255-8811', '', '', '2025-04-12 00:00:00'),
  (19, 'Daniel Hall', 23, 'Male', '020-7711-4477', '', '', '2025-08-08 00:00:00'),
  (20, 'Ava Young', 55, 'Female', '020-9922-3344', '', '', '2026-01-15 00:00:00'),
  (21, 'Matthew Allen', 47, 'Male', '020-5500-9922', '', '', '2026-03-22 00:00:00'),
  (22, 'Olivia King', 30, 'Female', '020-2277-3366', '', '', '2026-04-05 00:00:00'),
  (23, 'Test3', 15, 'Male', '020', 'Other', 'test', '2026-04-15 00:00:00')
ON DUPLICATE KEY UPDATE student_id = student_id;

INSERT INTO data_product (product_id, product_name, category, price, image_url, description, updated_at) VALUES
  (1, 'Running Shoes', 'Sports', 700000.00, 'https://rockytopsportsworld.com/wp-content/uploads/2019/07/sports-balls-768x512.jpg', 'Lightweight running shoes for daily training', '2026-07-27 00:00:00'),
  (5, 'KOKOK1', 'Sports', 10.00, 'https://res.cloudinary.com/dzsl8v8yw/image/fetch/e_vibrance:100/c_limit,w_1920/f_auto/q_auto/v2066/https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/IMG-Worlds-of-Adventure-4753/1760008208926_3_2.jpg?_a=BAVAZGID0', '12345', '2026-07-28 00:00:00')
ON DUPLICATE KEY UPDATE product_id = product_id;

INSERT INTO data_payment (payment_id, student_id, course, level, payment_date, start_study, end_study, time_study, no_of_weeks, usd, discount, place) VALUES
  (1, 1, 'Swimming', 'Intermediate', '2026-04-14', '2026-04-14', '2026-06-23', 2, 10, 180.00, 30.00, 'Angkham'),
  (2, 1, 'Swimming', 'Advanced', '2026-04-01', '2026-04-01', '2026-04-08', 1, 1, 11.00, 0.00, 'Angkham'),
  (3, 2, 'Swimming', 'Beginner', '2026-04-01', '2026-04-01', '2026-04-08', 1, 1, 11.00, 0.00, 'Angkham'),
  (4, 23, 'Swimming', 'Beginner', '2026-04-15', '2026-04-15', '2026-05-13', 3, 4, 100.00, 10.00, 'Angkham')
ON DUPLICATE KEY UPDATE payment_id = payment_id;

-- total is generated, so it is intentionally omitted here.
INSERT INTO data_order (order_id, product_id, product_name, category, quantity, price, order_date) VALUES
  (1, 1, 'Running Shoes111', 'Sports', 1, 500000.00, '2026-07-27 14:55:34'),
  (2, 1, 'Running Shoes111', 'Sports', 5, 500000.00, '2026-07-27 14:55:50'),
  (3, 1, 'Running Shoes', 'Sports', 1, 700000.00, '2026-07-27 14:56:21'),
  (4, 1, 'Running Shoes', 'Sports', 5, 700000.00, '2026-07-28 19:15:37')
ON DUPLICATE KEY UPDATE order_id = order_id;

-- Verification after import:
-- SELECT 'data_student' AS table_name, COUNT(*) AS rows_count FROM data_student
-- UNION ALL SELECT 'data_admin', COUNT(*) FROM data_admin
-- UNION ALL SELECT 'data_product', COUNT(*) FROM data_product
-- UNION ALL SELECT 'data_payment', COUNT(*) FROM data_payment
-- UNION ALL SELECT 'data_order', COUNT(*) FROM data_order;
