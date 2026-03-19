# Graduation Project Scope

## 1. Recommended Positioning

Recommended project title:

`Design and Implementation of a Smart Library Management System Based on Spring Boot and Next.js`

Recommended positioning:

- Use `backend-library/` + `front_library/` as the main body of the graduation project.
- Treat `front-android/` and `miniapp/` as reader-side multi-terminal extensions.
- Do not set the target as "all three clients fully aligned in features".

This positioning is the most stable because the current repository already has a complete Web reader side, Web admin side, and backend service architecture. Android and miniapp are suitable for extension and demonstration, but they should not become the main delivery burden.

## 2. Final Recommended Scope

### 2.1 Core Scope That Must Be Completed

These modules should be treated as the main line of the graduation project and should be fully available in the final demo.

#### User and Authentication

- User registration
- User login and logout
- Forgot password and reset password
- Personal profile query and update
- Basic role distinction between reader and admin

#### Reader-Side Web Core Business

- Home page
- Catalog search and filtering
- Book detail page
- Borrow book
- Renew book
- Return book
- Reserve book
- Favorite book
- Submit review
- My shelf
- My loans
- My reservations
- My fines
- My notifications
- Help and feedback
- Personal center overview

#### Admin-Side Web Core Business

- Dashboard statistics
- Book management
- Book copy management
- Loan management
- Reservation management
- Fine management
- User management

#### Backend and Data Layer

- Unified REST API
- Database table design and relation design
- Business rules for borrow, return, reservation, fine, and notification
- Permission control for reader/admin access

### 2.2 Enhancement Scope That Can Be Kept as Plus Points

These modules already have value in the repository. Keep them if time allows, but they do not need to become the core acceptance boundary.

- Review moderation
- Author management
- Category management
- Publisher management
- RBAC role and permission management
- Recommendation feed
- Service appointments
- Seat reservations
- Notification deep-link routing

### 2.3 Scope That Can Be Weakened or Cut

These items should not block graduation delivery.

- Full feature parity between Android and Web
- Full feature parity between miniapp and Web
- Real email delivery for password reset
- Very heavy analytics reports
- All long-tail UX polish and non-essential auxiliary pages

## 3. Recommended Terminal Strategy

### 3.1 Web

Web should be the primary delivery target.

Recommended requirement:

- Keep reader-side Web complete
- Keep admin-side Web complete
- Ensure backend contracts match Web behavior
- Use Web as the primary screenshot and demo source for the thesis and defense

Reason:

- The Web side is currently the most complete implementation in the repository.
- It already supports both reader workflows and admin workflows.
- It is easier to explain architecture, permissions, business processes, and database design around Web.

### 3.2 Android

Android should be positioned as a reader-side mobile extension.

Recommended features to keep:

- Login
- Home
- Catalog
- Book detail
- Borrow and reserve from detail page
- Loan tracking
- Notifications
- Personal center

Recommended features that can be kept only if time allows:

- Fines
- Feedback
- Recommendations
- Service appointments
- Seat reservations

Recommended strategy:

- Do not pursue complete parity with Web.
- Keep one clean, stable, end-to-end mobile demo path.

### 3.3 Miniapp

Miniapp should be positioned as a lightweight reader-side access channel.

Recommended features to keep:

- Login
- Home
- Catalog
- Book detail
- Reservation
- Notifications
- My center

Optional features:

- Fines
- Feedback
- Recommendations
- Appointments

Recommended strategy:

- Keep miniapp lighter than Android.
- Use it to prove multi-terminal access, not to replicate the entire Web system.

## 4. Suggested Final Functional Boundary

If you need a concise statement for your proposal, mid-term review, or thesis summary, use this:

> This project delivers a Web-based smart library management system with complete reader and administrator workflows, and additionally provides Android and WeChat miniapp reader-side access as extension clients.

This statement is important because it clearly defines:

- Main system: Web + backend
- Extension system: Android + miniapp
- Core value: complete business workflow instead of multiple unfinished clients

## 5. Thesis Writing Suggestion

### 5.1 Suitable Thesis Structure

1. Introduction
2. Requirement Analysis
3. Overall System Design
4. Database Design
5. Backend Design and Implementation
6. Web Frontend Design and Implementation
7. Multi-terminal Extension Design and Implementation
8. System Testing
9. Conclusion and Future Work

### 5.2 What Each Chapter Should Emphasize

#### Chapter 2: Requirement Analysis

Focus on:

- Reader use cases
- Admin use cases
- Functional requirements
- Non-functional requirements

Recommended key business lines:

- Catalog management
- Borrow and return management
- Reservation queue
- Fine processing
- Notification and feedback
- Permission and role control

#### Chapter 3: Overall System Design

Focus on:

- Frontend-backend separation
- Web main system architecture
- Android and miniapp as extension clients
- Unified API layer
- Role-based access model

#### Chapter 4: Database Design

Focus on:

- User
- Role and permission
- Book
- Book copy
- Loan
- Reservation
- Fine
- Notification
- Review
- Feedback

Recommended outputs:

- E-R diagram
- Core table structure explanation
- Key field meanings

#### Chapter 5: Backend Design and Implementation

Focus on:

- Authentication and authorization
- Book and copy services
- Loan and reservation rules
- Fine generation and payment flow
- Notification generation
- Admin service interfaces

#### Chapter 6: Web Frontend Design and Implementation

Focus on:

- Reader-side pages
- Admin-side pages
- API integration
- State display such as loading, empty, and error cases
- Permission-based page and operation control

#### Chapter 7: Multi-terminal Extension Design and Implementation

This chapter should be controlled carefully.

Recommended writing approach:

- Explain that Android and miniapp reuse the backend API contracts
- Show selected reader-side functions
- Emphasize extension verification, not complete duplication

This prevents the thesis from becoming scattered.

#### Chapter 8: System Testing

Focus on:

- Authentication and role testing
- Borrow / renew / return testing
- Reservation and cancel testing
- Fine payment testing
- Notification linkage testing
- Admin CRUD and status change testing

## 6. Suggested Defense Demo Order

Use the following order in the final demo:

1. Project overview and architecture
2. Reader-side Web core workflow
3. Admin-side Web management workflow
4. Android or miniapp extension demo
5. Database and testing summary

### 6.1 Reader-Side Demo Path

Recommended order:

1. Login
2. Search books
3. Open book detail
4. Borrow or reserve a book
5. Check personal center
6. View notifications / fines / reservations

This path is easy to understand and directly shows the business closed loop.

### 6.2 Admin-Side Demo Path

Recommended order:

1. Open dashboard
2. Manage books and copies
3. Process loans
4. Process reservations
5. Process fines
6. Check user management or feedback

### 6.3 Mobile Demo Path

Recommended order:

1. Login
2. Browse catalog
3. Open book detail
4. Perform one reader action such as reserve or borrow
5. Open personal center or notifications

Keep the mobile demo short. It is a plus point, not the main battlefield.

## 7. Practical Development Priority

Recommended execution order from now on:

1. Stabilize the Web reader-side and admin-side main workflows
2. Ensure backend contracts fully support the Web side
3. Run focused testing on borrow, reservation, fine, notification, and admin flows
4. Keep Android as a minimal but complete demo chain
5. Keep miniapp as a lighter minimal demo chain
6. Finish thesis assets such as diagrams, screenshots, and test records

## 8. Final Recommendation

The safest and most defensible graduation-project strategy for this repository is:

- Main result: `backend-library/` + `front_library/`
- Extension result: `front-android/` + `miniapp/`
- Main evaluation point: whether the Web-based smart library system works end-to-end
- Extra evaluation point: whether mobile terminals can reuse backend capability for reader-side access

In short:

- Make the Web system complete
- Keep Android useful
- Keep miniapp lightweight
- Do not divide your schedule equally across three clients
