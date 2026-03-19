-- Create the database
CREATE DATABASE IF NOT EXISTS library_management;
USE library_management;

-- Create users table
CREATE TABLE users (
                       user_id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       email VARCHAR(100) UNIQUE NOT NULL,
                       full_name VARCHAR(100) NOT NULL,
                       role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
                       status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
                       create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create publishers table
CREATE TABLE publishers (
                            publisher_id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(100) NOT NULL UNIQUE,
                            address VARCHAR(255),
                            contact_info VARCHAR(100),
                            create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create categories table with self-referencing foreign key
CREATE TABLE categories (
                            category_id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(50) NOT NULL UNIQUE,
                            parent_id INT NULL,
                            description VARCHAR(255),
                            create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create books table
CREATE TABLE books (
                       book_id INT AUTO_INCREMENT PRIMARY KEY,
                       isbn VARCHAR(20) UNIQUE NOT NULL,
                       title VARCHAR(255) NOT NULL,
                       cover_url VARCHAR(255),
                       description TEXT,
                       page_count INT,
                       published_year INT NOT NULL,
                       language VARCHAR(50) NOT NULL,
                       publisher_id INT,
                       category_id INT,
                       create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT fk_book_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(publisher_id) ON DELETE SET NULL,
                       CONSTRAINT fk_book_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create book_copies table
CREATE TABLE book_copies (
                             copy_id INT AUTO_INCREMENT PRIMARY KEY,
                             book_id INT NOT NULL,
                             status ENUM('available', 'borrowed', 'reserved', 'lost', 'damaged') NOT NULL DEFAULT 'available',
                             acquisition_date DATE NOT NULL,
                             price DECIMAL(10,2) NOT NULL,
                             notes TEXT,
                             create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                             CONSTRAINT fk_copy_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create authors table
CREATE TABLE authors (
                         author_id INT AUTO_INCREMENT PRIMARY KEY,
                         name VARCHAR(100) NOT NULL,
                         biography TEXT,
                         birth_year INT,
                         death_year INT,
                         create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create book_authors junction table
CREATE TABLE book_authors (
                              book_id INT NOT NULL,
                              author_id INT NOT NULL,
                              author_order INT NOT NULL,
                              create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              PRIMARY KEY (book_id, author_id),
                              CONSTRAINT fk_bookauthor_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
                              CONSTRAINT fk_bookauthor_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create loans table
CREATE TABLE loans (
                       loan_id INT AUTO_INCREMENT PRIMARY KEY,
                       copy_id INT NOT NULL,
                       user_id INT NOT NULL,
                       borrow_date DATE NOT NULL,
                       due_date DATE NOT NULL,
                       return_date DATE,
                       status ENUM('active', 'returned', 'overdue', 'lost') NOT NULL DEFAULT 'active',
                       create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT fk_loan_copy FOREIGN KEY (copy_id) REFERENCES book_copies(copy_id) ON DELETE RESTRICT,
                       CONSTRAINT fk_loan_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create reservations table
CREATE TABLE reservations (
                              reservation_id INT AUTO_INCREMENT PRIMARY KEY,
                              book_id INT NOT NULL,
                              user_id INT NOT NULL,
                              reservation_date DATE NOT NULL,
                              expiry_date DATE NOT NULL,
                              status ENUM('pending', 'fulfilled', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
                              create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                              CONSTRAINT fk_reservation_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
                              CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create fines table
CREATE TABLE fines (
                       fine_id INT AUTO_INCREMENT PRIMARY KEY,
                       loan_id INT NOT NULL,
                       user_id INT NOT NULL,
                       amount DECIMAL(10,2) NOT NULL,
                       reason VARCHAR(255) NOT NULL,
                       date_issued DATE NOT NULL,
                       date_paid DATE,
                       status ENUM('pending', 'paid', 'waived') NOT NULL DEFAULT 'pending',
                       create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       update_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       CONSTRAINT fk_fine_loan FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE RESTRICT,
                       CONSTRAINT fk_fine_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC: permissions
CREATE TABLE IF NOT EXISTS permissions (
                                           permission_id INT AUTO_INCREMENT PRIMARY KEY,
                                           name VARCHAR(100) NOT NULL UNIQUE,
                                           description VARCHAR(255),
                                           create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC: roles
CREATE TABLE IF NOT EXISTS roles (
                                     role_id INT AUTO_INCREMENT PRIMARY KEY,
                                     name VARCHAR(50) NOT NULL UNIQUE,
                                     display_name VARCHAR(100),
                                     description VARCHAR(255),
                                     create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC: user-role mapping
CREATE TABLE IF NOT EXISTS user_roles (
                                          user_id INT NOT NULL,
                                          role_id INT NOT NULL,
                                          PRIMARY KEY (user_id, role_id),
                                          CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                                          CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC: role-permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
                                                role_id INT NOT NULL,
                                                permission_id INT NOT NULL,
                                                PRIMARY KEY (role_id, permission_id),
                                                CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
                                                CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- RBAC: operation audit logs
CREATE TABLE IF NOT EXISTS rbac_audit_logs (
                                                log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                                                actor_user_id INT,
                                                actor_username VARCHAR(100) NOT NULL,
                                                action_type VARCHAR(50) NOT NULL,
                                                target_type VARCHAR(50) NOT NULL,
                                                target_id VARCHAR(100),
                                                detail TEXT,
                                                create_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create indexes for performance optimization
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_book_copies_status ON book_copies(status);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_due_date ON loans(due_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_fines_status ON fines(status);
CREATE INDEX idx_book_authors_author_id ON book_authors(author_id);
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_rbac_audit_time ON rbac_audit_logs(create_time);
