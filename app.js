const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    fetchRooms();
    fetchBookings();

    document.getElementById('checkIn').addEventListener('change', calculateTotal);
    document.getElementById('checkOut').addEventListener('change', calculateTotal);

    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    document.getElementById('addRoomForm').addEventListener('submit', handleAddRoomSubmit);
});

function switchView(view) {
    if (view === 'guest') {
        document.getElementById('guestView').classList.remove('hidden');
        document.getElementById('adminView').classList.add('hidden');
        document.getElementById('tabGuest').classList.add('active');
        document.getElementById('tabAdmin').classList.remove('active');
        fetchRooms();
    } else {
        document.getElementById('guestView').classList.add('hidden');
        document.getElementById('adminView').classList.remove('hidden');
        document.getElementById('tabGuest').classList.remove('active');
        document.getElementById('tabAdmin').classList.add('active');
        fetchBookings();
    }
}

async function fetchRooms() {
    try {
        const res = await fetch(`${API_URL}/rooms`);
        const rooms = await res.json();
        const grid = document.getElementById('roomsGrid');
        grid.innerHTML = '';

        rooms.forEach(room => {
            const isAvailable = room.status === 'available';
            const card = document.createElement('div');
            card.className = 'room-card';
            card.innerHTML = `
                <img src="${room.image}" alt="${room.title}">
                <div class="room-details">
                    <h3>${room.title}</h3>
                    <p class="room-meta">${room.type} • Up to ${room.capacity} Guests</p>
                    <div class="room-footer">
                        <span class="price">$${room.price}<small style="font-size:0.75rem; color:#64748b">/night</small></span>
                        <button class="primary-btn" ${!isAvailable ? 'disabled' : ''} onclick="openBookingModal(${room.id}, '${room.title}', ${room.price})">
                            ${isAvailable ? 'Book Now' : 'Occupied'}
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Error fetching rooms:', err);
    }
}

function openBookingModal(id, title, price) {
    document.getElementById('bookRoomId').value = id;
    document.getElementById('bookRoomPrice').value = price;
    document.getElementById('modalRoomTitle').innerText = `${title} - $${price}/night`;
    document.getElementById('bookingModal').classList.remove('hidden');
}

function openAddRoomModal() {
    document.getElementById('addRoomModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function calculateTotal() {
    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);
    const price = parseFloat(document.getElementById('bookRoomPrice').value) || 0;

    if (checkIn && checkOut && checkOut > checkIn) {
        const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        document.getElementById('estimatedPrice').innerText = `$${days * price}`;
    } else {
        document.getElementById('estimatedPrice').innerText = `$${price}`;
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const roomId = document.getElementById('bookRoomId').value;
    const guestName = document.getElementById('guestName').value;
    const guestEmail = document.getElementById('guestEmail').value;
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const totalPrice = parseFloat(document.getElementById('estimatedPrice').innerText.replace('$', '')) || 100;

    const res = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, guestName, guestEmail, checkIn, checkOut, totalPrice })
    });

    if (res.ok) {
        alert('Booking successfully created!');
        closeModal('bookingModal');
        document.getElementById('bookingForm').reset();
        fetchRooms();
    } else {
        alert('Error completing reservation.');
    }
}

async function fetchBookings() {
    try {
        const res = await fetch(`${API_URL}/bookings`);
        const bookings = await res.json();
        const tbody = document.getElementById('bookingsBody');
        tbody.innerHTML = '';

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No active reservations.</td></tr>`;
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${b.id}</td>
                <td><strong>${b.guestName}</strong><br><small style="color:#64748b">${b.guestEmail}</small></td>
                <td>${b.roomTitle}</td>
                <td>${b.checkIn} to ${b.checkOut}</td>
                <td><strong>$${b.totalPrice}</strong></td>
                <td><span style="color:#16a34a; font-weight:600;">${b.status.toUpperCase()}</span></td>
                <td><button class="cancel-btn" onclick="cancelBooking(${b.id})">Cancel</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
    }
}

async function cancelBooking(id) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        await fetch(`${API_URL}/bookings/${id}`, { method: 'DELETE' });
        fetchBookings();
    }
}

async function handleAddRoomSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('newRoomTitle').value;
    const type = document.getElementById('newRoomType').value;
    const price = document.getElementById('newRoomPrice').value;
    const capacity = document.getElementById('newRoomCapacity').value;
    const image = document.getElementById('newRoomImage').value;

    await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, price, capacity, image })
    });

    closeModal('addRoomModal');
    document.getElementById('addRoomForm').reset();
    fetchRooms();
    switchView('guest');
}
