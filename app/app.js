const express = require('express');
const { Pool } = require('pg');
const promClient = require('prom-client');
const app = express();
const port = 3000;

// Prometheus metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register });

// Log request middleware in JSON format
app.use((req, res, next) => {
    const logEntry = {
        time: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip
    };
    console.log(JSON.stringify(logEntry));
    next();
});

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
    user: process.env.APP_DB_USER,
    host: process.env.DB_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.APP_DB_PASSWORD,
    port: 5432,
});

app.get('/', async (req, res) => {
    try {
        const toursResult = await pool.query('SELECT * FROM tours ORDER BY id');
        const itinerariesResult = await pool.query('SELECT * FROM itineraries ORDER BY day_number');
        
        const tours = toursResult.rows.map(tour => {
            return {
                ...tour,
                itineraries: itinerariesResult.rows.filter(it => it.tour_id === tour.id)
            };
        });

        const bookingsResult = await pool.query(`
            SELECT b.*, t.name as tour_name 
            FROM bookings b 
            JOIN tours t ON b.tour_id = t.id 
            ORDER BY b.booking_date DESC, b.id DESC
        `);

        res.render('index', { tours, bookings: bookingsResult.rows });
    } catch (err) {
        console.error(JSON.stringify({ error: err.message }));
        res.status(500).send('Server Error');
    }
});

app.post('/book', async (req, res) => {
    try {
        const { customer_name, customer_email, phone_number, tour_id, guests_count } = req.body;
        await pool.query(
            'INSERT INTO bookings (tour_id, customer_name, customer_email, phone_number, guests_count) VALUES ($1, $2, $3, $4, $5)',
            [tour_id, customer_name, customer_email, phone_number, guests_count]
        );
        console.log(JSON.stringify({ event: 'new_booking', customer_name, tour_id, guests_count }));
        res.redirect('/');
    } catch (err) {
        console.error(JSON.stringify({ error: err.message }));
        res.status(500).send('Lỗi khi đặt tour');
    }
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
});

app.listen(port, () => {
    console.log(JSON.stringify({ message: `Server running on port ${port}` }));
});
