// I want to store them in a .env file
const API_BASE_URL = 'http://localhost:8000';
const GRAFANA_URL = 'http://94.130.230.161:30300/d/wearables-health/wearables-health-dashboard?orgId=1&from=now-7d&to=now&timezone=browser&var-DS_INFLUXDB=cf5irkhmbkfswb';

function showSection(sectionId) {
    document.getElementById('mainMenu').style.display = 'none';
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

function showMenu() {
    document.getElementById('mainMenu').style.display = 'grid';
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.response').forEach(resp => {
        resp.style.display = 'none';
    });
    document.getElementById('qrContainer').style.display = 'none';
}

function openDashboard() {
    window.open(GRAFANA_URL, '_blank');
}

function toggleDurationInput() {
    const durationType = document.querySelector('input[name="duration_type"]:checked').value;
    const durationInput = document.getElementById('durationInput');
    const endTimeInput = document.getElementById('endTimeInput');

    if (durationType === 'duration') {
        durationInput.classList.add('active');
        endTimeInput.classList.remove('active');
    } else {
        durationInput.classList.remove('active');
        endTimeInput.classList.add('active');
    }
}

function calculateDuration() {
    const durationType = document.querySelector('input[name="duration_type"]:checked').value;

    if (durationType === 'duration') {
        const days = parseInt(document.getElementById('duration_days').value) || 0;
        const hours = parseInt(document.getElementById('duration_hours').value) || 0;
        const minutes = parseInt(document.getElementById('duration_minutes').value) || 0;
        const seconds = parseInt(document.getElementById('duration_seconds').value) || 0;

        return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
    } else {
        const startDate = document.getElementById('event_start_date').value;
        const startTime = document.getElementById('event_start_time').value;
        const endDate = document.getElementById('event_end_date').value;
        const endTime = document.getElementById('event_end_time').value;

        if (!endDate || !endTime) {
            throw new Error('Please specify both end date and end time');
        }

        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        const durationMs = endDateTime - startDateTime;

        if (durationMs <= 0) {
            throw new Error('End time must be after start time');
        }

        return Math.floor(durationMs / 1000);
    }
}

function formatToISO(date, time) {
    return `${date}T${time}:00`;
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event_start_date').value = today;
    document.getElementById('appointment_date').value = today;
}

document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const responseDiv = document.getElementById('registerResponse');

    try {
        const appointmentDate = document.getElementById('appointment_date').value;
        const appointmentTime = document.getElementById('appointment_time').value;
        const appointmentDateTime = formatToISO(appointmentDate, appointmentTime);

        const eventDate = document.getElementById('event_start_date').value;
        const eventTime = document.getElementById('event_start_time').value;
        const eventStartDateTime = formatToISO(eventDate, eventTime);

        const eventDuration = calculateDuration();

        if (eventDuration === 0) {
            throw new Error('Event duration must be greater than 0');
        }

        const formData = {
            patient_id: document.getElementById('patient_id').value,
            watch_id: document.getElementById('watch_id').value,
            phone_id: document.getElementById('phone_id').value,
            context_id: document.getElementById('context_id').value,
            patient_mail: document.getElementById('patient_mail').value,
            appointment_date: appointmentDateTime,
            event_duration: eventDuration.toString(),
            event_start_date: eventStartDateTime
        };

        console.log('Sending:', JSON.stringify(formData, null, 2));

        const response = await fetch(`${API_BASE_URL}/register/patient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const data = await response.json();
            const durationHours = Math.floor(eventDuration / 3600);
            const durationMinutes = Math.floor((eventDuration % 3600) / 60);
            responseDiv.className = 'response success';
            responseDiv.textContent = `✓ Registration submitted successfully! Appointment: ${appointmentDateTime}, Event Start: ${eventStartDateTime}, Duration: ${durationHours}h ${durationMinutes}m`;
            this.reset();
            setDefaultDate();
        } else {
            const errorData = await response.json();
            console.error('Backend error:', errorData);
            throw new Error(errorData.detail || 'Registration failed');
        }
    } catch (error) {
        responseDiv.className = 'response error';
        responseDiv.textContent = `✗ Error: ${error.message}`;
    }
});

document.getElementById('onboardForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const registrationToken = document.getElementById('registration_token').value.trim();
    const responseDiv = document.getElementById('onboardResponse');
    const qrContainer = document.getElementById('qrContainer');

    try {
        const response = await fetch(`${API_BASE_URL}/onboard/${registrationToken}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            const eventId = data.reg_id;

            responseDiv.className = 'response success';
            responseDiv.textContent = `✓ ${data.message}`;

            qrContainer.style.display = 'block';
            document.getElementById('eventIdDisplay').textContent = eventId;

            document.getElementById('qrcode').innerHTML = '';

            new QRCode(document.getElementById('qrcode'), {
                text: eventId,
                width: 256,
                height: 256,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });

            this.reset();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Onboarding failed');
        }
    } catch (error) {
        responseDiv.className = 'response error';
        responseDiv.textContent = `✗ Error: ${error.message}`;
        qrContainer.style.display = 'none';
    }
});

setDefaultDate();