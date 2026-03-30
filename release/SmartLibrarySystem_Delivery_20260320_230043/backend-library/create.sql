CREATE DATABASE IF NOT EXISTS library_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE library_management;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    department VARCHAR(100),
    major VARCHAR(100),
    identity_type VARCHAR(20) DEFAULT 'STUDENT',
    enrollment_year INT,
    interest_tags LONGTEXT,
    password_reset_token_hash VARCHAR(128),
    password_reset_requested_at DATETIME,
    password_reset_expires_at DATETIME,
    password_reset_used_at DATETIME,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE publishers (
    publisher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(255),
    contact_info VARCHAR(100),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    parent_id INT NULL,
    description VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_id) REFERENCES categories(category_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    biography LONGTEXT,
    birth_year INT,
    death_year INT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    cover_url VARCHAR(255),
    resource_mode ENUM('PHYSICAL_ONLY', 'DIGITAL_ONLY', 'HYBRID') NOT NULL DEFAULT 'PHYSICAL_ONLY',
    online_access_url VARCHAR(500),
    online_access_type ENUM('OPEN_ACCESS', 'CAMPUS_ONLY', 'LICENSED_ACCESS'),
    description LONGTEXT,
    page_count INT,
    published_year INT NOT NULL,
    language VARCHAR(50) NOT NULL,
    publisher_id INT,
    category_id INT,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_book_publisher
        FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_book_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE book_copies (
    copy_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    status ENUM('AVAILABLE', 'BORROWED', 'RESERVED', 'LOST', 'DAMAGED') NOT NULL DEFAULT 'AVAILABLE',
    acquisition_date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    notes LONGTEXT,
    location_code VARCHAR(50),
    rfid_tag VARCHAR(64) UNIQUE,
    floor_plan_id INT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_copy_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE book_authors (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    author_order INT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_bookauthor_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_bookauthor_author
        FOREIGN KEY (author_id) REFERENCES authors(author_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE loans (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    copy_id INT NOT NULL,
    user_id INT NOT NULL,
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status ENUM('ACTIVE', 'RETURNED', 'OVERDUE', 'LOST') NOT NULL DEFAULT 'ACTIVE',
    renewal_count INT NOT NULL DEFAULT 0,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_loan_copy
        FOREIGN KEY (copy_id) REFERENCES book_copies(copy_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_loan_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    reservation_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status ENUM('PENDING', 'AWAITING_PICKUP', 'FULFILLED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    allocated_copy_id INT,
    pickup_deadline DATETIME,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservation_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reservation_allocated_copy
        FOREIGN KEY (allocated_copy_id) REFERENCES book_copies(copy_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE fines (
    fine_id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    date_issued DATE NOT NULL,
    date_paid DATE,
    status ENUM('PENDING', 'PAID', 'WAIVED') NOT NULL DEFAULT 'PENDING',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fine_loan
        FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_fine_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('DUE_REMINDER', 'ARRIVAL_NOTICE', 'NEW_BOOK_RECOMMEND', 'SYSTEM') NOT NULL,
    title VARCHAR(100) NOT NULL,
    content LONGTEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    target_type VARCHAR(30),
    target_id VARCHAR(50),
    route_hint VARCHAR(255),
    business_key VARCHAR(80),
    send_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE search_history (
    search_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    keyword VARCHAR(100) NOT NULL,
    result_count INT NOT NULL DEFAULT 0,
    search_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_behavior_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    book_id INT,
    action_type ENUM('VIEW_DETAIL', 'ADD_TO_SHELF', 'CLICK_PREVIEW', 'SHARE', 'BORROW_BOOK', 'RESERVE_BOOK') NOT NULL,
    duration_seconds INT,
    device_type VARCHAR(50),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE book_reviews (
    review_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    loan_id INT,
    rating INT NOT NULL,
    comment_text LONGTEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_feedbacks (
    feedback_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category ENUM('BOOK_INFO', 'SYSTEM_BUG', 'SERVICE_EXPERIENCE', 'SUGGESTION', 'OTHER') NOT NULL DEFAULT 'OTHER',
    subject VARCHAR(150) NOT NULL,
    content LONGTEXT NOT NULL,
    contact_email VARCHAR(120),
    status ENUM('SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    admin_reply LONGTEXT,
    handled_by VARCHAR(50),
    reply_time DATETIME,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_feedback_messages (
    message_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback_id BIGINT NOT NULL,
    sender_type ENUM('USER', 'ADMIN') NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    sender_user_id INT,
    sender_username VARCHAR(50),
    content LONGTEXT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedback_message_feedback
        FOREIGN KEY (feedback_id) REFERENCES user_feedbacks(feedback_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_favorites (
    favorite_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_favorite_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_favorite_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE,
    CONSTRAINT uk_user_favorite_user_book UNIQUE (user_id, book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE service_appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    loan_id INT,
    service_type ENUM('RETURN_BOOK', 'PICKUP_BOOK', 'CONSULTATION') NOT NULL,
    scheduled_time DATETIME NOT NULL,
    method ENUM('COUNTER', 'SMART_LOCKER') NOT NULL DEFAULT 'COUNTER',
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED', 'MISSED') NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_service_appointment_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_service_appointment_loan
        FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    seat_code VARCHAR(32) NOT NULL,
    floor_name VARCHAR(50) NOT NULL,
    floor_order INT NOT NULL DEFAULT 1,
    zone_name VARCHAR(50),
    area_name VARCHAR(50),
    seat_type ENUM('STANDARD', 'COMPUTER', 'DISCUSSION') NOT NULL DEFAULT 'STANDARD',
    status ENUM('AVAILABLE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
    has_power BOOLEAN NOT NULL DEFAULT FALSE,
    near_window BOOLEAN NOT NULL DEFAULT FALSE,
    description VARCHAR(255),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_seat_code UNIQUE (seat_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seat_reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    seat_id INT NOT NULL,
    user_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('ACTIVE', 'CANCELLED', 'COMPLETED', 'MISSED') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_seat_reservation_seat
        FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_seat_reservation_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rbac_audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT,
    actor_username VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    detail TEXT,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_status ON users(role, status);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_category ON books(category_id);

CREATE INDEX idx_book_copies_book_status ON book_copies(book_id, status);
CREATE INDEX idx_book_copies_location ON book_copies(location_code);

CREATE INDEX idx_book_authors_author_id ON book_authors(author_id);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_permissions_name ON permissions(name);

CREATE INDEX idx_loans_user_status ON loans(user_id, status);
CREATE INDEX idx_loans_due_date ON loans(due_date);
CREATE INDEX idx_loans_copy_id ON loans(copy_id);

CREATE INDEX idx_reservations_user_status ON reservations(user_id, status);
CREATE INDEX idx_reservations_book_status ON reservations(book_id, status);
CREATE INDEX idx_reservations_pickup_deadline ON reservations(pickup_deadline);

CREATE INDEX idx_fines_user_status ON fines(user_id, status);
CREATE INDEX idx_fines_loan_id ON fines(loan_id);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_business_key ON notifications(business_key);

CREATE INDEX idx_search_history_keyword ON search_history(keyword);
CREATE INDEX idx_search_history_user_time ON search_history(user_id, search_time);

CREATE INDEX idx_behavior_user_time ON user_behavior_logs(user_id, create_time);
CREATE INDEX idx_behavior_book_action ON user_behavior_logs(book_id, action_type);

CREATE INDEX idx_book_reviews_book_status ON book_reviews(book_id, status);
CREATE INDEX idx_book_reviews_user_id ON book_reviews(user_id);

CREATE INDEX idx_user_feedback_user_time ON user_feedbacks(user_id, create_time);
CREATE INDEX idx_user_feedback_status_time ON user_feedbacks(status, create_time);

CREATE INDEX idx_service_appointments_user_time ON service_appointments(user_id, scheduled_time);
CREATE INDEX idx_service_appointments_status_time ON service_appointments(status, scheduled_time);
CREATE INDEX idx_service_appointments_loan_id ON service_appointments(loan_id);

CREATE INDEX idx_seats_floor_zone ON seats(floor_order, floor_name, zone_name);
CREATE INDEX idx_seats_status ON seats(status);

CREATE INDEX idx_seat_reservations_user_time ON seat_reservations(user_id, start_time, end_time);
CREATE INDEX idx_seat_reservations_seat_time ON seat_reservations(seat_id, start_time, end_time);
CREATE INDEX idx_seat_reservations_status_time ON seat_reservations(status, start_time, end_time);

CREATE INDEX idx_rbac_audit_time ON rbac_audit_logs(create_time);
