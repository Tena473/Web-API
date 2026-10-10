-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 10, 2026 at 08:01 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `angkham-final`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_sessions`
--

CREATE TABLE `admin_sessions` (
  `session_id` varchar(64) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_sessions`
--

INSERT INTO `admin_sessions` (`session_id`, `admin_id`, `expires_at`, `revoked_at`, `created_at`) VALUES
('4I1mLxCdH1Fy4Hg9Yzzf74GwfzsOux4TlVGNZhrBNk4', 3, '2026-10-10 22:58:30', '2026-10-10 14:58:48', '2026-10-10 21:58:30'),
('bnXkXrMzgocwpaw-Ah5KnU9or_BOcvbyfHK2V0ONrtU', 5, '2026-10-06 22:19:51', '2026-10-06 14:20:01', '2026-10-06 21:19:51'),
('Pey9cF21l1Kpcszj4Y_cieCwpJqGC5vGstZyy-FkpI8', 6, '2026-10-06 22:19:46', '2026-10-06 14:19:49', '2026-10-06 21:19:46');

-- --------------------------------------------------------

--
-- Table structure for table `auth_login_rate_limits`
--

CREATE TABLE `auth_login_rate_limits` (
  `bucket_key` varchar(64) NOT NULL,
  `attempts` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_login_rate_limits`
--

INSERT INTO `auth_login_rate_limits` (`bucket_key`, `attempts`, `expires_at`, `updated_at`) VALUES
('account-ip:F4DGq3QUPBfoZZ-lHcX-wVgWnkMWY0ANPP5tFgQcyZo', 0, '2026-10-10 15:13:30', '2026-10-10 21:58:30'),
('account:jGl25bVBBBW96Qi9Te4V37Fnqchz_Eu4qB9vKrRIqRg', 0, '2026-10-10 15:13:30', '2026-10-10 21:58:30'),
('ip:7_jnylBmJ_4V3aXg5RL8qtcLbVIPN8x2WX_bTy2DoaM', 0, '2026-10-10 15:13:30', '2026-10-10 21:58:30');

-- --------------------------------------------------------

--
-- Table structure for table `data_admin`
--

CREATE TABLE `data_admin` (
  `admin_id` int(11) NOT NULL,
  `admin_name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(30) NOT NULL,
  `permissions` longtext NOT NULL,
  `updatedAt` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `data_admin`
--

INSERT INTO `data_admin` (`admin_id`, `admin_name`, `password`, `role`, `permissions`, `updatedAt`) VALUES
(3, 'Admin', 'scrypt$RXSmNXvUql7GGed3mVNjVA$jtyHM5GB8RLxdXSAxdrPng3imqywtcQgiVNeySYYd9SKXPr4iho8dDD-X4tmB6qgrn-q4uwAsnmXBIVvS2DkwQ', 'Super Admin', '[\"manage_students\",\"manage_payments\"]', '2026-04-14'),
(5, 'Emploty', 'scrypt$-6vJu15wQGc2waGhu8aSTg$ig8VOdXVfpOE_5vlngKqD811ojvsR9duhxmzo6Uv_AXMOOTSyVRcYWKJEwWfsu7pxrsbUR_COscBn4qeyKzHqA', 'Admin', '[\"manage_students\",\"manage_payments\",\"manage_products\",\"view_product_report\"]', '2026-08-24'),
(6, 'Emploty_Oder', 'scrypt$mojgdGXGRMgGu9uxRlS3gw$GeSO7NknCLgMXghHlQ93FxLf7Wv33tx1AbXwruabPl6sIYMqtjuceopaz1c_W8CA5yHh6XHDzyodq0113a2vAw', 'Employee', '[\"create_orders\"]', '2026-08-24');

-- --------------------------------------------------------

--
-- Table structure for table `data_order`
--

CREATE TABLE `data_order` (
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT '',
  `quantity` int(11) DEFAULT 1,
  `price` decimal(10,2) DEFAULT 0.00,
  `total` decimal(12,2) DEFAULT 0.00,
  `order_date` varchar(50) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `data_order`
--

INSERT INTO `data_order` (`order_id`, `product_id`, `product_name`, `category`, `quantity`, `price`, `total`, `order_date`) VALUES
(1, 1, 'Running Shoes111', 'Sports', 1, 500000.00, 500000.00, '2026-07-27 14:55:34'),
(2, 1, 'Running Shoes111', 'Sports', 5, 500000.00, 2500000.00, '2026-07-27 14:55:50'),
(3, 1, 'Running Shoes', 'Sports', 1, 700000.00, 700000.00, '2026-07-27 14:56:21'),
(4, 1, 'Running Shoes', 'Sports', 5, 700000.00, 3500000.00, '2026-07-28 19:15:37'),
(5, 5, 'KOKOK1', 'Sports', 10, 10.00, 100.00, '2026-08-20 14:33:00'),
(6, 1, 'Running Shoes', 'Sports', 3, 700000.00, 2100000.00, '2026-08-24 09:15:57');

-- --------------------------------------------------------

--
-- Table structure for table `data_payment`
--

CREATE TABLE `data_payment` (
  `payment_id` int(11) NOT NULL,
  `student_id` varchar(100) NOT NULL,
  `course` varchar(30) NOT NULL,
  `level` varchar(30) NOT NULL,
  `payment_date` varchar(30) NOT NULL,
  `start_study` varchar(30) NOT NULL,
  `end_study` varchar(30) NOT NULL,
  `time_study` varchar(30) NOT NULL,
  `no_of_weeks` varchar(30) NOT NULL,
  `usd` varchar(30) NOT NULL,
  `discount` varchar(30) NOT NULL,
  `place` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `data_payment`
--

INSERT INTO `data_payment` (`payment_id`, `student_id`, `course`, `level`, `payment_date`, `start_study`, `end_study`, `time_study`, `no_of_weeks`, `usd`, `discount`, `place`) VALUES
(1, '1', 'Swimming', 'Intermediate', '2026-04-14', '2026-04-14', '2026-06-23', '2', '10', '180', '30', 'Angkham'),
(2, '1', 'Swimming', 'Advanced', '2026-04-01', '2026-04-01', '2026-04-08', '1', '1', '11', '0', 'Angkham'),
(3, '2', 'Swimming', 'Beginner', '2026-04-01', '2026-04-01', '2026-04-08', '1', '1', '11', '0', 'Angkham'),
(4, '23', 'Swimming', 'Beginner', '2026-04-15', '2026-04-15', '2026-05-13', '3', '4', '100', '10', 'Angkham');

-- --------------------------------------------------------

--
-- Table structure for table `data_product`
--

CREATE TABLE `data_product` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT '',
  `price` decimal(10,2) DEFAULT 0.00,
  `image_url` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `updatedAt` varchar(50) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `data_product`
--

INSERT INTO `data_product` (`product_id`, `product_name`, `category`, `price`, `image_url`, `description`, `updatedAt`) VALUES
(1, 'Running Shoes', 'Sports', 700000.00, 'https://rockytopsportsworld.com/wp-content/uploads/2019/07/sports-balls-768x512.jpg', 'Lightweight running shoes for daily training', '2026-08-27'),
(5, 'KOKOK1', 'Sports', 10.00, 'https://res.cloudinary.com/dzsl8v8yw/image/fetch/e_vibrance:100/c_limit,w_1920/f_auto/q_auto/v2066/https://d2cazmkfw8kdtj.cloudfront.net/Tour-Images/Final/IMG-Worlds-of-Adventure-4753/1760008208926_3_2.jpg?_a=BAVAZGID0', '12345', '2026-07-28');

-- --------------------------------------------------------

--
-- Table structure for table `data_student`
--

CREATE TABLE `data_student` (
  `student_id` int(11) NOT NULL,
  `fullname` varchar(255) NOT NULL,
  `age` varchar(30) NOT NULL,
  `gender` varchar(30) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `symptom` varchar(30) NOT NULL,
  `otherSymptom` varchar(255) NOT NULL,
  `updatedAt` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `data_student`
--

INSERT INTO `data_student` (`student_id`, `fullname`, `age`, `gender`, `phone`, `symptom`, `otherSymptom`, `updatedAt`) VALUES
(1, 'Test', '15', 'Male', '020', 'Sickness', '', '2026-04-15'),
(2, 'Test1', '15', 'Female', '020', 'Other', 'ddddd', '2026-04-14'),
(3, 'John Smith', '45', 'Male', '020-5512-3456', '', '', '2020-05-12'),
(4, 'Emily Johnson', '29', 'Female', '020-2234-5678', '', '', '2020-11-20'),
(5, 'Michael Brown', '34', 'Male', '020-9987-6543', '', '', '2021-02-05'),
(6, 'Jessica Davis', '52', 'Female', '020-5543-2109', '', '', '2021-08-14'),
(7, 'William Wilson', '22', 'Male', '020-2211-3344', '', '', '2021-12-25'),
(8, 'Sophia Martinez', '31', 'Female', '020-7766-5544', '', '', '2022-03-10'),
(9, 'James Anderson', '40', 'Male', '020-9900-1122', '', '', '2022-07-22'),
(10, 'Isabella Taylor', '27', 'Female', '020-5566-7788', '', '', '2022-10-05'),
(11, 'Benjamin Thomas', '38', 'Male', '020-2288-9900', '', '', '2023-01-18'),
(12, 'Mia Hernandez', '44', 'Female', '020-9944-5566', '', '', '2023-06-30'),
(13, 'Lucas Moore', '25', 'Male', '020-7733-2211', '', '', '2023-09-12'),
(14, 'Charlotte Martin', '33', 'Female', '020-5577-8899', '', '', '2024-02-14'),
(15, 'Henry Garcia', '50', 'Male', '020-2244-6688', '', '', '2024-05-20'),
(16, 'Amelia Rodriguez', '28', 'Female', '020-9911-2233', '', '', '2024-11-03'),
(17, 'Alexander Lewis', '42', 'Male', '020-5599-0011', '', '', '2025-01-25'),
(18, 'Evelyn Walker', '36', 'Female', '020-2255-8811', '', '', '2025-04-12'),
(19, 'Daniel Hall', '23', 'Male', '020-7711-4477', '', '', '2025-08-08'),
(20, 'Ava Young', '55', 'Female', '020-9922-3344', '', '', '2026-01-15'),
(21, 'Matthew Allen', '47', 'Male', '020-5500-9922', '', '', '2026-03-22'),
(22, 'Olivia King', '30', 'Female', '020-2277-3366', '', '', '2026-04-05'),
(23, 'Test3', '15', 'Male', '020', 'Other', 'test', '2000-04-15'),
(24, 'Test666', '15', 'Male', '020', 'Disability', '', '2028-08-23');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_sessions`
--
ALTER TABLE `admin_sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `admin_sessions_active_idx` (`admin_id`,`revoked_at`,`expires_at`);

--
-- Indexes for table `auth_login_rate_limits`
--
ALTER TABLE `auth_login_rate_limits`
  ADD PRIMARY KEY (`bucket_key`),
  ADD KEY `auth_login_rate_limits_expiry_idx` (`expires_at`);

--
-- Indexes for table `data_admin`
--
ALTER TABLE `data_admin`
  ADD PRIMARY KEY (`admin_id`);

--
-- Indexes for table `data_order`
--
ALTER TABLE `data_order`
  ADD PRIMARY KEY (`order_id`);

--
-- Indexes for table `data_payment`
--
ALTER TABLE `data_payment`
  ADD PRIMARY KEY (`payment_id`);

--
-- Indexes for table `data_product`
--
ALTER TABLE `data_product`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `data_student`
--
ALTER TABLE `data_student`
  ADD PRIMARY KEY (`student_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `data_admin`
--
ALTER TABLE `data_admin`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `data_order`
--
ALTER TABLE `data_order`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `data_payment`
--
ALTER TABLE `data_payment`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `data_product`
--
ALTER TABLE `data_product`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `data_student`
--
ALTER TABLE `data_student`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_sessions`
--
ALTER TABLE `admin_sessions`
  ADD CONSTRAINT `admin_sessions_admin_fk` FOREIGN KEY (`admin_id`) REFERENCES `data_admin` (`admin_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
