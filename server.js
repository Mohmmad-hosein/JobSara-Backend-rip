const express = require('express');
const dotenv = require('dotenv');
const User = require('./models/user');
const jwt = require('jsonwebtoken'); // اضافه کردن ماژول jwt

// Load env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware برای احراز هویت (نسخه ساده‌تر بدون دیتابیس)
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        // فقط توکن JWT را verify کنید (بدون چک کردن دیتابیس)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // گرفتن اطلاعات کاربر از دیتابیس
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(403).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

// Middleware برای بررسی نقش ادمین
const requireAdmin = (req, res, next) => {
    if (req.user.user_type !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
};

// Routes

// API برای ثبت نام کاربر جدید
app.post('/api/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        
        const {
            username,
            email,
            password,
            firstName,
            lastName,
            phone,
            userType,
            companyName,
            skills,
            experienceLevel
        } = req.body;

        // بررسی فیلدهای اجباری
        if (!username || !email || !password || !firstName || !lastName || !userType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // بررسی نقش معتبر
        const validRoles = ['job_seeker', 'intern', 'employer', 'admin', 'teacher'];
        if (!validRoles.includes(userType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid user type. Valid types are: ${validRoles.join(', ')}`
            });
        }

        // بررسی اینکه کاربر با این ایمیل قبلاً ثبت نام نکرده باشد
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // بررسی اینکه نام کاربری تکراری نباشد
        const existingUsername = await User.findByUsername(username);
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username already taken'
            });
        }

        // ایجاد کاربر جدید
        const userId = await User.create({
            username,
            email,
            password,
            firstName,
            lastName,
            phone,
            userType,
            companyName: companyName || '',
            skills: skills || '',
            experienceLevel: experienceLevel || 'Beginner'
        });

        console.log('User created with ID:', userId);

        // گرفتن اطلاعات کاربر ایجاد شده
        const newUser = await User.findById(userId);

        // تولید توکن JWT (بدون ذخیره در دیتابیس)
        const token = jwt.sign(
            { 
                userId: newUser.id, 
                email: newUser.email,
                userType: newUser.user_type 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: userId,
            token: token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                userType: newUser.user_type
            }
        });
    } catch (error) {
        console.error('Registration error details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration: ' + error.message
        });
    }
});

// API برای ورود کاربر
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // پیدا کردن کاربر بر اساس ایمیل
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // بررسی صحت رمز عبور
        const isPasswordValid = await User.comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // تولید توکن JWT (بدون ذخیره در دیتابیس)
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email,
                userType: user.user_type 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                userType: user.user_type
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
});

// API برای خروج کاربر
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        // در این نسخه ساده، فقط پاسخ موفقیت‌آمیز می‌دهیم
        // چون توکن در دیتابیس ذخیره نمی‌شود
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during logout'
        });
    }
});

// API برای گرفتن پروفایل کاربر
app.get('/api/profile/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // کاربر فقط می‌تواند پروفایل خودش را ببیند، مگر اینکه ادمین باشد
        if (req.user.id !== parseInt(userId) && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // حذف فیلدهای حساس
        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Profile retrieved successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API برای ویرایش پروفایل کاربر
app.put('/api/profile/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const updateData = req.body;
        
        // کاربر فقط می‌تواند پروفایل خودش را ویرایش کند، مگر اینکه ادمین باشد
        if (req.user.id !== parseInt(userId) && req.user.user_type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // بررسی وجود کاربر
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // آپدیت اطلاعات کاربر
        const changes = await User.update(userId, updateData);
        
        if (changes > 0) {
            const updatedUser = await User.findById(userId);
            // حذف فیلدهای حساس
            const { password, ...userWithoutPassword } = updatedUser;
            
            res.json({ 
                success: true, 
                message: 'Profile updated successfully',
                user: userWithoutPassword
            });
        } else {
            res.status(400).json({ success: false, message: 'Failed to update profile' });
        }
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// API برای گرفتن همه کاربران (فقط برای ادمین)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;
        
        const users = await User.getAll(parseInt(limit), parseInt(offset));
        
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            users: users,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: users.length
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API برای گرفتن کاربر خاص توسط ID (فقط برای ادمین)
app.get('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // حذف فیلدهای حساس
        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'User retrieved successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API برای ارتقای نقش کاربر (فقط برای ادمین)
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { newRole } = req.body;
        
        // بررسی وجود newRole در body
        if (!newRole) {
            return res.status(400).json({ 
                success: false, 
                message: 'newRole is required in request body' 
            });
        }
        
        // بررسی نقش معتبر
        const validRoles = ['job_seeker', 'intern', 'employer', 'admin', 'teacher'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid role. Valid roles are: ${validRoles.join(', ')}` 
            });
        }
        
        // بررسی وجود کاربر
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // آپدیت نقش کاربر
        const changes = await User.update(userId, { user_type: newRole });
        
        if (changes > 0) {
            const updatedUser = await User.findById(userId);
            res.json({ 
                success: true, 
                message: 'User role updated successfully',
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    userType: updatedUser.user_type
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Failed to update user role' });
        }
    } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error: ' + error.message 
        });
    }
});

// API برای حذف کاربر (فقط برای ادمین)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // بررسی وجود کاربر
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // کاربر نمی‌تواند خودش را حذف کند
        if (req.user.id === parseInt(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        const changes = await User.delete(userId);
        
        if (changes > 0) {
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API برای گرفتن آمار کلی سایت
app.get('/api/summary', async (req, res) => {
    try {
        const userStats = await User.getUserStats();
        
        res.json({
            success: true,
            message: 'Site summary retrieved successfully',
            summary: {
                totalUsers: userStats.total,
                jobSeekers: userStats.job_seeker,
                interns: userStats.intern,
                employers: userStats.employer,
                admins: userStats.admin,
                teachers: userStats.teacher,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
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
            register: '/api/register (POST)',
            login: '/api/login (POST)',
            logout: '/api/logout (POST)',
            getProfile: '/api/profile/:id (GET)',
            updateProfile: '/api/profile/:id (PUT)',
            getAllUsers: '/api/users (GET) - Admin only',
            getUser: '/api/users/:id (GET) - Admin only',
            updateRole: '/api/users/:id/role (PUT) - Admin only',
            deleteUser: '/api/users/:id (DELETE) - Admin only',
            siteSummary: '/api/summary (GET)'
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
    console.log(`📍 Register: http://localhost:${PORT}/api/register`);
    console.log(`📍 Login: http://localhost:${PORT}/api/login`);
    console.log(`📍 API Summary: http://localhost:${PORT}/api/summary`);
});

module.exports = app;