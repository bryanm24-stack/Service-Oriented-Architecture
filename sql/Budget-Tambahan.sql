-- Hanya menambah tabel yang belum ada. Pilih database sesuai DB_NAME.
CREATE TABLE IF NOT EXISTS budget (
    budget_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    month INT UNSIGNED NOT NULL,
    year INT UNSIGNED NOT NULL,

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uq_budget_user_period (user_id, month, year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(10, 2) NOT NULL,

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_categories_budget
        FOREIGN KEY (budget_id) REFERENCES budget(budget_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_budget_categories_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uq_budget_category (budget_id, category_id),
    INDEX idx_budget_categories_category (category_id)
) ENGINE=InnoDB;
