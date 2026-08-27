CREATE TABLE IF NOT EXISTS data_product (
  product_id   INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  category     VARCHAR(100) DEFAULT '',
  price        DECIMAL(10, 2) DEFAULT 0,
  image_url    TEXT,
  description  TEXT,
  updatedAt    VARCHAR(50) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS data_order (
  order_id     INT AUTO_INCREMENT PRIMARY KEY,
  product_id   INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category     VARCHAR(100) DEFAULT '',
  quantity     INT DEFAULT 1,
  price        DECIMAL(10, 2) DEFAULT 0,
  total        DECIMAL(12, 2) DEFAULT 0,
  -- เก็บเป็นข้อความ 'YYYY-MM-DD HH:mm:ss' เพื่อให้ค่าที่อ่านกลับมาตรงกับเวลาที่บันทึก (ไม่ถูกแปลงเป็น UTC)
  order_date   VARCHAR(50) DEFAULT ''
);

INSERT INTO data_product (product_name, category, price, image_url, description, updatedAt) VALUES
('Running Shoes', 'Sports', 450000, 'https://placehold.co/600x400?text=Product+1', 'Lightweight running shoes for daily training', '2026-07-27'),
('Yoga Mat', 'Sports', 180000, 'https://placehold.co/600x400?text=Product+2', 'Non-slip yoga mat, 6mm thickness', '2026-07-27'),
('Cotton T-Shirt', 'Clothing', 95000, 'https://placehold.co/600x400?text=Product+3', '100% cotton, available in multiple colors', '2026-07-27'),
('Sports Bottle', 'Other', 60000, 'https://placehold.co/600x400?text=Product+4', 'Stainless steel bottle, keeps drinks cold 12h', '2026-07-27');
