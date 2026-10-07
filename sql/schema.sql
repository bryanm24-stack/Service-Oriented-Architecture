-- ============================================================
-- DATABASE
-- ============================================================

CREATE DATABASE IF NOT EXISTS soa_db;

USE soa_db;


-- ============================================================
-- TABLE: categories
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    icon VARCHAR(255) NULL,

    createdAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updatedAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT INTO categories (name, icon)
VALUES
    ('Makanan', 'food'),
    ('Transportasi', 'transport'),
    ('Hiburan', 'entertainment');