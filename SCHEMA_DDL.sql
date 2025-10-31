-- ============================================================================
-- Koffers Finance - Database Schema DDL
-- ============================================================================
-- This is a conceptual DDL representation for Appwrite collections
-- Appwrite uses NoSQL but this SQL DDL helps visualize structure & relationships
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS (Appwrite Auth - Built-in)
-- ----------------------------------------------------------------------------
-- Managed by Appwrite Auth, we just reference via userId
-- Additional user preferences stored in JSON


-- ----------------------------------------------------------------------------
-- ACCOUNTS - Bank accounts, credit cards, investment accounts
-- ----------------------------------------------------------------------------
CREATE TABLE accounts (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36) NOT NULL,           -- FK: users.id
    name                VARCHAR(255) NOT NULL,          -- "Chase Checking"
    type                ENUM('checking', 'savings', 'credit', 'investment') NOT NULL,
    institution         VARCHAR(255) NOT NULL,          -- "Chase"
    lastFour            VARCHAR(4),                     -- "1234"
    currentBalance      DECIMAL(15, 2),
    plaidItemId         VARCHAR(255),                   -- FK: plaidItems.itemId
    plaidAccountId      VARCHAR(255),
    isActive            BOOLEAN DEFAULT TRUE,
    color               VARCHAR(7),                     -- "#4285f4"
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_userId (userId),
    INDEX idx_plaidItemId (plaidItemId)
);


-- ----------------------------------------------------------------------------
-- CATEGORIES - Transaction categories (Groceries, Gas, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36),                    -- FK: users.id (NULL = system)
    name                VARCHAR(255) NOT NULL,          -- "Groceries"
    parentId            VARCHAR(36),                    -- FK: categories.id (self-ref)
    type                ENUM('expense', 'income', 'transfer') NOT NULL,
    icon                VARCHAR(50),                    -- "shopping-cart"
    color               VARCHAR(7),                     -- "#ff5722"
    isSystem            BOOLEAN DEFAULT FALSE,
    sortOrder           INT DEFAULT 0,
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_userId (userId),
    INDEX idx_parentId (parentId),
    INDEX idx_type (type)
);


-- ----------------------------------------------------------------------------
-- TAGS - Flexible tags (business, personal, tax-deductible, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE tags (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36),                    -- FK: users.id (NULL = system)
    label               VARCHAR(100) NOT NULL,          -- "business"
    type                ENUM('business', 'personal', 'custom') NOT NULL,
    color               VARCHAR(7),                     -- "#4caf50"
    isSystem            BOOLEAN DEFAULT FALSE,
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_userId (userId),
    UNIQUE KEY unique_user_label (userId, label)
);


-- ----------------------------------------------------------------------------
-- TRANSACTIONS - Main financial transactions
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36) NOT NULL,           -- FK: users.id
    accountId           VARCHAR(36) NOT NULL,           -- FK: accounts.id
    plaidTransactionId  VARCHAR(255),                   -- FK: plaidTransactions.plaidTransactionId

    -- Transaction details
    date                DATE NOT NULL,
    amount              DECIMAL(15, 2) NOT NULL,        -- Negative = expense
    merchant            VARCHAR(255) NOT NULL,
    merchantSubtext     VARCHAR(255),
    description         TEXT,                           -- Original bank description

    -- Classification
    categoryId          VARCHAR(36),                    -- FK: categories.id
    status              ENUM('pending', 'completed', 'cleared') NOT NULL DEFAULT 'pending',
    channel             ENUM('in-store', 'online', 'other') NOT NULL DEFAULT 'other',

    -- Receipt/File linkage
    fileId              VARCHAR(36),                    -- FK: files.id

    -- User annotations
    commentary          TEXT,
    reviewedBy          VARCHAR(36),                    -- FK: users.id
    reviewedAt          TIMESTAMP,

    -- Timestamps
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes for performance
    INDEX idx_userId_date (userId, date DESC),
    INDEX idx_accountId (accountId),
    INDEX idx_categoryId (categoryId),
    INDEX idx_fileId (fileId),
    INDEX idx_plaidTransactionId (plaidTransactionId),
    INDEX idx_status (status)
);


-- ----------------------------------------------------------------------------
-- RECEIPT_ITEMS - Line items from OCR-processed receipts
-- ----------------------------------------------------------------------------
CREATE TABLE receiptItems (
    id                  VARCHAR(36) PRIMARY KEY,
    transactionId       VARCHAR(36) NOT NULL,           -- FK: transactions.id

    -- Item details
    name                VARCHAR(255) NOT NULL,          -- "Organic Bananas"
    quantity            INT NOT NULL DEFAULT 1,
    price               DECIMAL(10, 2) NOT NULL,        -- Unit price
    totalPrice          DECIMAL(10, 2),                 -- quantity * price (computed)
    category            VARCHAR(100),                   -- Item category
    sku                 VARCHAR(100),                   -- Product SKU

    -- Display order
    sortOrder           INT NOT NULL DEFAULT 0,

    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_transactionId (transactionId),
    INDEX idx_sortOrder (transactionId, sortOrder)
);


-- ----------------------------------------------------------------------------
-- REMINDERS - Transaction reminders
-- ----------------------------------------------------------------------------
CREATE TABLE reminders (
    id                  VARCHAR(36) PRIMARY KEY,
    transactionId       VARCHAR(36) NOT NULL UNIQUE,    -- FK: transactions.id (1-to-1)
    message             VARCHAR(500) NOT NULL,
    dueDate             DATE,
    completed           BOOLEAN DEFAULT FALSE,
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_transactionId (transactionId),
    INDEX idx_dueDate (dueDate)
);


-- ----------------------------------------------------------------------------
-- FILES - Uploaded documents (receipts, bank statements, tax docs)
-- ----------------------------------------------------------------------------
CREATE TABLE files (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36) NOT NULL,           -- FK: users.id
    transactionId       VARCHAR(36),                    -- FK: transactions.id (nullable)

    -- File metadata
    name                VARCHAR(255) NOT NULL,
    type                ENUM('receipt', 'bank-statement', 'tax-document', 'other') NOT NULL,
    size                BIGINT NOT NULL,                -- Bytes
    mimeType            VARCHAR(100) NOT NULL,
    storageFileId       VARCHAR(255) NOT NULL,          -- Appwrite Storage ID
    url                 TEXT,                           -- Public/signed URL
    thumbnailUrl        TEXT,
    uploadedAt          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Receipt-specific fields
    isReceipt           BOOLEAN DEFAULT FALSE,
    matchStatus         ENUM('matched', 'pending', 'unmatched'),
    receiptData         JSON,                           -- OCR extracted data

    -- User metadata
    title               VARCHAR(255),
    description         TEXT,

    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_userId_uploaded (userId, uploadedAt DESC),
    INDEX idx_transactionId (transactionId),
    INDEX idx_matchStatus (matchStatus),
    INDEX idx_type (type)
);


-- ----------------------------------------------------------------------------
-- JOIN TABLES - Many-to-many relationships
-- ----------------------------------------------------------------------------

-- Transaction <-> Tags (many-to-many)
CREATE TABLE transactionTags (
    id                  VARCHAR(36) PRIMARY KEY,
    transactionId       VARCHAR(36) NOT NULL,           -- FK: transactions.id
    tagId               VARCHAR(36) NOT NULL,           -- FK: tags.id
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_transaction_tag (transactionId, tagId),
    INDEX idx_transactionId (transactionId),
    INDEX idx_tagId (tagId)
);

-- Receipt Item <-> Tags (many-to-many)
CREATE TABLE itemTags (
    id                  VARCHAR(36) PRIMARY KEY,
    receiptItemId       VARCHAR(36) NOT NULL,           -- FK: receiptItems.id
    tagId               VARCHAR(36) NOT NULL,           -- FK: tags.id
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_item_tag (receiptItemId, tagId),
    INDEX idx_receiptItemId (receiptItemId),
    INDEX idx_tagId (tagId)
);

-- File <-> Tags (many-to-many)
CREATE TABLE fileTags (
    id                  VARCHAR(36) PRIMARY KEY,
    fileId              VARCHAR(36) NOT NULL,           -- FK: files.id
    tagId               VARCHAR(36) NOT NULL,           -- FK: tags.id
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_file_tag (fileId, tagId),
    INDEX idx_fileId (fileId),
    INDEX idx_tagId (tagId)
);


-- ----------------------------------------------------------------------------
-- PLAID INTEGRATION TABLES
-- ----------------------------------------------------------------------------

-- Plaid bank connections
CREATE TABLE plaidItems (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36) NOT NULL,           -- FK: users.id
    itemId              VARCHAR(255) NOT NULL,          -- Plaid Item ID
    accessToken         TEXT NOT NULL,                  -- Encrypted!
    institutionId       VARCHAR(100) NOT NULL,
    institutionName     VARCHAR(255) NOT NULL,
    status              ENUM('active', 'error', 'reauth_required') NOT NULL DEFAULT 'active',
    lastSync            TIMESTAMP,
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_userId (userId),
    UNIQUE KEY unique_itemId (itemId)
);

-- Raw Plaid transactions (staging area before processing)
CREATE TABLE plaidTransactions (
    id                  VARCHAR(36) PRIMARY KEY,
    userId              VARCHAR(36) NOT NULL,           -- FK: users.id
    plaidItemId         VARCHAR(36) NOT NULL,           -- FK: plaidItems.id
    plaidAccountId      VARCHAR(255) NOT NULL,
    plaidTransactionId  VARCHAR(255) NOT NULL,          -- Plaid's transaction ID
    transactionId       VARCHAR(36),                    -- FK: transactions.id (after processing)
    rawData             JSON NOT NULL,                  -- Complete Plaid response
    processed           BOOLEAN DEFAULT FALSE,
    created             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_plaid_transaction (plaidTransactionId),
    INDEX idx_userId (userId),
    INDEX idx_plaidItemId (plaidItemId),
    INDEX idx_processed (processed),
    INDEX idx_transactionId (transactionId)
);


-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Conceptual - Appwrite handles via relationships)
-- ============================================================================

ALTER TABLE accounts
    ADD CONSTRAINT fk_accounts_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE categories
    ADD CONSTRAINT fk_categories_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_categories_parentId FOREIGN KEY (parentId) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE tags
    ADD CONSTRAINT fk_tags_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transactions_accountId FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_transactions_categoryId FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_transactions_fileId FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_transactions_reviewedBy FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE receiptItems
    ADD CONSTRAINT fk_receiptItems_transactionId FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE reminders
    ADD CONSTRAINT fk_reminders_transactionId FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE files
    ADD CONSTRAINT fk_files_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_files_transactionId FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL;

ALTER TABLE transactionTags
    ADD CONSTRAINT fk_transactionTags_transactionId FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transactionTags_tagId FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE;

ALTER TABLE itemTags
    ADD CONSTRAINT fk_itemTags_receiptItemId FOREIGN KEY (receiptItemId) REFERENCES receiptItems(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_itemTags_tagId FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE;

ALTER TABLE fileTags
    ADD CONSTRAINT fk_fileTags_fileId FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_fileTags_tagId FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE;

ALTER TABLE plaidItems
    ADD CONSTRAINT fk_plaidItems_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE plaidTransactions
    ADD CONSTRAINT fk_plaidTransactions_userId FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_plaidTransactions_plaidItemId FOREIGN KEY (plaidItemId) REFERENCES plaidItems(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_plaidTransactions_transactionId FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE SET NULL;


-- ============================================================================
-- SAMPLE DATA - System Categories
-- ============================================================================

INSERT INTO categories (id, userId, name, type, icon, color, isSystem, sortOrder) VALUES
('cat_groceries',     NULL, 'Groceries',      'expense', 'shopping-cart', '#4caf50', TRUE, 10),
('cat_dining',        NULL, 'Dining Out',     'expense', 'restaurant',    '#ff9800', TRUE, 20),
('cat_gas',           NULL, 'Gas & Fuel',     'expense', 'local-gas',     '#f44336', TRUE, 30),
('cat_transportation',NULL, 'Transportation', 'expense', 'directions-car','#2196f3', TRUE, 40),
('cat_utilities',     NULL, 'Utilities',      'expense', 'bolt',          '#9c27b0', TRUE, 50),
('cat_entertainment', NULL, 'Entertainment',  'expense', 'theater',       '#e91e63', TRUE, 60),
('cat_shopping',      NULL, 'Shopping',       'expense', 'shopping-bag',  '#ff5722', TRUE, 70),
('cat_healthcare',    NULL, 'Healthcare',     'expense', 'local-hospital','#00bcd4', TRUE, 80),
('cat_insurance',     NULL, 'Insurance',      'expense', 'security',      '#607d8b', TRUE, 90),
('cat_subscriptions', NULL, 'Subscriptions',  'expense', 'autorenew',     '#795548', TRUE, 100),
('cat_income_salary', NULL, 'Salary',         'income',  'attach-money',  '#4caf50', TRUE, 10),
('cat_income_other',  NULL, 'Other Income',   'income',  'trending-up',   '#8bc34a', TRUE, 20),
('cat_transfer',      NULL, 'Transfer',       'transfer','swap-horiz',    '#9e9e9e', TRUE, 10);


-- ============================================================================
-- SAMPLE DATA - System Tags
-- ============================================================================

INSERT INTO tags (id, userId, label, type, color, isSystem) VALUES
('tag_business', NULL, 'business', 'business', '#1976d2', TRUE),
('tag_personal', NULL, 'personal', 'personal', '#388e3c', TRUE);
