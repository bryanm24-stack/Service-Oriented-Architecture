-- SOA-20261111-08: recurring templates and immutable occurrence snapshots.
CREATE TABLE IF NOT EXISTS recurring_costs (
  id_recurring_cost INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  `interval` ENUM('monthly','yearly') NOT NULL,
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  due_day TINYINT UNSIGNED NOT NULL,
  status ENUM('active','paused') NOT NULL DEFAULT 'active',
  end_date DATE NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL,
  CONSTRAINT fk_recurring_cost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recurring_cost_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_recurring_cost_owner_status (user_id, status, next_due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recurring_occurrences (
  id_occurrence INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recurring_cost_id INT UNSIGNED NOT NULL,
  scheduled_for DATE NOT NULL,
  due_date DATE NOT NULL,
  amount_snapshot DECIMAL(15,2) NOT NULL,
  status ENUM('planned','paid','locked') NOT NULL DEFAULT 'planned',
  transaction_id INT UNSIGNED NULL,
  locked_at DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_recurring_occurrence_cost FOREIGN KEY (recurring_cost_id) REFERENCES recurring_costs(id_recurring_cost) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_recurring_occurrence_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id_transaction) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY uq_recurring_occurrence_schedule (recurring_cost_id, scheduled_for),
  INDEX idx_recurring_occurrence_status_date (recurring_cost_id, status, due_date)
) ENGINE=InnoDB;
