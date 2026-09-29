-- Create roles and database
CREATE USER tour_app_user WITH PASSWORD 'tour_app_pwd';

-- Create tables
CREATE TABLE tours (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE itineraries (
    id SERIAL PRIMARY KEY,
    tour_id INT REFERENCES tours(id),
    day_number INT NOT NULL,
    activity TEXT NOT NULL
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    tour_id INT REFERENCES tours(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    guests_count INT NOT NULL DEFAULT 1,
    booking_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Insert sample data
INSERT INTO tours (name, description, price) VALUES
('Ha Long Bay 2 Days', 'Beautiful bay cruise', 150.00),
('Sapa Trekking 3 Days', 'Trekking in the mountains', 200.00);

INSERT INTO itineraries (tour_id, day_number, activity) VALUES
(1, 1, 'Arrival and Check-in cruise'),
(1, 2, 'Kayaking and Departure'),
(2, 1, 'Arrival in Sapa and short trek'),
(2, 2, 'Long trek to villages'),
(2, 3, 'Visit market and Departure');

INSERT INTO bookings (tour_id, customer_name, customer_email, phone_number, guests_count) VALUES
(1, 'John Doe', 'john@example.com', '0912345678', 2);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tour_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tour_app_user;
