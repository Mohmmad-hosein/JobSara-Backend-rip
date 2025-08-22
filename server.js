const express = require('express');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - به صورت مستقیم تعریف می‌کنیم
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'API is working!' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'API health check passed' });
});

app.get('/api/profile/:id', (req, res) => {
    const userId = req.params.id;
    res.json({ 
        success: true, 
        message: 'Profile endpoint is working',
        userId: userId,
        user: {
            id: userId,
            username: 'testuser',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            userType: 'job_seeker'
        }
    });
});

app.post('/api/register', (req, res) => {
    res.json({ 
        success: true, 
        message: 'User registered successfully (demo)',
        userId: 1
    });
});

app.post('/api/login', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Login successful (demo)',
        token: 'demo-jwt-token-12345'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Route اصلی
app.get('/', (req, res) => {
    res.json({ 
        message: 'JobSara Backend Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            apiTest: '/api/test',
            apiProfile: '/api/profile/:id',
            apiRegister: '/api/register',
            apiLogin: '/api/login'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 API Test: http://localhost:${PORT}/api/test`);
    console.log(`📍 Profile: http://localhost:${PORT}/api/profile/1`);
});

module.exports = app;