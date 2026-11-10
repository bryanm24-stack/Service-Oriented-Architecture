-- SOA-20261108-06: Wish cash/cicilan. Additive migration; existing records are preserved.
CREATE TABLE IF NOT EXISTS wishes (
  id_wish INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  payment_method ENUM('cash','installment') NOT NULL,
  down_payment DECIMAL(15,2) NOT NULL DEFAULT 0,
  tenor_months INT UNSIGNED NULL,
  installment_amount DECIMAL(15,2) NULL,
  status ENUM('planned','paid') NOT NULL DEFAULT 'planned',
  paid_transaction_id INT UNSIGNED NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_wishes_paid_transaction FOREIGN KEY (paid_transaction_id) REFERENCES transactions(id_transaction) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_wishes_price CHECK (price > 0),
  CONSTRAINT chk_wishes_down_payment CHECK (down_payment >= 0 AND down_payment <= price),
  CONSTRAINT chk_wishes_tenor CHECK ((payment_method='cash' AND tenor_months IS NULL AND down_payment=0) OR (payment_method='installment' AND tenor_months BETWEEN 1 AND 120)),
  INDEX idx_wishes_user_status (user_id, status, createdAt)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS installment_schedules (
  id_installment INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wish_id INT UNSIGNED NOT NULL,
  period_number INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  amount_snapshot DECIMAL(15,2) NOT NULL,
  status ENUM('planned','paid') NOT NULL DEFAULT 'planned',
  transaction_id INT UNSIGNED NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_installment_wish FOREIGN KEY (wish_id) REFERENCES wishes(id_wish) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_installment_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id_transaction) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_installment_amount CHECK (amount_snapshot > 0),
  UNIQUE KEY uq_installment_period (wish_id, period_number),
  INDEX idx_installment_due_status (wish_id, status, due_date)
) ENGINE=InnoDB;
