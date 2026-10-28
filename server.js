const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(':memory:', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite in-memory database for HotelPro.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'guest')`);
        db.run(`CREATE TABLE rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, type TEXT, price REAL, capacity INTEGER, status TEXT DEFAULT 'available', image TEXT)`);
        db.run(`CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, roomId INTEGER, guestName TEXT, guestEmail TEXT, checkIn TEXT, checkOut TEXT, totalPrice REAL, status TEXT DEFAULT 'confirmed', FOREIGN KEY (roomId) REFERENCES rooms(id))`);

        const sampleRooms = [
            ['Deluxe Ocean View', 'Deluxe', 180, 2, 'available', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80'],
            ['Executive Business Suite', 'Suite', 250, 3, 'available', 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=600&q=80'],
            ['Standard Comfort Room', 'Standard', 95, 2, 'available', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80'],
            ['Family Penthouse', 'Suite', 320, 5, 'available', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80']
        ];

        const stmt = db.prepare('INSERT INTO rooms (title, type, price, capacity, status, image) VALUES (?, ?, ?, ?, ?, ?)');
        sampleRooms.forEach(room => stmt.run(room));
        stmt.finalize();

        db.run(`INSERT INTO users (name, email, password, role) VALUES ('Hotel Admin', 'admin@hotelpro.com', 'admin123', 'admin')`);
    });
}

app.get('/api/rooms', (req, res) => {
    db.all('SELECT * FROM rooms', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/rooms', (req, res) => {
    const { title, type, price, capacity, image } = req.body;
    db.run(`INSERT INTO rooms (title, type, price, capacity, status, image) VALUES (?, ?, ?, ?, 'available', ?)`,
        [title, type, price, capacity, image || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Room created successfully' });
        }
    );
});

app.post('/api/bookings', (req, res) => {
    const { roomId, guestName, guestEmail, checkIn, checkOut, totalPrice } = req.body;
    db.run(`INSERT INTO bookings (roomId, guestName, guestEmail, checkIn, checkOut, totalPrice) VALUES (?, ?, ?, ?, ?, ?)`,
        [roomId, guestName, guestEmail, checkIn, checkOut, totalPrice],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run(`UPDATE rooms SET status = 'occupied' WHERE id = ?`, [roomId]);
            res.json({ id: this.lastID, message: 'Booking confirmed successfully!' });
        }
    );
});

app.get('/api/bookings', (req, res) => {
    const query = `
        SELECT bookings.id, bookings.guestName, bookings.guestEmail, bookings.checkIn, 
               bookings.checkOut, bookings.totalPrice, bookings.status, rooms.title as roomTitle
        FROM bookings JOIN rooms ON bookings.roomId = rooms.id ORDER BY bookings.id DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/bookings/:id', (req, res) => {
    const bookingId = req.params.id;
    db.get('SELECT roomId FROM bookings WHERE id = ?', [bookingId], (err, row) => {
        if (row) {
            db.run(`UPDATE rooms SET status = 'available' WHERE id = ?`, [row.roomId]);
            db.run('DELETE FROM bookings WHERE id = ?', [bookingId], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ message: 'Booking cancelled and room released.' });
            });
        } else {
            res.status(404).json({ error: 'Booking not found.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`HotelPro Server running at http://localhost:${PORT}`);
});
