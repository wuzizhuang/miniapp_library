-- Library Management System
-- Full MySQL 8 initialization script for Linux deployment
-- Import example:
--   mysql --default-character-set=utf8mb4 -uroot -p < library_management_linux_init.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS library_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE library_management;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS recommendation_likes;
DROP TABLE IF EXISTS recommendation_follows;
DROP TABLE IF EXISTS recommendation_posts;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS seat_reservations;
DROP TABLE IF EXISTS service_appointments;
DROP TABLE IF EXISTS user_favorites;
DROP TABLE IF EXISTS user_feedback_messages;
DROP TABLE IF EXISTS user_feedbacks;
DROP TABLE IF EXISTS book_reviews;
DROP TABLE IF EXISTS user_behavior_logs;
DROP TABLE IF EXISTS search_history;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS fines;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS rbac_audit_logs;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS book_copies;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS ai_gateway_settings;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

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
    token_valid_after DATETIME,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE publishers (
    publisher_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(255),
    contact_info VARCHAR(100),
    is_deleted BIT(1) NOT NULL DEFAULT b'0',
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    parent_id INT NULL,
    description VARCHAR(255),
    is_deleted BIT(1) NOT NULL DEFAULT b'0',
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
    is_deleted BIT(1) NOT NULL DEFAULT b'0',
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

CREATE TABLE refresh_tokens (
    refresh_token_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    last_used_at DATETIME,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_token_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
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
    return_location VARCHAR(120),
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

CREATE TABLE ai_gateway_settings (
    settings_id INT PRIMARY KEY,
    enabled BIT(1) NOT NULL DEFAULT b'0',
    provider VARCHAR(40) NOT NULL,
    base_url VARCHAR(255),
    model_name VARCHAR(120),
    encrypted_api_key VARCHAR(1024),
    updated_by VARCHAR(100),
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE recommendation_posts (
    post_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_user_id INT NOT NULL,
    book_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_recommendation_post_author
        FOREIGN KEY (author_user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_post_book
        FOREIGN KEY (book_id) REFERENCES books(book_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE recommendation_likes (
    like_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_recommendation_like UNIQUE (post_id, user_id),
    CONSTRAINT fk_recommendation_like_post
        FOREIGN KEY (post_id) REFERENCES recommendation_posts(post_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_like_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE recommendation_follows (
    follow_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_user_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_recommendation_follow UNIQUE (follower_user_id, teacher_user_id),
    CONSTRAINT fk_recommendation_follow_follower
        FOREIGN KEY (follower_user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_recommendation_follow_teacher
        FOREIGN KEY (teacher_user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
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
CREATE INDEX idx_refresh_token_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_expires ON refresh_tokens(expires_at);

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
CREATE INDEX idx_recommendation_posts_author_time ON recommendation_posts(author_user_id, create_time);
CREATE INDEX idx_recommendation_posts_book_id ON recommendation_posts(book_id);
CREATE INDEX idx_recommendation_likes_user_id ON recommendation_likes(user_id);
CREATE INDEX idx_recommendation_follows_teacher_id ON recommendation_follows(teacher_user_id);

INSERT INTO users (
    user_id, username, password_hash, email, full_name, role, status,
    department, major, identity_type, enrollment_year, interest_tags, token_valid_after
) VALUES
    (1, 'admin', '$2a$10$pxttkzFukf09Cexqq2HjVeoUwtrIrZbsRqDxjil7yWGwLlHchamJ.', 'admin@library.com', 'System Administrator', 'ADMIN', 'ACTIVE', 'Library IT Center', 'Operations', 'STAFF', 2018, '["RBAC","Analytics","Operations"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (2, 'user', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'user@example.com', 'Test User', 'USER', 'ACTIVE', 'Computer Science School', 'Software Engineering', 'STUDENT', 2023, '["Java","AI","Databases"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (3, 'teacher', '$2a$10$SePxsIBnNxSUtKGRqLcktelUh3En5ALZ/wFeJ/.mHKvOoNewArARG', 'teacher@library.com', 'Demo Teacher', 'USER', 'ACTIVE', 'Computer Science School', 'Teaching and Research', 'TEACHER', 2012, '["Machine Learning","Recommender Systems"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (4, 'cataloger', '$2a$10$PiZS9WVUQsMVAb4rK1yqtu.yKljbiyPBpnVQ1puTiDjJqTbu5Ve5.', 'cataloger@library.com', 'Demo Cataloger', 'USER', 'ACTIVE', 'Acquisition Department', 'Metadata', 'STAFF', 2020, '["Catalog","Metadata","Books"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (5, 'librarian', '$2a$10$5idgV1GizC1hGrW.PitgQOxuCIxJ/oOYpVbeb5dSYCl.Acvym8QV6', 'librarian@library.com', 'Demo Librarian', 'USER', 'ACTIVE', 'Circulation Desk', 'Reader Services', 'STAFF', 2019, '["Circulation","Reservation","Fines"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (6, 'reader01', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader01@example.com', 'Liu Qiang', 'USER', 'ACTIVE', 'School of Economics', 'Finance', 'STUDENT', 2022, '["Economics","History","Literature"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (7, 'reader02', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader02@example.com', 'Zhao Min', 'USER', 'ACTIVE', 'School of Humanities', 'Chinese Literature', 'STUDENT', 2021, '["Fiction","History","Writing"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO permissions (permission_id, name, description) VALUES
    (1, 'book:read', '查询图书'),
    (2, 'book:write', '新增/修改图书'),
    (3, 'book:delete', '删除图书'),
    (4, 'loan:read', '查询借阅记录'),
    (5, 'loan:write', '创建/归还借阅'),
    (6, 'loan:manage', '借阅全量管理'),
    (7, 'fine:waive', '减免罚款'),
    (8, 'user:manage', '用户管理'),
    (9, 'review:audit', '审核评论'),
    (10, 'reservation:manage', '预约管理'),
    (11, 'appointment:manage', '服务预约管理'),
    (12, 'report:view', '查看统计报表'),
    (13, 'catalog:import', '批量导入图书数据');

INSERT INTO roles (role_id, name, display_name, description) VALUES
    (1, 'CATALOGER', '录入员', '负责图书信息录入与维护'),
    (2, 'LIBRARIAN', '图书管理员', '负责借阅、预约和图书日常管理');

INSERT INTO user_roles (user_id, role_id) VALUES
    (4, 1),
    (5, 2);

INSERT INTO role_permissions (role_id, permission_id) VALUES
    (1, 1), (1, 2), (1, 3), (1, 13),
    (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 10), (2, 11), (2, 12);

INSERT INTO publishers (publisher_id, name, address, contact_info, is_deleted) VALUES
    (1, 'Pearson Education', '221B North Bund Avenue, Shanghai', '021-60000001', b'0'),
    (2, '机械工业出版社', '北京市西城区百万庄大街22号', '010-60000002', b'0'),
    (3, '人民文学出版社', '北京市朝阳区农展馆南里10号', '010-60000003', b'0'),
    (4, '清华大学出版社', '北京市海淀区清华园1号', '010-60000004', b'0');

INSERT INTO categories (category_id, name, parent_id, description, is_deleted) VALUES
    (1, '计算机科学', NULL, '计算机与软件相关图书', b'0'),
    (2, '文学', NULL, '小说、散文与文学评论', b'0'),
    (3, '历史', NULL, '中国史与世界史', b'0'),
    (4, '经济管理', NULL, '经济学与管理学', b'0'),
    (5, '编程开发', 1, '编程语言、框架与工程实践', b'0'),
    (6, '人工智能', 1, '机器学习、深度学习与推荐系统', b'0'),
    (7, '现当代小说', 2, '中外现当代经典小说', b'0'),
    (8, '教育服务', NULL, '读者教育与馆内服务', b'0');

INSERT INTO authors (author_id, name, biography, birth_year, death_year, is_deleted) VALUES
    (1, 'Joshua Bloch', 'Java 平台知名专家，长期从事 Java 核心库设计。', 1961, NULL, b'0'),
    (2, 'Craig Walls', 'Spring 技术作者，长期专注企业级 Java 开发。', 1971, NULL, b'0'),
    (3, '周志华', '机器学习领域学者，研究方向包括机器学习与数据挖掘。', 1973, NULL, b'0'),
    (4, 'Gabriel Garcia Marquez', '拉丁美洲文学代表作家。', 1927, 2014, b'0'),
    (5, 'N. Gregory Mankiw', '经济学教材作者，宏观与微观经济学研究者。', 1958, NULL, b'0'),
    (6, '李航', '人工智能与统计学习方向作者。', 1960, NULL, b'0'),
    (7, '课程思政教研组', '高校公共课程教材编写团队。', NULL, NULL, b'0');

INSERT INTO books (
    book_id, isbn, title, cover_url, resource_mode, online_access_url, online_access_type,
    description, page_count, published_year, language, publisher_id, category_id, status
) VALUES
    (1, '9780134685991', 'Effective Java', 'https://images.example.com/books/effective-java.jpg', 'PHYSICAL_ONLY', NULL, NULL, 'Java 工程实践经典，适合中高级开发者。', 416, 2018, 'English', 1, 5, 'ACTIVE'),
    (2, '9781617292545', 'Spring Boot In Action', 'https://images.example.com/books/spring-boot-in-action.jpg', 'HYBRID', 'https://campus.example.com/ebooks/spring-boot-in-action', 'CAMPUS_ONLY', 'Spring Boot 快速开发实战教程。', 264, 2016, 'English', 2, 5, 'ACTIVE'),
    (3, '9787302423287', '机器学习实战', 'https://images.example.com/books/ml-practice.jpg', 'PHYSICAL_ONLY', NULL, NULL, '面向实战的机器学习入门与案例书。', 328, 2021, '中文', 2, 6, 'ACTIVE'),
    (4, '9787020042494', '百年孤独', 'https://images.example.com/books/one-hundred-years.jpg', 'PHYSICAL_ONLY', NULL, NULL, '世界文学名著。', 360, 2017, '中文', 3, 7, 'ACTIVE'),
    (5, '9787302655565', '人工智能导论', 'https://images.example.com/books/ai-intro.jpg', 'DIGITAL_ONLY', 'https://campus.example.com/ebooks/ai-intro', 'LICENSED_ACCESS', '适合高校课程教学的 AI 基础教材。', 420, 2024, '中文', 4, 6, 'ACTIVE'),
    (6, '9787300299969', '经济学原理', 'https://images.example.com/books/economics-principles.jpg', 'PHYSICAL_ONLY', NULL, NULL, '宏观与微观经济学基础教材。', 512, 2020, '中文', 4, 4, 'ACTIVE'),
    (7, '9787302566106', '深度学习与推荐系统', 'https://images.example.com/books/dl-recsys.jpg', 'HYBRID', 'https://campus.example.com/ebooks/dl-recsys', 'CAMPUS_ONLY', '结合深度学习与推荐系统工程实践。', 388, 2023, '中文', 1, 6, 'ACTIVE'),
    (8, '9787010252452', '中国近现代史纲要', 'https://images.example.com/books/modern-history-cn.jpg', 'PHYSICAL_ONLY', NULL, NULL, '高校通识课程教材。', 280, 2022, '中文', 3, 3, 'ACTIVE');

INSERT INTO book_authors (book_id, author_id, author_order) VALUES
    (1, 1, 1),
    (2, 2, 1),
    (3, 3, 1),
    (4, 4, 1),
    (5, 6, 1),
    (6, 5, 1),
    (7, 6, 1),
    (7, 3, 2),
    (8, 7, 1);

INSERT INTO book_copies (
    copy_id, book_id, status, acquisition_date, price, notes, location_code, rfid_tag, floor_plan_id
) VALUES
    (1, 1, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 220 DAY), 88.00, NULL, 'A-01-01', 'RFID-EJ-0001', 1),
    (2, 1, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 210 DAY), 88.00, NULL, 'A-01-02', 'RFID-EJ-0002', 1),
    (3, 1, 'RESERVED', DATE_SUB(CURRENT_DATE, INTERVAL 205 DAY), 88.00, '已为预约用户锁定', 'A-01-03', 'RFID-EJ-0003', 1),
    (4, 2, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 180 DAY), 76.50, NULL, 'A-02-01', 'RFID-SB-0001', 1),
    (5, 2, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 175 DAY), 76.50, NULL, 'A-02-02', 'RFID-SB-0002', 1),
    (6, 3, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 150 DAY), 69.90, NULL, 'A-03-01', 'RFID-ML-0001', 2),
    (7, 4, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 140 DAY), 45.00, NULL, 'B-01-01', 'RFID-LIT-0001', 2),
    (8, 4, 'LOST', DATE_SUB(CURRENT_DATE, INTERVAL 138 DAY), 45.00, '读者报失处理中', 'B-01-02', 'RFID-LIT-0002', 2),
    (9, 6, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 120 DAY), 96.00, NULL, 'C-01-01', 'RFID-ECO-0001', 3),
    (10, 6, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 118 DAY), 96.00, NULL, 'C-01-02', 'RFID-ECO-0002', 3),
    (11, 7, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 100 DAY), 82.00, NULL, 'A-04-01', 'RFID-RS-0001', 2),
    (12, 7, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 98 DAY), 82.00, NULL, 'A-04-02', 'RFID-RS-0002', 2),
    (13, 8, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 80 DAY), 38.00, NULL, 'D-01-01', 'RFID-HIS-0001', 3),
    (14, 2, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 75 DAY), 76.50, NULL, 'A-02-03', 'RFID-SB-0003', 1),
    (15, 3, 'DAMAGED', DATE_SUB(CURRENT_DATE, INTERVAL 70 DAY), 69.90, '封面破损，待修复', 'A-03-02', 'RFID-ML-0002', 2);

INSERT INTO loans (
    loan_id, copy_id, user_id, borrow_date, due_date, return_date, status, renewal_count, create_time, update_time
) VALUES
    (1, 2, 2, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 9 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (2, 6, 2, DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY), NULL, 'OVERDUE', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 21 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (3, 11, 3, DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 16 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY), 'RETURNED', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY)),
    (4, 8, 6, DATE_SUB(CURRENT_DATE, INTERVAL 50 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 36 DAY), NULL, 'LOST', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (5, 14, 7, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));

INSERT INTO reservations (
    reservation_id, book_id, user_id, reservation_date, expiry_date, status,
    allocated_copy_id, pickup_deadline, notification_sent, create_time, update_time
) VALUES
    (1, 1, 3, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (2, 1, 2, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'AWAITING_PICKUP', 3, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), b'1', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (3, 6, 7, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 'CANCELLED', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY)),
    (4, 7, 6, DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 13 DAY), 'EXPIRED', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 DAY));

INSERT INTO fines (
    fine_id, loan_id, user_id, amount, reason, date_issued, date_paid, status, create_time, update_time
) VALUES
    (1, 2, 2, 4.20, '逾期归还 7 天', DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), NULL, 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (2, 4, 6, 88.00, '馆藏遗失赔偿', DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), NULL, 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (3, 3, 3, 1.50, '预约未按时到馆确认', DATE_SUB(CURRENT_DATE, INTERVAL 19 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 18 DAY), 'PAID', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY));

INSERT INTO notifications (
    notification_id, user_id, type, title, content, is_read,
    target_type, target_id, route_hint, business_key, send_time
) VALUES
    (1, 2, 'DUE_REMINDER', '借阅即将到期', '你借阅的《Effective Java》将在 9 天内到期，请按时归还或续借。', b'0', 'LOAN', '1', '/my/loans', 'LOAN_DUE_1', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (2, 2, 'ARRIVAL_NOTICE', '预约图书已到馆', '你预约的《Effective Java》已为你锁定，请在两天内到馆取书。', b'0', 'RESERVATION', '2', '/my/reservations', 'RES_PICKUP_2', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (3, 3, 'SYSTEM', '系统升级通知', '馆藏检索与推荐服务已完成升级，欢迎继续使用。', b'1', 'SYSTEM', 'ANNOUNCEMENT-202603', '/notifications', 'SYS_UPGRADE_NOTICE', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (4, 6, 'NEW_BOOK_RECOMMEND', 'Demo Teacher 推荐了新书', '《深度学习与推荐系统》：推荐给正在做课程设计和毕设的同学。', b'0', 'RECOMMENDATION', '1', '/my/recommendations', 'TEACHER_RECOMMENDATION', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (5, 2, 'NEW_BOOK_RECOMMEND', 'Demo Teacher 推荐了新书', '《人工智能导论》：适合作为 AI 入门课程的配套阅读。', b'0', 'RECOMMENDATION', '2', '/my/recommendations', 'TEACHER_RECOMMENDATION_2', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR));

INSERT INTO search_history (search_id, user_id, keyword, result_count, search_time) VALUES
    (1, 2, 'Java', 12, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (2, 2, 'Spring Boot', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (3, 3, '推荐系统', 6, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
    (4, 6, '经济学', 8, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (5, 7, '中国近现代史', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
    (6, NULL, '机器学习', 10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (7, 2, '人工智能导论', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (8, 6, '百年孤独', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR));

INSERT INTO user_behavior_logs (log_id, user_id, book_id, action_type, duration_seconds, device_type, create_time) VALUES
    (1, 2, 1, 'VIEW_DETAIL', 95, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (2, 2, 1, 'BORROW_BOOK', 40, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (3, 2, 3, 'RESERVE_BOOK', 30, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (4, 3, 7, 'SHARE', 20, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (5, 3, 5, 'CLICK_PREVIEW', 140, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
    (6, 6, 6, 'VIEW_DETAIL', 70, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
    (7, 6, 4, 'ADD_TO_SHELF', 15, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (8, 7, 8, 'VIEW_DETAIL', 82, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
    (9, 7, 2, 'CLICK_PREVIEW', 58, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (10, 2, 7, 'VIEW_DETAIL', 110, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR));

INSERT INTO book_reviews (
    review_id, book_id, user_id, loan_id, rating, comment_text, status, create_time, update_time
) VALUES
    (1, 7, 3, 3, 5, '内容贴近教学场景，案例结构清晰，适合课堂与课程设计。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY)),
    (2, 1, 2, 1, 4, '条目式建议很多，适合复习 Java 工程细节。', 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (3, 4, 6, 4, 3, '经典文学作品，馆藏副本如果再多一些会更好。', 'REJECTED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY));

INSERT INTO user_feedbacks (
    feedback_id, user_id, category, subject, content, contact_email,
    status, admin_reply, handled_by, reply_time, create_time, update_time
) VALUES
    (1, 2, 'SYSTEM_BUG', '预约页面偶发刷新失败', '移动端在提交预约后偶发停留在加载状态，刷新后才能看到最新结果。', 'user@example.com', 'SUBMITTED', NULL, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
    (2, 6, 'SUGGESTION', '希望增加财经书单专区', '建议在首页增加财经与就业方向的专题推荐，便于快速找书。', 'reader01@example.com', 'RESOLVED', '已纳入下个版本首页改版计划。', 'admin', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO user_favorites (favorite_id, user_id, book_id, create_time) VALUES
    (1, 2, 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
    (2, 2, 7, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (3, 3, 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (4, 6, 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO service_appointments (
    appointment_id, user_id, loan_id, service_type, scheduled_time, method, status, notes, create_time, update_time
) VALUES
    (1, 2, 1, 'RETURN_BOOK', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), 'COUNTER', 'PENDING', '计划下班后到总服务台办理归还。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (2, 6, 4, 'CONSULTATION', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), 'COUNTER', 'PENDING', '咨询遗失赔偿及补办流程。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (3, 3, NULL, 'CONSULTATION', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), 'SMART_LOCKER', 'COMPLETED', '已完成教师荐书专区使用培训。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO seats (
    seat_id, seat_code, floor_name, floor_order, zone_name, area_name, seat_type,
    status, has_power, near_window, description
) VALUES
    (1, 'A101', '一层', 1, '安静自习区', '东区', 'STANDARD', 'AVAILABLE', b'1', b'1', '靠窗标准座位'),
    (2, 'A102', '一层', 1, '安静自习区', '东区', 'STANDARD', 'AVAILABLE', b'1', b'0', '靠墙标准座位'),
    (3, 'A201', '二层', 2, '计算机阅览区', '西区', 'COMPUTER', 'AVAILABLE', b'1', b'0', '配备台式机'),
    (4, 'A202', '二层', 2, '计算机阅览区', '西区', 'COMPUTER', 'AVAILABLE', b'1', b'1', '配备台式机且靠窗'),
    (5, 'B301', '三层', 3, '研讨区', '北区', 'DISCUSSION', 'AVAILABLE', b'0', b'0', '适合小组讨论'),
    (6, 'B302', '三层', 3, '研讨区', '北区', 'DISCUSSION', 'UNAVAILABLE', b'0', b'1', '设备维护中');

INSERT INTO seat_reservations (
    reservation_id, seat_id, user_id, start_time, end_time, status, notes, create_time, update_time
) VALUES
    (1, 1, 2, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 HOUR), 'ACTIVE', '准备数据库课程实验。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)),
    (2, 2, 6, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '09:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '12:00:00'), 'ACTIVE', '复习金融市场学。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)),
    (3, 3, 3, TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), '14:00:00'), TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), '17:00:00'), 'COMPLETED', '已完成推荐课程资料整理。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO rbac_audit_logs (log_id, actor_user_id, actor_username, action_type, target_type, target_id, detail, create_time) VALUES
    (1, 1, 'admin', 'ROLE_SYNC', 'ROLE', 'LIBRARIAN', '同步图书管理员角色权限集合。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (2, 1, 'admin', 'USER_ROLE_ASSIGN', 'USER', '5', '为 librarian 账号分配 LIBRARIAN 动态角色。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (3, 1, 'admin', 'USER_ROLE_ASSIGN', 'USER', '4', '为 cataloger 账号分配 CATALOGER 动态角色。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY));

INSERT INTO ai_gateway_settings (
    settings_id, enabled, provider, base_url, model_name, encrypted_api_key, updated_by
) VALUES
    (1, b'0', 'openai', 'https://api.openai.com/v1', 'gpt-4.1-mini', NULL, 'system');

INSERT INTO recommendation_posts (
    post_id, author_user_id, book_id, content, create_time, update_time
) VALUES
    (1, 3, 7, '推荐给正在做课程设计和毕业设计的同学。这本书把召回、排序和特征工程讲得比较系统，也兼顾工程落地。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (2, 3, 5, '如果你是第一次系统学习人工智能，可以先从这本教材入手，再配合课程实验做知识梳理。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR));

INSERT INTO recommendation_likes (like_id, post_id, user_id, create_time) VALUES
    (1, 1, 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (2, 1, 6, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (3, 2, 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR));

INSERT INTO recommendation_follows (follow_id, follower_user_id, teacher_user_id, create_time) VALUES
    (1, 2, 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
    (2, 6, 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY)),
    (3, 7, 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY));

INSERT INTO users (
    user_id, username, password_hash, email, full_name, role, status,
    department, major, identity_type, enrollment_year, interest_tags, token_valid_after
) VALUES
    (8, 'teacher02', '$2a$10$SePxsIBnNxSUtKGRqLcktelUh3En5ALZ/wFeJ/.mHKvOoNewArARG', 'teacher02@library.com', 'Wang Teacher', 'USER', 'ACTIVE', 'School of Statistics', 'Data Science Teaching', 'TEACHER', 2015, '["Data Science","Statistics","Python"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (9, 'reader03', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader03@example.com', 'Chen Yu', 'USER', 'ACTIVE', 'School of Data Science', 'Data Science', 'STUDENT', 2022, '["Data Analysis","Python","AI"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (10, 'reader04', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader04@example.com', 'Lin Mo', 'USER', 'ACTIVE', 'School of Computer Science', 'Artificial Intelligence', 'STUDENT', 2023, '["Recommendation","Algorithms","Backend"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (11, 'reader05', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader05@example.com', 'Xu Qing', 'USER', 'ACTIVE', 'School of Humanities', 'Chinese Literature', 'STUDENT', 2021, '["Fiction","Essay","History"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (12, 'reader06', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader06@example.com', 'He Ran', 'USER', 'ACTIVE', 'School of Economics', 'Finance', 'STUDENT', 2022, '["Finance","Investment","Management"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (13, 'service01', '$2a$10$5idgV1GizC1hGrW.PitgQOxuCIxJ/oOYpVbeb5dSYCl.Acvym8QV6', 'service01@library.com', 'Reader Service Staff', 'USER', 'ACTIVE', 'Reader Service Center', 'Circulation', 'STAFF', 2020, '["Service","Circulation","Support"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (14, 'teacher03', '$2a$10$SePxsIBnNxSUtKGRqLcktelUh3En5ALZ/wFeJ/.mHKvOoNewArARG', 'teacher03@library.com', 'Li Teacher', 'USER', 'ACTIVE', 'School of Economics', 'Economics Teaching', 'TEACHER', 2011, '["Economics","Finance","Public Policy"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (15, 'graduate01', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'graduate01@example.com', 'Gao Wen', 'USER', 'ACTIVE', 'School of Computer Science', 'Software Engineering', 'STUDENT', 2020, '["Distributed Systems","Data","Papers"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (16, 'graduate02', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'graduate02@example.com', 'Sun Yi', 'USER', 'ACTIVE', 'School of Computer Science', 'Artificial Intelligence', 'STUDENT', 2020, '["ML","CV","Search"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (17, 'reader07', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader07@example.com', 'Tang Jie', 'USER', 'ACTIVE', 'School of Public Administration', 'Information Management', 'STUDENT', 2024, '["Database","Service Design","Management"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (18, 'reader08', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader08@example.com', 'Zheng Fan', 'USER', 'ACTIVE', 'School of Mathematics', 'Applied Mathematics', 'STUDENT', 2023, '["Algorithms","Probability","Optimization"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO user_roles (user_id, role_id) VALUES
    (13, 2);

INSERT INTO publishers (publisher_id, name, address, contact_info, is_deleted) VALUES
    (5, '中信出版社', '北京市朝阳区惠新东街甲4号', '010-60000005', b'0'),
    (6, 'O''Reilly Media', '1005 Gravenstein Highway North, Sebastopol', '001-707-8277000', b'0'),
    (7, '人民邮电出版社', '北京市丰台区成寿寺路11号', '010-60000007', b'0'),
    (8, 'Cambridge University Press', 'Shaftesbury Road, Cambridge', '0044-1223-326070', b'0');

INSERT INTO categories (category_id, name, parent_id, description, is_deleted) VALUES
    (9, '数据科学', 6, '数据分析、统计学习与数据工程', b'0'),
    (10, '软件工程', 5, '工程实践、架构与开发方法', b'0'),
    (11, '经典文学', 2, '国内外经典文学作品', b'0'),
    (12, '金融投资', 4, '金融市场、投资与风险管理', b'0'),
    (13, '用户体验与服务', 8, '服务设计、体验管理与读者服务', b'0');

INSERT INTO authors (author_id, name, biography, birth_year, death_year, is_deleted) VALUES
    (8, 'Robert C. Martin', '软件工程与整洁代码实践作者。', 1952, NULL, b'0'),
    (9, 'Martin Kleppmann', '分布式系统与数据基础设施作者。', 1986, NULL, b'0'),
    (10, '余华', '中国当代作家，代表作包括《活着》。', 1960, NULL, b'0'),
    (11, 'Wes McKinney', 'Pandas 作者，数据分析实践专家。', 1984, NULL, b'0'),
    (12, 'Thomas H. Cormen', '算法教材作者之一。', 1956, NULL, b'0'),
    (13, 'Abraham Silberschatz', '操作系统与数据库教材作者。', 1952, NULL, b'0'),
    (14, '王珊', '数据库系统方向教材作者。', 1946, NULL, b'0'),
    (15, '韩天峰', '服务设计与用户体验研究者。', NULL, NULL, b'0'),
    (16, '陈强', '金融学与投资学教材作者。', NULL, NULL, b'0'),
    (17, '统计课程组', '高校统计课程建设团队。', NULL, NULL, b'0'),
    (18, 'Thomas H. Cormen 等', '算法导论联合作者团队。', NULL, NULL, b'0');

INSERT INTO books (
    book_id, isbn, title, cover_url, resource_mode, online_access_url, online_access_type,
    description, page_count, published_year, language, publisher_id, category_id, status
) VALUES
    (9, '9780132350884', 'Clean Code', 'https://images.example.com/books/clean-code.jpg', 'PHYSICAL_ONLY', NULL, NULL, '软件工程代码质量经典。', 464, 2010, 'English', 6, 10, 'ACTIVE'),
    (10, '9781449373320', 'Designing Data-Intensive Applications', 'https://images.example.com/books/ddia.jpg', 'HYBRID', 'https://campus.example.com/ebooks/ddia', 'CAMPUS_ONLY', '数据密集型应用系统设计经典。', 616, 2018, 'English', 8, 9, 'ACTIVE'),
    (11, '9787115471307', '统计学习方法', 'https://images.example.com/books/stat-learning.jpg', 'PHYSICAL_ONLY', NULL, NULL, '统计学习与机器学习经典教材。', 424, 2019, '中文', 7, 9, 'ACTIVE'),
    (12, '9787506365437', '活着', 'https://images.example.com/books/to-live.jpg', 'PHYSICAL_ONLY', NULL, NULL, '中国当代文学代表作品。', 191, 2012, '中文', 3, 11, 'ACTIVE'),
    (13, '9787521753455', '金融学', 'https://images.example.com/books/finance.jpg', 'PHYSICAL_ONLY', NULL, NULL, '金融市场与金融机构基础教材。', 430, 2022, '中文', 5, 12, 'ACTIVE'),
    (14, '9781098104030', 'Python for Data Analysis', 'https://images.example.com/books/python-data-analysis.jpg', 'HYBRID', 'https://campus.example.com/ebooks/python-data-analysis', 'LICENSED_ACCESS', 'Pandas 数据分析实践教材。', 579, 2023, 'English', 6, 9, 'ACTIVE'),
    (15, '9781119800361', 'Operating System Concepts', 'https://images.example.com/books/os-concepts.jpg', 'PHYSICAL_ONLY', NULL, NULL, '操作系统核心概念与案例。', 944, 2021, 'English', 8, 10, 'ACTIVE'),
    (16, '9787040581591', '数据库系统概论', 'https://images.example.com/books/db-concepts.jpg', 'PHYSICAL_ONLY', NULL, NULL, '数据库系统课程基础教材。', 510, 2023, '中文', 4, 10, 'ACTIVE'),
    (17, '9787521749120', '服务设计与用户体验', 'https://images.example.com/books/service-design.jpg', 'PHYSICAL_ONLY', NULL, NULL, '围绕服务设计和用户旅程的实践书。', 320, 2022, '中文', 5, 13, 'ACTIVE'),
    (18, '9780262046305', '算法导论', 'https://images.example.com/books/clrs.jpg', 'PHYSICAL_ONLY', NULL, NULL, '算法与数据结构经典教材。', 1312, 2022, '中文', 8, 10, 'ACTIVE');

INSERT INTO book_authors (book_id, author_id, author_order) VALUES
    (9, 8, 1),
    (10, 9, 1),
    (11, 6, 1),
    (12, 10, 1),
    (13, 16, 1),
    (14, 11, 1),
    (15, 13, 1),
    (16, 14, 1),
    (17, 15, 1),
    (18, 12, 1),
    (18, 18, 2);

INSERT INTO book_copies (
    copy_id, book_id, status, acquisition_date, price, notes, location_code, rfid_tag, floor_plan_id
) VALUES
    (16, 9, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 65 DAY), 79.00, NULL, 'E-01-01', 'RFID-CC-0001', 2),
    (17, 9, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 64 DAY), 79.00, NULL, 'E-01-02', 'RFID-CC-0002', 2),
    (18, 9, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 63 DAY), 79.00, NULL, 'E-01-03', 'RFID-CC-0003', 2),
    (19, 10, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 60 DAY), 108.00, NULL, 'E-02-01', 'RFID-DDIA-0001', 2),
    (20, 10, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 59 DAY), 108.00, NULL, 'E-02-02', 'RFID-DDIA-0002', 2),
    (21, 10, 'RESERVED', DATE_SUB(CURRENT_DATE, INTERVAL 58 DAY), 108.00, '预约锁定中', 'E-02-03', 'RFID-DDIA-0003', 2),
    (22, 11, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 56 DAY), 66.00, NULL, 'E-03-01', 'RFID-SLM-0001', 2),
    (23, 11, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 55 DAY), 66.00, NULL, 'E-03-02', 'RFID-SLM-0002', 2),
    (24, 11, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 54 DAY), 66.00, NULL, 'E-03-03', 'RFID-SLM-0003', 2),
    (25, 12, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 52 DAY), 39.00, NULL, 'F-01-01', 'RFID-TL-0001', 3),
    (26, 12, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 51 DAY), 39.00, NULL, 'F-01-02', 'RFID-TL-0002', 3),
    (27, 12, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 50 DAY), 39.00, NULL, 'F-01-03', 'RFID-TL-0003', 3),
    (28, 13, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 48 DAY), 72.00, NULL, 'G-01-01', 'RFID-FIN-0001', 3),
    (29, 13, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 47 DAY), 72.00, NULL, 'G-01-02', 'RFID-FIN-0002', 3),
    (30, 13, 'RESERVED', DATE_SUB(CURRENT_DATE, INTERVAL 46 DAY), 72.00, '预约锁定中', 'G-01-03', 'RFID-FIN-0003', 3),
    (31, 14, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 44 DAY), 95.00, NULL, 'E-04-01', 'RFID-PDA-0001', 2),
    (32, 14, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 43 DAY), 95.00, NULL, 'E-04-02', 'RFID-PDA-0002', 2),
    (33, 14, 'DAMAGED', DATE_SUB(CURRENT_DATE, INTERVAL 42 DAY), 95.00, '页脚有轻微破损', 'E-04-03', 'RFID-PDA-0003', 2),
    (34, 15, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 40 DAY), 118.00, NULL, 'H-01-01', 'RFID-OS-0001', 2),
    (35, 15, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 39 DAY), 118.00, NULL, 'H-01-02', 'RFID-OS-0002', 2),
    (36, 15, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 38 DAY), 118.00, NULL, 'H-01-03', 'RFID-OS-0003', 2),
    (37, 16, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 36 DAY), 58.00, NULL, 'H-02-01', 'RFID-DB-0001', 2),
    (38, 16, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY), 58.00, NULL, 'H-02-02', 'RFID-DB-0002', 2),
    (39, 16, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 34 DAY), 58.00, NULL, 'H-02-03', 'RFID-DB-0003', 2),
    (40, 17, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 32 DAY), 63.00, NULL, 'S-01-01', 'RFID-SD-0001', 1),
    (41, 17, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 31 DAY), 63.00, NULL, 'S-01-02', 'RFID-SD-0002', 1),
    (42, 18, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 29 DAY), 128.00, NULL, 'H-03-01', 'RFID-ALG-0001', 2),
    (43, 18, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 28 DAY), 128.00, NULL, 'H-03-02', 'RFID-ALG-0002', 2),
    (44, 18, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 27 DAY), 128.00, NULL, 'H-03-03', 'RFID-ALG-0003', 2);

INSERT INTO loans (
    loan_id, copy_id, user_id, borrow_date, due_date, return_date, status, renewal_count, create_time, update_time
) VALUES
    (6, 17, 9, DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
    (7, 20, 10, DATE_SUB(CURRENT_DATE, INTERVAL 24 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), NULL, 'OVERDUE', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (8, 24, 15, DATE_SUB(CURRENT_DATE, INTERVAL 18 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), 'RETURNED', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
    (9, 26, 11, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 11 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (10, 32, 12, DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY)),
    (11, 36, 16, DATE_SUB(CURRENT_DATE, INTERVAL 27 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 13 DAY), NULL, 'OVERDUE', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 27 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (12, 38, 17, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 13 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (13, 43, 18, DATE_SUB(CURRENT_DATE, INTERVAL 9 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY)),
    (14, 23, 8, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));

INSERT INTO reservations (
    reservation_id, book_id, user_id, reservation_date, expiry_date, status,
    allocated_copy_id, pickup_deadline, notification_sent, create_time, update_time
) VALUES
    (5, 10, 9, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'AWAITING_PICKUP', 21, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), b'1', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (6, 13, 12, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'AWAITING_PICKUP', 30, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), b'1', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (7, 18, 10, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (8, 9, 18, DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), 'CANCELLED', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
    (9, 17, 11, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (10, 11, 16, DATE_SUB(CURRENT_DATE, INTERVAL 18 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 11 DAY), 'EXPIRED', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 DAY)),
    (11, 16, 17, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO fines (
    fine_id, loan_id, user_id, amount, reason, date_issued, date_paid, status, create_time, update_time
) VALUES
    (4, 7, 10, 6.80, '逾期归还 10 天', DATE_SUB(CURRENT_DATE, INTERVAL 9 DAY), NULL, 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (5, 11, 16, 8.40, '逾期归还 13 天', DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 'PAID', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));

INSERT INTO notifications (
    notification_id, user_id, type, title, content, is_read,
    target_type, target_id, route_hint, business_key, send_time
) VALUES
    (6, 9, 'ARRIVAL_NOTICE', '预约图书已到馆', '你预约的《Designing Data-Intensive Applications》已到馆，请尽快取书。', b'0', 'RESERVATION', '5', '/my/reservations', 'RES_PICKUP_5', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (7, 12, 'ARRIVAL_NOTICE', '预约图书已到馆', '你预约的《金融学》已到馆，请在 24 小时内办理取书。', b'0', 'RESERVATION', '6', '/my/reservations', 'RES_PICKUP_6', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 80 MINUTE)),
    (8, 10, 'DUE_REMINDER', '借阅已逾期', '你借阅的《Designing Data-Intensive Applications》已逾期，请尽快归还。', b'0', 'LOAN', '7', '/my/loans', 'LOAN_OVERDUE_7', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (9, 16, 'DUE_REMINDER', '借阅已逾期', '你借阅的《Operating System Concepts》已逾期，请尽快归还。', b'0', 'LOAN', '11', '/my/loans', 'LOAN_OVERDUE_11', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (10, 17, 'SYSTEM', '服务时间调整提醒', '本周末总服务台闭馆时间调整为 20:00，请合理安排到馆计划。', b'1', 'SYSTEM', 'SERVICE-HOUR-1', '/notifications', 'SERVICE_HOUR_ADJUST', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (11, 18, 'SYSTEM', '新书专区上新', '算法与软件工程新书已到馆，可前往二层 E 区查看。', b'0', 'BOOK_SHELF', 'E-NEW', '/books', 'NEW_BOOK_ZONE_E', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (12, 8, 'SYSTEM', '教师荐书功能开放', '你现在可以在推荐专区发布课程荐书内容。', b'1', 'RECOMMENDATION', 'OPEN-1', '/my/recommendations', 'TEACHER_RECOMMEND_OPEN', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (13, 14, 'SYSTEM', '教师荐书功能开放', '你现在可以在推荐专区发布金融方向荐书内容。', b'1', 'RECOMMENDATION', 'OPEN-2', '/my/recommendations', 'TEACHER_RECOMMEND_OPEN_2', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (14, 13, 'SYSTEM', '值班排班同步', '读者服务中心本周排班已同步到系统。', b'0', 'SYSTEM', 'SCHED-1', '/notifications', 'SERVICE_SCHEDULE_SYNC', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (15, 11, 'SYSTEM', '文学书单更新', '馆内文学经典专题书单已更新，可在首页查看。', b'0', 'BOOKLIST', 'LIST-1', '/books', 'BOOKLIST_REFRESH', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR));

INSERT INTO search_history (search_id, user_id, keyword, result_count, search_time) VALUES
    (9, 9, 'Clean Code', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (10, 10, '数据密集型应用', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (11, 11, '活着', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
    (12, 12, '金融学', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
    (13, 15, '统计学习方法', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)),
    (14, 16, '操作系统', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
    (15, 17, '数据库系统概论', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (16, 18, '算法导论', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
    (17, 8, '数据科学', 6, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (18, 14, '金融投资', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (19, 13, '服务设计', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (20, 9, 'Python 数据分析', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR));

INSERT INTO user_behavior_logs (log_id, user_id, book_id, action_type, duration_seconds, device_type, create_time) VALUES
    (11, 9, 9, 'VIEW_DETAIL', 86, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (12, 9, 10, 'CLICK_PREVIEW', 45, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (13, 10, 10, 'BORROW_BOOK', 33, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 DAY)),
    (14, 10, 18, 'RESERVE_BOOK', 27, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (15, 11, 12, 'BORROW_BOOK', 40, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (16, 11, 17, 'VIEW_DETAIL', 61, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (17, 12, 13, 'VIEW_DETAIL', 72, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (18, 12, 13, 'RESERVE_BOOK', 18, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (19, 13, 17, 'SHARE', 20, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (20, 14, 13, 'VIEW_DETAIL', 95, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (21, 15, 11, 'CLICK_PREVIEW', 80, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
    (22, 16, 15, 'VIEW_DETAIL', 66, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
    (23, 16, 15, 'BORROW_BOOK', 39, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 27 DAY)),
    (24, 17, 16, 'BORROW_BOOK', 28, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (25, 18, 18, 'BORROW_BOOK', 42, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY));

INSERT INTO book_reviews (
    review_id, book_id, user_id, loan_id, rating, comment_text, status, create_time, update_time
) VALUES
    (4, 11, 15, 8, 5, '作为统计学习教材非常扎实，公式与推导都很清晰。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (5, 9, 9, 6, 4, '适合代码规范入门，示例易读。', 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (6, 12, 11, 9, 5, '文学作品借阅体验很好，馆藏副本状态也清晰。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (7, 18, 18, 13, 4, '适合刷算法基础，不过阅读量较大。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (8, 16, 17, 12, 4, '数据库课程配套阅读足够用了，希望再补一些案例书。', 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (9, 11, 8, 14, 5, '适合作为教师备课参考，结构完整。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR));

INSERT INTO user_feedbacks (
    feedback_id, user_id, category, subject, content, contact_email,
    status, admin_reply, handled_by, reply_time, create_time, update_time
) VALUES
    (3, 10, 'BOOK_INFO', '希望补充更多分布式系统馆藏', 'DDIA 类图书当前副本较少，建议增加副本量。', 'reader04@example.com', 'IN_PROGRESS', '已通知采编部评估补采。', 'admin', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (4, 12, 'SERVICE_EXPERIENCE', '预约取书流程顺畅', '预约通知和到馆取书流程都比较清晰，体验不错。', 'reader06@example.com', 'RESOLVED', '感谢反馈，欢迎继续提出建议。', 'service01', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (5, 17, 'SUGGESTION', '希望增加服务设计专题位', '服务设计与用户体验相关图书可以集中陈列，方便查找。', 'reader07@example.com', 'SUBMITTED', NULL, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR));

INSERT INTO user_favorites (favorite_id, user_id, book_id, create_time) VALUES
    (5, 9, 10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (6, 9, 14, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (7, 10, 18, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (8, 11, 12, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (9, 12, 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (10, 15, 11, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (11, 16, 15, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
    (12, 17, 16, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (13, 18, 18, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (14, 14, 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO service_appointments (
    appointment_id, user_id, loan_id, service_type, scheduled_time, method, status, notes, create_time, update_time
) VALUES
    (4, 9, 6, 'RETURN_BOOK', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), 'COUNTER', 'PENDING', '计划到馆归还《Clean Code》。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (5, 10, 7, 'CONSULTATION', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), 'COUNTER', 'PENDING', '咨询逾期处理与续借限制。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (6, 12, NULL, 'CONSULTATION', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), 'COUNTER', 'COMPLETED', '已完成金融书单咨询。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (7, 17, 12, 'RETURN_BOOK', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), 'SMART_LOCKER', 'PENDING', '准备通过自助还书柜办理。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR));

INSERT INTO seats (
    seat_id, seat_code, floor_name, floor_order, zone_name, area_name, seat_type,
    status, has_power, near_window, description
) VALUES
    (7, 'C101', '四层', 4, '数据学习区', '东区', 'STANDARD', 'AVAILABLE', b'1', b'1', '适合长时间学习'),
    (8, 'C102', '四层', 4, '数据学习区', '东区', 'STANDARD', 'AVAILABLE', b'1', b'0', '靠近书架'),
    (9, 'C201', '四层', 4, '研修区', '西区', 'COMPUTER', 'AVAILABLE', b'1', b'0', '配备数据分析软件'),
    (10, 'C202', '四层', 4, '研修区', '西区', 'COMPUTER', 'AVAILABLE', b'1', b'1', '双屏工位'),
    (11, 'D301', '五层', 5, '安静阅览区', '南区', 'STANDARD', 'AVAILABLE', b'0', b'1', '安静区靠窗'),
    (12, 'D302', '五层', 5, '安静阅览区', '南区', 'STANDARD', 'AVAILABLE', b'0', b'0', '安静区中部');

INSERT INTO seat_reservations (
    reservation_id, seat_id, user_id, start_time, end_time, status, notes, create_time, update_time
) VALUES
    (4, 7, 9, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '13:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '17:00:00'), 'ACTIVE', '准备数据分析课程作业。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (5, 8, 10, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '09:30:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '12:30:00'), 'ACTIVE', '准备算法专题复习。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (6, 9, 15, TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), '14:00:00'), TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), '18:00:00'), 'COMPLETED', '已完成论文资料整理。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (7, 11, 17, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '10:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '15:00:00'), 'ACTIVE', '准备数据库课程报告。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (8, 12, 18, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), '08:30:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), '11:30:00'), 'ACTIVE', '线性代数与算法联合复习。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE));

INSERT INTO rbac_audit_logs (log_id, actor_user_id, actor_username, action_type, target_type, target_id, detail, create_time) VALUES
    (4, 1, 'admin', 'USER_ROLE_ASSIGN', 'USER', '13', '为 service01 分配 LIBRARIAN 动态角色。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (5, 1, 'admin', 'CATALOG_SYNC', 'BOOK', '9-18', '完成第二批运营馆藏数据导入。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (6, 1, 'admin', 'SEAT_LAYOUT_SYNC', 'SEAT', '7-12', '补充四层与五层座位资源。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR));

INSERT INTO recommendation_posts (
    post_id, author_user_id, book_id, content, create_time, update_time
) VALUES
    (3, 8, 10, '如果你对数据平台、消息队列和一致性设计感兴趣，这本书值得反复读。适合作为研究生课程延伸阅读。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 100 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 100 MINUTE)),
    (4, 8, 14, '做数据分析课程项目的同学可以优先看这本，案例足够落地。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE)),
    (5, 14, 13, '金融学入门建议先打基础概念，再配合现实案例理解金融市场运行。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 55 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 55 MINUTE)),
    (6, 14, 17, '服务设计这本书适合做学生服务、政务服务和图书馆服务优化的同学阅读。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE));

INSERT INTO recommendation_likes (like_id, post_id, user_id, create_time) VALUES
    (4, 3, 9, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 95 MINUTE)),
    (5, 3, 10, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (6, 4, 15, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)),
    (7, 5, 12, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 45 MINUTE)),
    (8, 5, 18, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 35 MINUTE)),
    (9, 6, 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 MINUTE)),
    (10, 6, 17, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 MINUTE));

INSERT INTO recommendation_follows (follow_id, follower_user_id, teacher_user_id, create_time) VALUES
    (4, 9, 8, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY)),
    (5, 10, 8, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
    (6, 12, 14, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY)),
    (7, 17, 14, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)),
    (8, 18, 8, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY));

INSERT INTO users (
    user_id, username, password_hash, email, full_name, role, status,
    department, major, identity_type, enrollment_year, interest_tags, token_valid_after
) VALUES
    (19, 'teacher04', '$2a$10$SePxsIBnNxSUtKGRqLcktelUh3En5ALZ/wFeJ/.mHKvOoNewArARG', 'teacher04@library.com', 'Zhou Teacher', 'USER', 'ACTIVE', 'School of Cyber Security', 'Network Security Teaching', 'TEACHER', 2010, '["Security","Networks","Operating Systems"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (20, 'teacher05', '$2a$10$SePxsIBnNxSUtKGRqLcktelUh3En5ALZ/wFeJ/.mHKvOoNewArARG', 'teacher05@library.com', 'Qian Teacher', 'USER', 'ACTIVE', 'School of Management', 'Product and Service Teaching', 'TEACHER', 2013, '["Management","Product","Service Design"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (21, 'reader09', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader09@example.com', 'Peng Rui', 'USER', 'ACTIVE', 'School of Cyber Security', 'Information Security', 'STUDENT', 2022, '["Security","Linux","Networks"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (22, 'reader10', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader10@example.com', 'Yuan Xin', 'USER', 'ACTIVE', 'School of Computer Science', 'Computer Science', 'STUDENT', 2024, '["Algorithms","Java","Databases"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (23, 'reader11', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader11@example.com', 'Ma Jing', 'USER', 'ACTIVE', 'School of Management', 'Information Management', 'STUDENT', 2023, '["Product","Management","Operations"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (24, 'reader12', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader12@example.com', 'Cao Lin', 'USER', 'ACTIVE', 'School of Literature', 'Journalism', 'STUDENT', 2022, '["Writing","Media","Literature"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (25, 'reader13', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader13@example.com', 'Deng Ke', 'USER', 'ACTIVE', 'School of Economics', 'Economics', 'STUDENT', 2021, '["Macro","Finance","Policy"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (26, 'reader14', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader14@example.com', 'Feng Jia', 'USER', 'ACTIVE', 'School of Statistics', 'Applied Statistics', 'STUDENT', 2021, '["Statistics","R","Data"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (27, 'reader15', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader15@example.com', 'Hu Yue', 'USER', 'ACTIVE', 'School of Computer Science', 'Software Engineering', 'STUDENT', 2024, '["Software","Testing","Architecture"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (28, 'reader16', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader16@example.com', 'Jiang Nan', 'USER', 'ACTIVE', 'School of Public Administration', 'Public Service', 'STUDENT', 2023, '["Service","Governance","Public Policy"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (29, 'reader17', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader17@example.com', 'Kuang Yi', 'USER', 'ACTIVE', 'School of Mathematics', 'Applied Mathematics', 'STUDENT', 2022, '["Optimization","Probability","Math"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (30, 'reader18', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader18@example.com', 'Luo Sheng', 'USER', 'ACTIVE', 'School of Computer Science', 'Network Engineering', 'STUDENT', 2021, '["Networks","Security","Distributed Systems"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (31, 'reader19', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader19@example.com', 'Meng Zhe', 'USER', 'ACTIVE', 'School of Economics', 'Financial Engineering', 'STUDENT', 2020, '["Quant","Finance","Data"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (32, 'reader20', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'reader20@example.com', 'Ning Yue', 'USER', 'ACTIVE', 'School of Data Science', 'Big Data', 'STUDENT', 2023, '["Spark","Data Warehouse","ETL"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (33, 'service02', '$2a$10$5idgV1GizC1hGrW.PitgQOxuCIxJ/oOYpVbeb5dSYCl.Acvym8QV6', 'service02@library.com', 'Circulation Staff 2', 'USER', 'ACTIVE', 'Reader Service Center', 'Circulation', 'STAFF', 2021, '["Service","Appointments","Support"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (34, 'graduate03', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'graduate03@example.com', 'Ou Yang', 'USER', 'ACTIVE', 'School of Computer Science', 'Cyber Security', 'STUDENT', 2019, '["Security","Paper Reading","Systems"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (35, 'graduate04', '$2a$10$DxDRdhqESD4iRRcLwSc/.OP6xbIaNZRx3dc5sr8AbbryhLRnA0ULq', 'graduate04@example.com', 'Pei Chen', 'USER', 'ACTIVE', 'School of Management', 'Information Systems', 'STUDENT', 2019, '["Product Analytics","Research","UX"]', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO user_roles (user_id, role_id) VALUES
    (33, 2);

INSERT INTO publishers (publisher_id, name, address, contact_info, is_deleted) VALUES
    (9, '电子工业出版社', '北京市海淀区万寿路173号', '010-60000009', b'0'),
    (10, '华章出版社', '北京市朝阳区酒仙桥路10号', '010-60000010', b'0'),
    (11, 'MIT Press', 'One Rogers Street, Cambridge', '001-617-2535646', b'0'),
    (12, 'Prentice Hall', '221 River Street, Hoboken', '001-201-2367000', b'0');

INSERT INTO categories (category_id, name, parent_id, description, is_deleted) VALUES
    (14, '网络与安全', 1, '网络协议、安全技术与攻防基础', b'0'),
    (15, '产品与运营', 8, '产品设计、运营管理与服务流程', b'0'),
    (16, '社会科学', NULL, '社会学、公共管理与组织研究', b'0'),
    (17, '论文写作', 8, '学术写作、研究方法与论文规范', b'0');

INSERT INTO authors (author_id, name, biography, birth_year, death_year, is_deleted) VALUES
    (19, 'Andrew S. Tanenbaum', '计算机网络与操作系统作者。', 1944, NULL, b'0'),
    (20, 'Ian Goodfellow', '深度学习研究者与教材作者。', 1985, NULL, b'0'),
    (21, 'Kathy Sierra', 'Head First 系列作者。', NULL, NULL, b'0'),
    (22, 'Charles E. Leiserson', '算法与并行计算研究者。', 1953, NULL, b'0'),
    (23, 'Bruce Schneier', '安全领域作者与研究者。', 1963, NULL, b'0'),
    (24, 'Don Norman', '设计与用户体验领域学者。', 1935, NULL, b'0'),
    (25, 'Philip Kotler', '营销管理经典作者。', 1931, NULL, b'0'),
    (26, 'John W. Creswell', '研究方法与论文写作领域作者。', 1945, NULL, b'0'),
    (27, '王道论坛', '计算机考研与基础课程辅导团队。', NULL, NULL, b'0'),
    (28, '李沐', '深度学习实践方向作者。', NULL, NULL, b'0');

INSERT INTO books (
    book_id, isbn, title, cover_url, resource_mode, online_access_url, online_access_type,
    description, page_count, published_year, language, publisher_id, category_id, status
) VALUES
    (19, '9787115512055', 'Computer Networks', 'https://images.example.com/books/computer-networks.jpg', 'PHYSICAL_ONLY', NULL, NULL, '经典计算机网络教材。', 960, 2021, 'English', 9, 14, 'ACTIVE'),
    (20, '9787115472144', 'Deep Learning', 'https://images.example.com/books/deep-learning.jpg', 'HYBRID', 'https://campus.example.com/ebooks/deep-learning', 'CAMPUS_ONLY', '深度学习理论与实践教材。', 775, 2018, 'English', 11, 6, 'ACTIVE'),
    (21, '9787508353944', 'Head First Design Patterns', 'https://images.example.com/books/hfdp.jpg', 'PHYSICAL_ONLY', NULL, NULL, '设计模式入门经典。', 694, 2020, 'English', 9, 10, 'ACTIVE'),
    (22, '9787302602590', 'Marketing Management', 'https://images.example.com/books/marketing-management.jpg', 'PHYSICAL_ONLY', NULL, NULL, '市场营销管理基础教材。', 512, 2022, 'English', 10, 15, 'ACTIVE'),
    (23, '9787111615466', '网络安全基础', 'https://images.example.com/books/network-security.jpg', 'PHYSICAL_ONLY', NULL, NULL, '网络安全与防护基础教材。', 402, 2023, '中文', 9, 14, 'ACTIVE'),
    (24, '9787115428024', '数据仓库工具箱', 'https://images.example.com/books/data-warehouse-toolkit.jpg', 'HYBRID', 'https://campus.example.com/ebooks/data-warehouse-toolkit', 'LICENSED_ACCESS', '数仓建模与 BI 项目实践。', 580, 2021, '中文', 10, 9, 'ACTIVE'),
    (25, '9787115563819', '用户体验要素', 'https://images.example.com/books/ux-elements.jpg', 'PHYSICAL_ONLY', NULL, NULL, '用户体验基础框架与方法。', 250, 2021, '中文', 7, 15, 'ACTIVE'),
    (26, '9787302553564', '研究设计与论文写作', 'https://images.example.com/books/research-design.jpg', 'PHYSICAL_ONLY', NULL, NULL, '研究方法与论文结构写作指南。', 376, 2022, '中文', 4, 17, 'ACTIVE'),
    (27, '9787302528944', '操作系统考研指导', 'https://images.example.com/books/os-exam-guide.jpg', 'PHYSICAL_ONLY', NULL, NULL, '操作系统重点知识与真题解析。', 420, 2020, '中文', 4, 10, 'ACTIVE'),
    (28, '9787115546089', '动手学深度学习', 'https://images.example.com/books/d2l.jpg', 'HYBRID', 'https://campus.example.com/ebooks/d2l', 'OPEN_ACCESS', '面向实践的深度学习教材。', 620, 2023, '中文', 7, 6, 'ACTIVE'),
    (29, '9787115494847', '产品经理实战', 'https://images.example.com/books/product-manager.jpg', 'PHYSICAL_ONLY', NULL, NULL, '产品设计与需求分析实践。', 358, 2022, '中文', 9, 15, 'ACTIVE'),
    (30, '9787302584520', '社会研究方法', 'https://images.example.com/books/social-research.jpg', 'PHYSICAL_ONLY', NULL, NULL, '社会科学研究设计与方法。', 490, 2021, '中文', 4, 16, 'ACTIVE');

INSERT INTO book_authors (book_id, author_id, author_order) VALUES
    (19, 19, 1),
    (20, 20, 1),
    (21, 21, 1),
    (22, 25, 1),
    (23, 23, 1),
    (24, 9, 1),
    (25, 24, 1),
    (26, 26, 1),
    (27, 27, 1),
    (28, 28, 1),
    (29, 15, 1),
    (30, 26, 1);

INSERT INTO book_copies (
    copy_id, book_id, status, acquisition_date, price, notes, location_code, rfid_tag, floor_plan_id
) VALUES
    (45, 19, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 25 DAY), 110.00, NULL, 'N-01-01', 'RFID-NET-0001', 4),
    (46, 19, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 24 DAY), 110.00, NULL, 'N-01-02', 'RFID-NET-0002', 4),
    (47, 19, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 23 DAY), 110.00, NULL, 'N-01-03', 'RFID-NET-0003', 4),
    (48, 20, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 22 DAY), 135.00, NULL, 'A-05-01', 'RFID-DL-0001', 4),
    (49, 20, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 21 DAY), 135.00, NULL, 'A-05-02', 'RFID-DL-0002', 4),
    (50, 20, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 20 DAY), 135.00, NULL, 'A-05-03', 'RFID-DL-0003', 4),
    (51, 21, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 19 DAY), 82.00, NULL, 'SE-01-01', 'RFID-DP-0001', 4),
    (52, 21, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 18 DAY), 82.00, NULL, 'SE-01-02', 'RFID-DP-0002', 4),
    (53, 21, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 17 DAY), 82.00, NULL, 'SE-01-03', 'RFID-DP-0003', 4),
    (54, 22, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 16 DAY), 88.00, NULL, 'M-01-01', 'RFID-MM-0001', 5),
    (55, 22, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY), 88.00, NULL, 'M-01-02', 'RFID-MM-0002', 5),
    (56, 22, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), 88.00, NULL, 'M-01-03', 'RFID-MM-0003', 5),
    (57, 23, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 13 DAY), 68.00, NULL, 'N-02-01', 'RFID-SEC-0001', 4),
    (58, 23, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), 68.00, NULL, 'N-02-02', 'RFID-SEC-0002', 4),
    (59, 23, 'RESERVED', DATE_SUB(CURRENT_DATE, INTERVAL 11 DAY), 68.00, '预约锁定中', 'N-02-03', 'RFID-SEC-0003', 4),
    (60, 24, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 102.00, NULL, 'DS-01-01', 'RFID-DW-0001', 4),
    (61, 24, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 9 DAY), 102.00, NULL, 'DS-01-02', 'RFID-DW-0002', 4),
    (62, 24, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY), 102.00, NULL, 'DS-01-03', 'RFID-DW-0003', 4),
    (63, 25, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY), 52.00, NULL, 'UX-01-01', 'RFID-UX-0001', 1),
    (64, 25, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), 52.00, NULL, 'UX-01-02', 'RFID-UX-0002', 1),
    (65, 25, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), 52.00, NULL, 'UX-01-03', 'RFID-UX-0003', 1),
    (66, 26, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 12 DAY), 61.00, NULL, 'R-01-01', 'RFID-RW-0001', 5),
    (67, 26, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 11 DAY), 61.00, NULL, 'R-01-02', 'RFID-RW-0002', 5),
    (68, 27, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 46.00, NULL, 'OS-01-01', 'RFID-OSG-0001', 4),
    (69, 27, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 9 DAY), 46.00, NULL, 'OS-01-02', 'RFID-OSG-0002', 4),
    (70, 27, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY), 46.00, NULL, 'OS-01-03', 'RFID-OSG-0003', 4),
    (71, 28, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY), 72.00, NULL, 'A-06-01', 'RFID-D2L-0001', 4),
    (72, 28, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), 72.00, NULL, 'A-06-02', 'RFID-D2L-0002', 4),
    (73, 28, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), 72.00, NULL, 'A-06-03', 'RFID-D2L-0003', 4),
    (74, 29, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), 55.00, NULL, 'PM-01-01', 'RFID-PM-0001', 1),
    (75, 29, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), 55.00, NULL, 'PM-01-02', 'RFID-PM-0002', 1),
    (76, 30, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 64.00, NULL, 'SS-01-01', 'RFID-SR-0001', 5),
    (77, 30, 'BORROWED', DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 64.00, NULL, 'SS-01-02', 'RFID-SR-0002', 5),
    (78, 30, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 64.00, NULL, 'SS-01-03', 'RFID-SR-0003', 5),
    (79, 24, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 102.00, NULL, 'DS-01-04', 'RFID-DW-0004', 4),
    (80, 19, 'AVAILABLE', DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 110.00, NULL, 'N-01-04', 'RFID-NET-0004', 4);

INSERT INTO loans (
    loan_id, copy_id, user_id, borrow_date, due_date, return_date, status, renewal_count, create_time, update_time
) VALUES
    (15, 46, 21, DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (16, 49, 32, DATE_SUB(CURRENT_DATE, INTERVAL 16 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), NULL, 'OVERDUE', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (17, 52, 27, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 9 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (18, 56, 23, DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)),
    (19, 58, 30, DATE_SUB(CURRENT_DATE, INTERVAL 13 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 DAY)),
    (20, 62, 32, DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
    (21, 65, 35, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), NULL, 'ACTIVE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (22, 69, 34, DATE_SUB(CURRENT_DATE, INTERVAL 19 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 4 DAY), 'RETURNED', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (23, 72, 26, DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), NULL, 'ACTIVE', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY)),
    (24, 77, 28, DATE_SUB(CURRENT_DATE, INTERVAL 15 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), NULL, 'OVERDUE', 0, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO reservations (
    reservation_id, book_id, user_id, reservation_date, expiry_date, status, allocated_copy_id, pickup_deadline, notification_sent, create_time, update_time
) VALUES
    (12, 23, 21, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'AWAITING_PICKUP', 59, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), b'1', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (13, 24, 31, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (14, 28, 22, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (15, 30, 35, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (16, 20, 16, DATE_SUB(CURRENT_DATE, INTERVAL 9 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 'CANCELLED', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)),
    (17, 21, 29, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (18, 26, 24, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (19, 29, 23, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'PENDING', NULL, NULL, b'0', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));

INSERT INTO fines (
    fine_id, loan_id, user_id, amount, reason, date_issued, date_paid, status, create_time, update_time
) VALUES
    (6, 16, 32, 5.60, '逾期归还 2 天', DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), NULL, 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (7, 24, 28, 3.20, '逾期归还 1 天', DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), NULL, 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

INSERT INTO notifications (
    notification_id, user_id, type, title, content, is_read, target_type, target_id, route_hint, business_key, send_time
) VALUES
    (16, 21, 'ARRIVAL_NOTICE', '预约图书已到馆', '你预约的《网络安全基础》已到馆，请尽快办理取书。', b'0', 'RESERVATION', '12', '/my/reservations', 'RES_PICKUP_12', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 MINUTE)),
    (17, 32, 'DUE_REMINDER', '借阅已逾期', '你借阅的《Deep Learning》已逾期，请尽快处理。', b'0', 'LOAN', '16', '/my/loans', 'LOAN_OVERDUE_16', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (18, 28, 'DUE_REMINDER', '借阅已逾期', '你借阅的《社会研究方法》已逾期，请尽快归还。', b'0', 'LOAN', '24', '/my/loans', 'LOAN_OVERDUE_24', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (19, 22, 'SYSTEM', '算法专区更新', '算法与深度学习新书已补充到四层 A 区。', b'0', 'BOOK_SHELF', 'A-06', '/books', 'NEW_BOOK_A6', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (20, 23, 'SYSTEM', '产品运营书单更新', '产品与运营专题书单已上线首页。', b'0', 'BOOKLIST', 'OPS-LIST', '/books', 'OPS_BOOKLIST', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (21, 24, 'SYSTEM', '论文写作资源上新', '论文写作专区已新增研究设计相关图书。', b'0', 'BOOKLIST', 'RESEARCH-LIST', '/books', 'RESEARCH_BOOKLIST', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (22, 25, 'SYSTEM', '金融荐书更新', '金融方向教师荐书已更新。', b'0', 'RECOMMENDATION', '5', '/my/recommendations', 'FIN_RECOMMEND_REFRESH', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (23, 26, 'SYSTEM', '统计学习资源补充', '统计与深度学习电子资源已同步。', b'1', 'BOOK_SHELF', 'STAT-LIB', '/books', 'STAT_RESOURCE_SYNC', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (24, 27, 'SYSTEM', '设计模式专题上新', '软件工程专题新增设计模式与代码质量图书。', b'0', 'BOOK_SHELF', 'SE-LIB', '/books', 'SE_BOOK_REFRESH', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
    (25, 30, 'SYSTEM', '网络安全新馆藏提醒', '网络与安全专区已新增多本图书。', b'0', 'BOOK_SHELF', 'SEC-LIB', '/books', 'SECURITY_NEW_BOOKS', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 HOUR)),
    (26, 31, 'SYSTEM', '金融投资专题提醒', '金融投资方向图书与荐书内容已更新。', b'0', 'BOOKLIST', 'FIN-LIST', '/books', 'FIN_LIST_SYNC', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (27, 33, 'SYSTEM', '预约服务提醒', '今日有 2 条预约待到馆取书，请关注服务台。', b'0', 'SYSTEM', 'DESK-1', '/notifications', 'DESK_PICKUP_ALERT', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)),
    (28, 34, 'SYSTEM', '网络安全资料更新', '网络安全基础图书可配合馆藏数据库检索使用。', b'1', 'BOOKLIST', 'SEC-BASE', '/books', 'SEC_BASE_SYNC', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
    (29, 35, 'SYSTEM', '研究方法荐书更新', '研究方法与服务设计方向荐书已上线。', b'0', 'RECOMMENDATION', '6', '/my/recommendations', 'RESEARCH_RECOMMEND_SYNC', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR));

INSERT INTO search_history (search_id, user_id, keyword, result_count, search_time) VALUES
    (21, 21, '网络安全基础', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (22, 22, '动手学深度学习', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 HOUR)),
    (23, 23, '产品经理', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
    (24, 24, '论文写作', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 HOUR)),
    (25, 25, 'Marketing Management', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
    (26, 26, '社会研究方法', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 17 HOUR)),
    (27, 27, 'Design Patterns', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)),
    (28, 28, '用户体验', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)),
    (29, 29, '算法导论', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
    (30, 30, 'Computer Networks', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 HOUR)),
    (31, 31, '金融学', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (32, 32, '数据仓库', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 HOUR)),
    (33, 33, '预约服务', 1, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
    (34, 34, '网络安全', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
    (35, 35, '研究设计', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (36, 19, 'Computer Networks', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (37, 20, '产品经理实战', 2, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (38, 21, '网络协议', 5, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (39, 22, '设计模式', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (40, 30, 'Linux', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (41, 32, 'ETL', 4, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (42, 35, '社会研究', 3, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR));

INSERT INTO user_behavior_logs (log_id, user_id, book_id, action_type, duration_seconds, device_type, create_time) VALUES
    (26, 21, 23, 'VIEW_DETAIL', 88, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (27, 21, 23, 'RESERVE_BOOK', 22, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (28, 22, 28, 'CLICK_PREVIEW', 52, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
    (29, 22, 21, 'VIEW_DETAIL', 61, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 HOUR)),
    (30, 23, 29, 'VIEW_DETAIL', 77, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 17 HOUR)),
    (31, 23, 22, 'BORROW_BOOK', 36, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)),
    (32, 24, 26, 'VIEW_DETAIL', 90, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 HOUR)),
    (33, 24, 30, 'ADD_TO_SHELF', 15, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 HOUR)),
    (34, 25, 22, 'VIEW_DETAIL', 64, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 HOUR)),
    (35, 26, 28, 'VIEW_DETAIL', 71, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 HOUR)),
    (36, 27, 21, 'BORROW_BOOK', 41, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (37, 28, 30, 'BORROW_BOOK', 29, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 DAY)),
    (38, 29, 18, 'VIEW_DETAIL', 83, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (39, 30, 19, 'BORROW_BOOK', 34, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 DAY)),
    (40, 31, 13, 'VIEW_DETAIL', 68, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
    (41, 32, 24, 'BORROW_BOOK', 31, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
    (42, 33, 17, 'SHARE', 18, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
    (43, 34, 23, 'VIEW_DETAIL', 97, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (44, 35, 26, 'CLICK_PREVIEW', 48, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (45, 19, 19, 'SHARE', 24, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (46, 20, 29, 'SHARE', 20, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (47, 21, 19, 'VIEW_DETAIL', 52, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR)),
    (48, 22, 18, 'ADD_TO_SHELF', 14, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (49, 23, 25, 'VIEW_DETAIL', 59, 'web', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (50, 24, 26, 'CLICK_PREVIEW', 43, 'mobile', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR));

INSERT INTO book_reviews (
    review_id, book_id, user_id, loan_id, rating, comment_text, status, create_time, update_time
) VALUES
    (10, 19, 21, 15, 5, '网络分层和协议细节讲得非常完整，适合系统学习。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (11, 20, 32, 16, 4, '理论部分很系统，但需要结合实践项目理解。', 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (12, 21, 27, 17, 5, '设计模式讲解生动，适合复习和面试。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 HOUR)),
    (13, 22, 23, 18, 4, '案例较丰富，适合管理类课程配套使用。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (14, 23, 30, 19, 4, '作为入门书够用了，建议再搭配实验资料。', 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (15, 24, 32, 20, 5, '数仓建模部分很有参考价值。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (16, 25, 35, 21, 4, '阅读轻松，适合服务设计入门。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (17, 28, 26, 23, 5, '动手部分很强，适合自学深度学习。', 'APPROVED', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 MINUTE)),
    (18, 30, 28, 24, 4, '研究方法框架比较清晰，适合写论文前阅读。', 'PENDING', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE));

INSERT INTO user_feedbacks (
    feedback_id, user_id, category, subject, content, contact_email, status, admin_reply, handled_by, reply_time, create_time, update_time
) VALUES
    (6, 21, 'SYSTEM_BUG', '通知已读状态偶发不刷新', '移动端消息列表偶发需要重新进入页面才能看到已读状态。', 'reader09@example.com', 'SUBMITTED', NULL, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (7, 23, 'SUGGESTION', '建议增加产品专题检索标签', '产品和运营类图书如果能加专题标签会更方便。', 'reader11@example.com', 'IN_PROGRESS', '已交给前端与检索服务一起评估。', 'admin', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (8, 24, 'SERVICE_EXPERIENCE', '论文写作专区很好用', '论文写作专区的分类比较清楚，找资料效率高。', 'reader12@example.com', 'RESOLVED', '感谢反馈，我们会继续补充研究方法资源。', 'service02', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (9, 30, 'BOOK_INFO', '希望补更多网络安全进阶书', '目前安全基础书比较多，想看更偏攻防和工程实践的书。', 'reader18@example.com', 'SUBMITTED', NULL, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (10, 35, 'SUGGESTION', '服务设计书单很实用', '建议首页支持把服务设计和研究方法联动推荐。', 'graduate04@example.com', 'RESOLVED', '已记录到推荐策略优化需求池。', 'admin', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR));

INSERT INTO user_favorites (favorite_id, user_id, book_id, create_time) VALUES
    (15, 21, 23, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (16, 22, 28, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (17, 23, 29, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (18, 24, 26, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (19, 25, 22, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (20, 26, 28, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (21, 27, 21, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),
    (22, 28, 30, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (23, 29, 18, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 HOUR)),
    (24, 30, 19, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 HOUR)),
    (25, 31, 13, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 HOUR)),
    (26, 32, 24, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 HOUR)),
    (27, 33, 17, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)),
    (28, 34, 23, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 HOUR)),
    (29, 35, 26, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 HOUR)),
    (30, 20, 29, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 HOUR));

INSERT INTO service_appointments (
    appointment_id, user_id, loan_id, service_type, scheduled_time, method, status, notes, create_time, update_time
) VALUES
    (8, 21, 15, 'RETURN_BOOK', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY), 'COUNTER', 'PENDING', '计划处理网络课程相关借阅。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (9, 32, 16, 'CONSULTATION', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY), 'COUNTER', 'PENDING', '咨询深度学习图书逾期与续借。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (10, 24, NULL, 'CONSULTATION', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 3 DAY), 'COUNTER', 'PENDING', '咨询论文写作资源使用建议。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 80 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 80 MINUTE)),
    (11, 33, NULL, 'PICKUP_BOOK', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 12 HOUR), 'COUNTER', 'PENDING', '协助处理当天预约取书。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)),
    (12, 35, 21, 'CONSULTATION', DATE_ADD(UTC_TIMESTAMP(), INTERVAL 4 DAY), 'SMART_LOCKER', 'PENDING', '咨询服务设计与论文选题。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 MINUTE));

INSERT INTO seats (
    seat_id, seat_code, floor_name, floor_order, zone_name, area_name, seat_type, status, has_power, near_window, description
) VALUES
    (13, 'E101', '六层', 6, '网络实验区', '东区', 'COMPUTER', 'AVAILABLE', b'1', b'0', '适合网络与系统实验'),
    (14, 'E102', '六层', 6, '网络实验区', '东区', 'COMPUTER', 'AVAILABLE', b'1', b'1', '双网口实验工位'),
    (15, 'E201', '六层', 6, '论文研修区', '西区', 'STANDARD', 'AVAILABLE', b'1', b'1', '适合论文写作'),
    (16, 'E202', '六层', 6, '论文研修区', '西区', 'STANDARD', 'AVAILABLE', b'1', b'0', '安静写作位'),
    (17, 'F301', '七层', 7, '产品讨论区', '南区', 'DISCUSSION', 'AVAILABLE', b'0', b'0', '适合产品讨论'),
    (18, 'F302', '七层', 7, '产品讨论区', '南区', 'DISCUSSION', 'AVAILABLE', b'0', b'1', '靠窗讨论位'),
    (19, 'F401', '七层', 7, '安静学习区', '北区', 'STANDARD', 'AVAILABLE', b'1', b'1', '高楼层安静区'),
    (20, 'F402', '七层', 7, '安静学习区', '北区', 'STANDARD', 'UNAVAILABLE', b'1', b'0', '维护中');

INSERT INTO seat_reservations (
    reservation_id, seat_id, user_id, start_time, end_time, status, notes, create_time, update_time
) VALUES
    (9, 13, 21, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '14:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '18:00:00'), 'ACTIVE', '准备网络安全实验。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (10, 14, 30, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '09:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '12:00:00'), 'ACTIVE', '网络工程课程实验。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE)),
    (11, 15, 24, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '08:30:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '11:30:00'), 'ACTIVE', '论文提纲整理。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE)),
    (12, 16, 35, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '13:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '17:00:00'), 'ACTIVE', '研究方法写作准备。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)),
    (13, 17, 23, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), '15:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), '17:00:00'), 'ACTIVE', '产品需求评审讨论。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 50 MINUTE)),
    (14, 18, 20, TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), '10:00:00'), TIMESTAMP(DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), '12:00:00'), 'COMPLETED', '与学生讨论服务改进方案。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (15, 19, 29, TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), '09:00:00'), TIMESTAMP(DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), '12:00:00'), 'ACTIVE', '准备概率与算法复习。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE));

INSERT INTO rbac_audit_logs (log_id, actor_user_id, actor_username, action_type, target_type, target_id, detail, create_time) VALUES
    (7, 1, 'admin', 'USER_ROLE_ASSIGN', 'USER', '33', '为 service02 分配 LIBRARIAN 动态角色。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),
    (8, 1, 'admin', 'CATALOG_SYNC', 'BOOK', '19-30', '完成第三批运营馆藏数据导入。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR)),
    (9, 1, 'admin', 'SEAT_LAYOUT_SYNC', 'SEAT', '13-20', '补充六层与七层座位资源。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)),
    (10, 1, 'admin', 'RECOMMENDATION_OPEN', 'USER', '19,20', '为新教师账户开放荐书运营场景。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 MINUTE));

INSERT INTO recommendation_posts (
    post_id, author_user_id, book_id, content, create_time, update_time
) VALUES
    (7, 19, 19, '计算机网络这本书很适合作为网络工程、信息安全和系统方向的基础读物，建议结合实验一起学。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 85 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 85 MINUTE)),
    (8, 19, 23, '如果你正在准备安全课程或实验，这本《网络安全基础》适合作为第一本入门书。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 70 MINUTE)),
    (9, 20, 25, '做服务设计或产品体验分析的同学，可以从这本《用户体验要素》建立基本框架。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)),
    (10, 20, 29, '《产品经理实战》比较适合做校园服务产品或课程项目时参考。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 45 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 45 MINUTE)),
    (11, 8, 28, '动手学深度学习适合配合实验环境一起练，读完后会比只看理论更有感觉。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE)),
    (12, 14, 30, '社会研究方法这本书适合做经管、公共管理和服务研究方向论文的同学。', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 MINUTE), DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 MINUTE));

INSERT INTO recommendation_likes (like_id, post_id, user_id, create_time) VALUES
    (11, 7, 21, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 80 MINUTE)),
    (12, 7, 30, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 78 MINUTE)),
    (13, 8, 34, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 65 MINUTE)),
    (14, 9, 23, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 58 MINUTE)),
    (15, 9, 35, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 55 MINUTE)),
    (16, 10, 20, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 MINUTE)),
    (17, 10, 23, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 38 MINUTE)),
    (18, 11, 22, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 MINUTE)),
    (19, 11, 26, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 MINUTE)),
    (20, 12, 24, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE));

INSERT INTO recommendation_follows (follow_id, follower_user_id, teacher_user_id, create_time) VALUES
    (9, 21, 19, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
    (10, 22, 19, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (11, 23, 20, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
    (12, 24, 20, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (13, 30, 19, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
    (14, 35, 20, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),
    (15, 31, 14, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));
