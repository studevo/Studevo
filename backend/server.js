require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

// Models
const Student = require('./models/Student');
const Organization = require('./models/Organization');
const Post = require('./models/Post');

const app = express();

// ======================
// Middleware
// ======================

app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// CORS — ONLY allow your live domain (add localhost during dev if needed)
const allowedOrigins = [
  'https://studevoge.onrender.com'
  
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ======================
// MongoDB Connection
// ======================

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ Missing MONGODB_URI environment variable!');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ======================
// Helper Functions
// ======================

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// ======================
// Routes
// ======================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'StudyConnect Backend is running!' });
});

// CV Routes
app.post('/api/cv', async (req, res) => {
  const { email, firstName, lastName, phone, address, education, skills, experience, projects, certifications } = req.body;
  if (!email || !firstName || !lastName || !phone) {
    return res.status(400).json({ error: 'Email, First Name, Last Name, and Phone are required.' });
  }

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ error: 'Student not found.' });
    }

    student.firstName = firstName;
    student.lastName = lastName;
    student.phone = phone;
    student.address = address || '';
    student.education = education || '';
    student.skills = skills || '';
    student.experience = experience || '';
    student.projects = projects || '';
    student.certifications = certifications || '';

    await student.save();

    res.json({
      message: 'CV saved successfully!',
      cv: {
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        address: student.address,
        education: student.education,
        skills: student.skills,
        experience: student.experience,
        projects: student.projects,
        certifications: student.certifications
      }
    });

  } catch (err) {
    console.error('Error saving CV:', err);
    res.status(500).json({ error: 'Server error during CV save.' });
  }
});

app.get('/api/cv', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const student = await Student.findOne({ email }).select(
      'firstName lastName email phone address education skills experience projects certifications'
    );
    if (!student) {
      return res.status(400).json({ error: 'Student not found.' });
    }

    res.json({ cv: student });
  } catch (err) {
    console.error('Error fetching CV:', err);
    res.status(500).json({ error: 'Failed to fetch CV' });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { role } = req.body;
  if (role !== 'student' && role !== 'organization') {
    return res.status(400).json({ error: 'Invalid role. Must be "student" or "organization".' });
  }

  try {
    const emailExistsInStudent = await Student.exists({ email: req.body.email });
    const emailExistsInOrg = await Organization.exists({ email: req.body.email });
    if (emailExistsInStudent || emailExistsInOrg) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);

    if (role === 'student') {
      const { firstName, lastName, email, phone, password } = req.body;
      if (!firstName || !lastName || !email || !phone || !password) {
        return res.status(400).json({ error: 'All student fields are required.' });
      }
      const hashedPassword = await bcrypt.hash(password, salt);
      const student = new Student({ firstName, lastName, email, phone, password: hashedPassword });
      await student.save();
      return res.status(201).json({ message: 'Student registered successfully!', role: 'student' });
    } else {
      const { orgName, email, phone, password, orgTerms } = req.body;
      if (!orgName || !email || !password || !orgTerms) {
        return res.status(400).json({ error: 'All organization fields and terms acceptance are required.' });
      }
      const hashedPassword = await bcrypt.hash(password, salt);
      const org = new Organization({ orgName, email, phone: phone || '', password: hashedPassword });
      await org.save();
      return res.status(201).json({ message: 'Organization registered successfully!', role: 'organization' });
    }
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    let user = await Student.findOne({ email });
    let role = 'student';

    if (!user) {
      user = await Organization.findOne({ email });
      role = 'organization';
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    return res.json({
      message: 'Login successful',
      role,
      email: user.email,
      id: user._id,
      orgId: role === 'organization' ? user._id : null
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// Post Routes
app.get('/api/posts', async (req, res) => {
  try {
    const { orgId } = req.query;
    if (orgId) {
      if (!mongoose.Types.ObjectId.isValid(orgId)) {
        return res.status(400).json({ error: 'Invalid orgId format' });
      }
      const posts = await Post.find({ orgId }).sort({ createdAt: -1 });
      return res.json(posts);
    } else {
      const posts = await Post.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .select('-__v');
      return res.json(posts);
    }
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const {
      orgId,
      orgName,
      title,
      type,
      description,
      location,
      durationStart,
      durationEnd,
      deadline,
      applicationLink,
      status = 'draft'
    } = req.body;

    if (!orgId || !orgName || !title || !type || !description) {
      return res.status(400).json({ error: 'orgId, orgName, title, type, and description are required.' });
    }

    if (!['draft', 'active'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "draft" or "active".' });
    }

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ error: 'Invalid orgId format' });
    }

    const start = parseDate(durationStart);
    const end = parseDate(durationEnd);
    const ddl = parseDate(deadline);

    if (start && end && start > end) {
      return res.status(400).json({ error: 'Start date cannot be after end date.' });
    }

    const post = new Post({
      orgId,
      orgName,
      title,
      type,
      description,
      location: location || 'Remote',
      durationStart: start,
      durationEnd: end,
      deadline: ddl,
      applicationLink: applicationLink || '',
      status
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join('; ') });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid data format. Check orgId and dates.' });
    }
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      type,
      description,
      location,
      durationStart,
      durationEnd,
      deadline,
      applicationLink
    } = req.body;

    if (!title || !type || !description) {
      return res.status(400).json({ error: 'Title, type, and description are required.' });
    }

    const start = parseDate(durationStart);
    const end = parseDate(durationEnd);
    const ddl = parseDate(deadline);

    if (start && end && start > end) {
      return res.status(400).json({ error: 'Start date cannot be after end date.' });
    }

    const post = await Post.findByIdAndUpdate(
      id,
      {
        title,
        type,
        description,
        location: location || 'Remote',
        durationStart: start,
        durationEnd: end,
        deadline: ddl,
        applicationLink: applicationLink || ''
      },
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error('Error updating post:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join('; ') });
    }
    res.status(500).json({ error: 'Failed to update post' });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Placeholder routes
app.get('/api/applications/recent', (req, res) => res.status(501).json({ error: 'Not implemented' }));
app.get('/api/events/upcoming', (req, res) => res.status(501).json({ error: 'Not implemented' }));
app.get('/api/applications', (req, res) => res.status(501).json({ error: 'Not implemented' }));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// 404 fallback
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

// ======================
// Start Server
// ======================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✨ Process terminated');
  });
});