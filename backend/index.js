require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const setupTestUser = require('./setup');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// County FIPS to name mapping
const COUNTY_FIPS_TO_NAME = {
  '001': 'Adams',
  '003': 'Alexander',
  '005': 'Bond',
  '007': 'Boone',
  '009': 'Brown',
  '011': 'Bureau',
  '013': 'Calhoun',
  '015': 'Carroll',
  '017': 'Cass',
  '019': 'Champaign',
  '021': 'Christian',
  '023': 'Clark',
  '025': 'Clay',
  '027': 'Clinton',
  '029': 'Coles',
  '031': 'Cook',
  '033': 'Crawford',
  '035': 'Cumberland',
  '037': 'DeKalb',
  '039': 'De Witt',
  '041': 'Douglas',
  '043': 'DuPage',
  '045': 'Edgar',
  '047': 'Edwards',
  '049': 'Effingham',
  '051': 'Fayette',
  '053': 'Ford',
  '055': 'Franklin',
  '057': 'Fulton',
  '059': 'Gallatin',
  '061': 'Greene',
  '063': 'Grundy',
  '065': 'Hamilton',
  '067': 'Hancock',
  '069': 'Hardin',
  '071': 'Henderson',
  '073': 'Henry',
  '075': 'Iroquois',
  '077': 'Jackson',
  '079': 'Jasper',
  '081': 'Jefferson',
  '083': 'Jersey',
  '085': 'Jo Daviess',
  '087': 'Johnson',
  '089': 'Kane',
  '091': 'Kankakee',
  '093': 'Kendall',
  '095': 'Knox',
  '097': 'Lake',
  '099': 'LaSalle',
  '101': 'Lawrence',
  '103': 'Lee',
  '105': 'Livingston',
  '107': 'Logan',
  '109': 'McDonough',
  '111': 'McHenry',
  '113': 'McLean',
  '115': 'Macon',
  '117': 'Macoupin',
  '119': 'Madison',
  '121': 'Marion',
  '123': 'Marshall',
  '125': 'Mason',
  '127': 'Massac',
  '129': 'Menard',
  '131': 'Mercer',
  '133': 'Monroe',
  '135': 'Montgomery',
  '137': 'Morgan',
  '139': 'Moultrie',
  '141': 'Ogle',
  '143': 'Peoria',
  '145': 'Perry',
  '147': 'Piatt',
  '149': 'Pike',
  '151': 'Pope',
  '153': 'Pulaski',
  '155': 'Putnam',
  '157': 'Randolph',
  '159': 'Richland',
  '161': 'Rock Island',
  '163': 'St. Clair',
  '165': 'Saline',
  '167': 'Sangamon',
  '169': 'Schuyler',
  '171': 'Scott',
  '173': 'Shelby',
  '175': 'Stark',
  '177': 'Stephenson',
  '179': 'Tazewell',
  '181': 'Union',
  '183': 'Vermilion',
  '185': 'Wabash',
  '187': 'Warren',
  '189': 'Washington',
  '191': 'Wayne',
  '193': 'White',
  '195': 'Whiteside',
  '197': 'Will',
  '199': 'Williamson',
  '201': 'Winnebago',
  '203': 'Woodford'
};

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://localhost:8080',
      'https://no-place-left-illinois-dashboard.onrender.com',
      'https://no-place-left-illinois-frontend.onrender.com',
      'https://no-place-left-illinois-dashboard.netlify.app',
      'https://no-place-left-illinois-frontend.netlify.app',
      'https://no-place-left-illinois-dashboard.vercel.app',
      'https://no-place-left-illinois-frontend.vercel.app',
      'https://www.noplaceleftillinois.org',
      'https://noplaceleftillinois.org',
      'https://*.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Temporarily allow all origins for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from the frontend build
app.use(express.static('../dist'));

// SQLite setup
const db = new sqlite3.Database(path.join(__dirname, 'auth.db'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    must_reset_password INTEGER DEFAULT 1,
    role TEXT DEFAULT 'coordinator',
    countyfp TEXT,
    tractid TEXT,
    first_name TEXT,
    last_name TEXT
  )`);
  
  // Password reset codes table
  db.run(`CREATE TABLE IF NOT EXISTS password_reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    code TEXT,
    expires_at DATETIME,
    used INTEGER DEFAULT 0
  )`);
  
  // Tract data table
  db.run(`CREATE TABLE IF NOT EXISTS tract_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tract_id TEXT UNIQUE,
    population INTEGER DEFAULT 0,
    disciple_makers INTEGER DEFAULT 0,
    simple_churches INTEGER DEFAULT 0,
    legacy_churches INTEGER DEFAULT 0,
    countyfp TEXT,
    updated_at DATETIME,
    updated_by TEXT
  )`);
  
  // County data table
  db.run(`CREATE TABLE IF NOT EXISTS county_data (
    county_name TEXT PRIMARY KEY,
    disciple_makers INTEGER DEFAULT 0,
    simple_churches INTEGER DEFAULT 0,
    legacy_churches INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
  )`);
  
  // Seed state coordinator
  db.get('SELECT * FROM users WHERE email = ?', ['jziegenhorn@teamexpansion.org'], (err, row) => {
    if (!row) {
      bcrypt.hash('#NPLIL', 10, (err, hash) => {
        db.run('INSERT INTO users (email, password_hash, must_reset_password, role) VALUES (?, ?, 1, ?)', [
          'jziegenhorn@teamexpansion.org', hash, 'state'
        ]);
      });
    }
  });
});

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, countyfp: user.countyfp, tractid: user.tractid }, JWT_SECRET, { expiresIn: '1d' });
}

function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
}

// Email notification function using nodemailer
async function sendWelcomeEmail(email, name, assignmentId, assignmentType = 'tract') {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    let assignmentText;
    let subjectSuffix;
    
    if (assignmentType === 'county') {
      assignmentText = `county ${assignmentId}`;
      subjectSuffix = 'County Coordinator Assignment';
    } else {
      assignmentText = `census tract ${assignmentId}`;
      subjectSuffix = 'Tract Coordinator Assignment';
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Welcome to #NoPlaceLeft Illinois - ${subjectSuffix}`,
      text: `Dear ${name},

Welcome to the #NoPlaceLeft Illinois project!

You have been assigned as the coordinator for ${assignmentText}.

Your login credentials:
Username: ${email}
Password: #NPLIL

Please log in at http://localhost:5173 and change your password on first login.

Thank you for serving with us!

#NoPlaceLeft Illinois Team`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${email}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw error to avoid breaking the coordinator assignment
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      next();
    });
  };
}

// Add this after requireRole and before other endpoints
app.get('/api/user-roles', requireRole(['state', 'county', 'tract']), (req, res) => {
  const email = req.user.email;
  db.all('SELECT role, countyfp, tractid FROM users WHERE email = ?', [email], (err, rows) => {
    console.log('USER-ROLES DEBUG:', { email, rows });
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Process roles to handle multiple assignments within a single user record
    const roles = [];
    
    rows.forEach(row => {
      // Add the main role
      roles.push({ role: row.role, countyfp: row.countyfp, tractid: row.tractid });
      
      // If user has both county and tract assignments, create separate role entries
      if (row.role === 'state' && row.countyfp && row.tractid) {
        // Add county coordinator role
        roles.push({ role: 'county', countyfp: row.countyfp, tractid: null });
        // Add tract coordinator role
        roles.push({ role: 'tract', countyfp: null, tractid: row.tractid });
      } else if (row.role === 'state' && row.countyfp) {
        // Add county coordinator role
        roles.push({ role: 'county', countyfp: row.countyfp, tractid: null });
      } else if (row.role === 'state' && row.tractid) {
        // Add tract coordinator role
        roles.push({ role: 'tract', countyfp: null, tractid: row.tractid });
      }
    });
    
    // Remove duplicates based on role + countyfp + tractid combination
    const uniqueRoles = roles.filter((role, index, self) => 
      index === self.findIndex(r => 
        r.role === role.role && 
        r.countyfp === role.countyfp && 
        r.tractid === role.tractid
      )
    );
    
    res.json({
      roles: uniqueRoles
    });
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.all('SELECT * FROM users WHERE email = ?', [email], (err, users) => {
    console.log('LOGIN DEBUG: users found for', email, users);
    if (!users || users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    // Pick the user with the highest role
    const roleHierarchy = { 'state': 3, 'county': 2, 'tract': 1 };
    const user = users.reduce((highest, u) => {
      if (!highest) return u;
      return (roleHierarchy[u.role] > roleHierarchy[highest.role]) ? u : highest;
    }, null);
    console.log('LOGIN DEBUG: user selected for login', user);
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (!result) return res.status(401).json({ error: 'Invalid credentials' });
      const token = generateToken(user);
      res.json({ 
        token, 
        mustResetPassword: !!user.must_reset_password, 
        role: user.role, 
        countyfp: user.countyfp, 
        tractid: user.tractid,
        email: user.email
      });
    });
  });
});

// Register endpoint (state or county coordinator can assign)
app.post('/api/register', requireRole(['state', 'county']), (req, res) => {
  const { email, password, role, countyfp, tractid } = req.body;
  // Only state can assign state/county/tract, county can only assign tract
  if (req.user.role === 'county' && (role !== 'tract' || countyfp !== req.user.countyfp)) {
    return res.status(403).json({ error: 'County coordinators can only assign tract coordinators for their county' });
  }
  bcrypt.hash(password, 10, (err, hash) => {
    db.run('INSERT INTO users (email, password_hash, must_reset_password, role, countyfp, tractid) VALUES (?, ?, 1, ?, ?, ?)', [email, hash, role || 'coordinator', countyfp || null, tractid || null], function(err) {
      if (err) return res.status(400).json({ error: 'User already exists' });
      res.json({ success: true });
    });
  });
});

// Password reset endpoint (for logged-in users changing password)
app.post('/api/reset-password', (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });
    bcrypt.compare(oldPassword, user.password_hash, (err, result) => {
      if (!result) return res.status(401).json({ error: 'Invalid current password' });
      bcrypt.hash(newPassword, 10, (err, hash) => {
        db.run('UPDATE users SET password_hash = ?, must_reset_password = 0 WHERE email = ?', [hash, email], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to update password' });
          res.json({ success: true });
        });
      });
    });
  });
});

// Request password reset (for forgotten passwords)
app.post('/api/request-password-reset', (req, res) => {
  const { email } = req.body;
  
  // Check if user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
    }
    
    // Generate reset code
    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    // Store reset code
    db.run('INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)', 
      [email, resetCode, expiresAt.toISOString()], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to generate reset code' });
      
      // In a real app, you would send this code via email
      // For now, we'll just return it in the response for testing
      console.log(`Password reset code for ${email}: ${resetCode}`);
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      async function sendResetEmail(email, code) {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: "Password Reset Code",
          text: `Your password reset code is: ${code}`
        });
      }

      sendResetEmail(email, resetCode)
        .then(() => {
          res.json({ 
            success: true, 
            message: 'If the email exists, a reset code has been sent.'
          });
        })
        .catch((err) => {
          console.error('Failed to send reset email:', err);
          res.status(500).json({ error: 'Failed to send reset email' });
        });
    });
  });
});

// Confirm password reset with code
app.post('/api/confirm-password-reset', (req, res) => {
  const { email, code, newPassword } = req.body;
  
  // Validate code
  db.get('SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC LIMIT 1', 
    [email, code], (err, resetCode) => {
    if (!resetCode) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }
    
    // Hash new password
    bcrypt.hash(newPassword, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: 'Failed to hash password' });
      
      // Update user password and mark code as used
      db.run('UPDATE users SET password_hash = ?, must_reset_password = 0 WHERE email = ?', [hash, email], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        
        // Mark reset code as used
        db.run('UPDATE password_reset_codes SET used = 1 WHERE id = ?', [resetCode.id], function(err) {
          if (err) console.error('Failed to mark reset code as used:', err);
          
          res.json({ success: true, message: 'Password reset successfully' });
        });
      });
    });
  });
});

// Force password reset (for first-time login or admin-initiated reset)
app.post('/api/force-password-reset', (req, res) => {
  const { email, newPassword } = req.body;
  
  // Check if user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Hash new password
    bcrypt.hash(newPassword, 10, (err, hash) => {
      if (err) return res.status(500).json({ error: 'Failed to hash password' });
      
      // Update user password and clear must_reset_password flag
      db.run('UPDATE users SET password_hash = ?, must_reset_password = 0 WHERE email = ?', [hash, email], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update password' });
        
        res.json({ success: true, message: 'Password updated successfully' });
      });
    });
  });
});

// Auth check endpoint
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user });
  });
});

// Get coordinator for a county
app.get('/api/coordinator/county/:countyfp', (req, res) => {
  const { countyfp } = req.params;
  db.get('SELECT email, first_name, last_name FROM users WHERE countyfp = ? AND (role = "county" OR role = "state")', [countyfp], (err, coordinator) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (coordinator) {
      const fullName = [coordinator.first_name, coordinator.last_name].filter(Boolean).join(' ');
      res.json({ coordinator: fullName || coordinator.email });
    } else {
      res.json({ coordinator: null });
    }
  });
});

// Get coordinator for a tract
app.get('/api/coordinator/tract/:tractid', (req, res) => {
  const { tractid } = req.params;
  db.get('SELECT email, first_name, last_name FROM users WHERE tractid = ? AND (role = "tract" OR role = "state")', [tractid], (err, coordinator) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (coordinator) {
      const fullName = [coordinator.first_name, coordinator.last_name].filter(Boolean).join(' ');
      res.json({ coordinator: fullName || coordinator.email });
    } else {
      res.json({ coordinator: null });
    }
  });
});

// Get tract data
app.get('/api/tract/:tractid', (req, res) => {
  const { tractid } = req.params;
  db.get('SELECT * FROM tract_data WHERE tract_id = ?', [tractid], (err, tractData) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ 
      tractData: tractData || {
        tract_id: tractid,
        disciple_makers: 0,
        simple_churches: 0,
        legacy_churches: 0
      }
    });
  });
});

// Update tract data (disciple-makers, churches, coordinator assignment)
app.post('/api/tract/update', requireRole(['state', 'county', 'tract']), (req, res) => {
  const { tractId, discipleMakers, simpleChurches, legacyChurches, coordinator } = req.body;
  
  // Validate required fields
  if (!tractId || discipleMakers === undefined || simpleChurches === undefined || legacyChurches === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if user has permission to edit this tract
  if (req.user.role === 'tract' && req.user.tractid !== tractId) {
    return res.status(403).json({ error: 'You can only edit your assigned tract' });
  }
  if (req.user.role === 'county') {
    // County coordinators can only edit tracts in their county
    // This would need additional logic to check tract belongs to county
  }

  // Start a transaction
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Update tract data (you'll need to create a tracts table or use a different storage method)
    // For now, we'll store this in a simple table
    db.run(`
      INSERT OR REPLACE INTO tract_data (tract_id, disciple_makers, simple_churches, legacy_churches, updated_at, updated_by)
      VALUES (?, ?, ?, ?, datetime('now'), ?)
    `, [tractId, discipleMakers, simpleChurches, legacyChurches, req.user.email], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update tract data' });
      }

      // If coordinator is being assigned
      if (coordinator && coordinator.name && coordinator.email) {
        // Check if coordinator already exists
        db.get('SELECT * FROM users WHERE email = ?', [coordinator.email], (err, existingUser) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }

          if (existingUser) {
            // For existing users, create a new role assignment instead of updating
            // This allows multiple role assignments per user
            db.run('INSERT INTO users (email, password_hash, must_reset_password, role, tractid) VALUES (?, ?, 0, "tract", ?)', 
              [coordinator.email, existingUser.password_hash, tractId], function(err) {
              if (err) {
                // If insert fails (e.g., duplicate), try to update existing tract assignment
                db.run('UPDATE users SET tractid = ? WHERE email = ? AND role = "tract"', 
                  [tractId, coordinator.email], function(updateErr) {
                  if (updateErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to assign coordinator' });
                  }
                  
                  // Send welcome email
                  sendWelcomeEmail(coordinator.email, coordinator.name, tractId)
                    .then(() => {
                      db.run('COMMIT');
                      res.json({ 
                        success: true, 
                        message: 'Tract data updated and coordinator assigned successfully',
                        coordinatorAssigned: true
                      });
                    })
                    .catch((err) => {
                      console.error('Failed to send welcome email:', err);
                      db.run('COMMIT');
                      res.json({ 
                        success: true, 
                        message: 'Tract data updated and coordinator assigned successfully (email failed)',
                        coordinatorAssigned: true
                      });
                    });
                });
              } else {
                // Send welcome email
                sendWelcomeEmail(coordinator.email, coordinator.name, tractId)
                  .then(() => {
                    db.run('COMMIT');
                    res.json({ 
                      success: true, 
                      message: 'Tract data updated and coordinator assigned successfully',
                      coordinatorAssigned: true
                    });
                  })
                  .catch((err) => {
                    console.error('Failed to send welcome email:', err);
                    db.run('COMMIT');
                    res.json({ 
                      success: true, 
                      message: 'Tract data updated and coordinator assigned successfully (email failed)',
                      coordinatorAssigned: true
                    });
                  });
              }
            });
          } else {
            // Create new coordinator user
            bcrypt.hash('#NPLIL', 10, (err, hash) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create coordinator account' });
              }

              db.run('INSERT INTO users (email, password_hash, must_reset_password, role, tractid) VALUES (?, ?, 1, ?, ?)', 
                [coordinator.email, hash, 'tract', tractId], function(err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to create coordinator account' });
                }

                // Send welcome email
                sendWelcomeEmail(coordinator.email, coordinator.name, tractId)
                  .then(() => {
                    db.run('COMMIT');
                    res.json({ 
                      success: true, 
                      message: 'Tract data updated and new coordinator created successfully',
                      coordinatorAssigned: true
                    });
                  })
                  .catch((err) => {
                    console.error('Failed to send welcome email:', err);
                    db.run('COMMIT');
                    res.json({ 
                      success: true, 
                      message: 'Tract data updated and new coordinator created successfully (email failed)',
                      coordinatorAssigned: true
                    });
                  });
              });
            });
          }
        });
      } else {
        // No coordinator assignment, just commit the tract data update
        db.run('COMMIT');
        res.json({ 
          success: true, 
          message: 'Tract data updated successfully',
          coordinatorAssigned: false
        });
      }
    });
  });
});

// Assign or update county coordinator
app.post('/api/county/assign-coordinator', requireRole(['state']), (req, res) => {
  const { countyfp, name, email } = req.body;
  if (!countyfp || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Split name into first and last name
  const nameParts = name.trim().split(' ');
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existingUser) {
      // For existing users, create a new role assignment instead of updating
      // This allows multiple role assignments per user
      db.run('INSERT INTO users (email, password_hash, must_reset_password, role, countyfp, first_name, last_name) VALUES (?, ?, 0, "county", ?, ?, ?)', 
        [email, existingUser.password_hash, countyfp, first_name, last_name], function(err) {
        if (err) {
          // If insert fails (e.g., duplicate), try to update existing county assignment
          db.run('UPDATE users SET countyfp = ?, first_name = ?, last_name = ? WHERE email = ? AND role = "county"', 
            [countyfp, first_name, last_name, email], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to assign coordinator' });
            sendWelcomeEmail(email, name, countyfp, 'county')
              .then(() => {
                res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
              })
              .catch((err) => {
                console.error('Failed to send welcome email:', err);
                res.json({ success: true, message: 'Coordinator assigned (email failed)' });
              });
          });
        } else {
          sendWelcomeEmail(email, name, countyfp, 'county')
            .then(() => {
              res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
            })
            .catch((err) => {
              console.error('Failed to send welcome email:', err);
              res.json({ success: true, message: 'Coordinator assigned (email failed)' });
            });
        }
      });
    } else {
      // Create new user
      bcrypt.hash('#NPLIL', 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Failed to hash password' });
        db.run('INSERT INTO users (email, password_hash, must_reset_password, role, countyfp, first_name, last_name) VALUES (?, ?, 1, "county", ?, ?, ?)', 
          [email, hash, countyfp, first_name, last_name], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to create coordinator account' });
          sendWelcomeEmail(email, name, countyfp, 'county')
            .then(() => {
              res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
            })
            .catch((err) => {
              console.error('Failed to send welcome email:', err);
              res.json({ success: true, message: 'Coordinator assigned (email failed)' });
            });
        });
      });
    }
  });
});

// Assign or update tract coordinator
app.post('/api/tract/assign-coordinator', requireRole(['state', 'county']), (req, res) => {
  const { countyfp, tractid, name, email } = req.body;
  if (!countyfp || !tractid || !name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check permissions - county coordinators can only assign tract coordinators in their county
  if (req.user.role === 'county' && req.user.countyfp !== countyfp) {
    return res.status(403).json({ error: 'You can only assign tract coordinators in your county' });
  }
  
  // Split name into first and last name
  const nameParts = name.trim().split(' ');
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';
  
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existingUser) {
      // For existing users, create a new role assignment instead of updating
      // This allows multiple role assignments per user
      db.run('INSERT INTO users (email, password_hash, must_reset_password, role, countyfp, tractid, first_name, last_name) VALUES (?, ?, 0, "tract", ?, ?, ?, ?)', 
        [email, existingUser.password_hash, countyfp, tractid, first_name, last_name], function(err) {
        if (err) {
          // If insert fails (e.g., duplicate), try to update existing tract assignment
          db.run('UPDATE users SET countyfp = ?, tractid = ?, first_name = ?, last_name = ? WHERE email = ? AND role = "tract"', 
            [countyfp, tractid, first_name, last_name, email], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Failed to assign coordinator' });
            sendWelcomeEmail(email, name, tractid, 'tract')
              .then(() => {
                res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
              })
              .catch((err) => {
                console.error('Failed to send welcome email:', err);
                res.json({ success: true, message: 'Coordinator assigned (email failed)' });
              });
          });
        } else {
          sendWelcomeEmail(email, name, tractid, 'tract')
            .then(() => {
              res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
            })
            .catch((err) => {
              console.error('Failed to send welcome email:', err);
              res.json({ success: true, message: 'Coordinator assigned (email failed)' });
            });
        }
      });
    } else {
      // Create new user
      bcrypt.hash('#NPLIL', 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Failed to hash password' });
        db.run('INSERT INTO users (email, password_hash, must_reset_password, role, countyfp, tractid, first_name, last_name) VALUES (?, ?, 1, "tract", ?, ?, ?, ?)', 
          [email, hash, countyfp, tractid, first_name, last_name], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to create coordinator account' });
          sendWelcomeEmail(email, name, tractid, 'tract')
            .then(() => {
              res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
            })
            .catch((err) => {
              console.error('Failed to send welcome email:', err);
              res.json({ success: true, message: 'Coordinator assigned (email failed)' });
            });
        });
      });
    }
  });
});

// Get hierarchical data based on coordinator role
app.get('/api/coordinator/data', requireRole(['state', 'county', 'tract']), (req, res) => {
  const { role, countyfp, tractid } = req.user;
  
  if (role === 'state') {
    // Get coordinators
    db.all(`
      SELECT 
        u.id, u.email, u.role, u.countyfp, u.tractid, u.first_name, u.last_name,
        CASE 
          WHEN u.role = 'state' AND u.countyfp IS NOT NULL THEN 'State Coordinator (County Assignment)'
          WHEN u.role = 'county' THEN 'County Coordinator'
          WHEN u.role = 'tract' THEN 'Tract Coordinator'
          ELSE 'Unknown'
        END as role_display
      FROM users u 
      WHERE (u.role IN ('county', 'tract')) OR (u.role = 'state' AND u.countyfp IS NOT NULL)
      ORDER BY u.role, u.countyfp, u.tractid
    `, [], (err, coordinators) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Add county_name to each coordinator
      coordinators.forEach(c => {
        c.county_name = c.countyfp ? COUNTY_FIPS_TO_NAME[c.countyfp] || c.countyfp : '';
      });
      
      // Get tract data
      db.all('SELECT * FROM tract_data ORDER BY tract_id', [], (err, tractData) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Calculate county totals by summing tract data
        const countyTotals = {};
        
        // Initialize all counties with 0 values
        Object.keys(COUNTY_FIPS_TO_NAME).forEach(countyFips => {
          countyTotals[countyFips] = {
            name: COUNTY_FIPS_TO_NAME[countyFips],
            discipleMakers: 0,
            simpleChurches: 0,
            legacyChurches: 0
          };
        });
        
        // Sum tract data into county totals
        tractData.forEach(tract => {
          // Extract county FIPS from tract ID
          const tractId = tract.tract_id;
          let countyFips = null;
          
          if (tractId.length === 11) {
            // Full FIPS code: extract county part (positions 3-5)
            countyFips = tractId.substring(2, 5);
          } else if (tractId.length === 6) {
            // Short tract code: need to map to county
            if (tractId === '000502') {
              countyFips = '113'; // McLean County
            } else if (tractId.startsWith('001')) {
              countyFips = '001'; // Adams County
            } else if (tractId.startsWith('003')) {
              countyFips = '003'; // Alexander County
            }
            // Add more mappings as needed
          }
          
          if (countyFips && countyTotals[countyFips]) {
            countyTotals[countyFips].discipleMakers += tract.disciple_makers || 0;
            countyTotals[countyFips].simpleChurches += tract.simple_churches || 0;
            countyTotals[countyFips].legacyChurches += tract.legacy_churches || 0;
          }
        });
        
        // Convert to array format for frontend
        const counties = Object.values(countyTotals);
        
        const tracts = tractData.map(tract => ({
          tractId: tract.tract_id,
          discipleMakers: tract.disciple_makers || 0,
          simpleChurches: tract.simple_churches || 0,
          legacyChurches: tract.legacy_churches || 0
        }));
        
        res.json({
          coordinators,
          tractData,
          counties,
          tracts,
          userRole: role,
          userScope: 'state'
        });
      });
    });
  } else if (role === 'county') {
    // Get coordinators for this county
    db.all(`
      SELECT 
        u.id, u.email, u.role, u.countyfp, u.tractid, u.first_name, u.last_name,
        'Tract Coordinator' as role_display
      FROM users u 
      WHERE u.role = 'tract' AND u.countyfp = ?
      ORDER BY u.tractid
    `, [countyfp], (err, coordinators) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      coordinators.forEach(c => {
        c.county_name = c.countyfp ? COUNTY_FIPS_TO_NAME[c.countyfp] || c.countyfp : '';
      });
      
      // Get tract data for this county
      db.all('SELECT * FROM tract_data ORDER BY tract_id', [], (err, tractData) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Calculate county total by summing tract data for this county
        const countyName = COUNTY_FIPS_TO_NAME[countyfp];
        let countyTotal = {
          name: countyName,
          discipleMakers: 0,
          simpleChurches: 0,
          legacyChurches: 0
        };
        
        // Sum tract data for this county
        tractData.forEach(tract => {
          const tractId = tract.tract_id;
          let tractCountyFips = null;
          
          if (tractId.length === 11) {
            tractCountyFips = tractId.substring(2, 5);
          } else if (tractId.length === 6) {
            // Short tract code: need to map to county
            if (tractId === '000502') {
              tractCountyFips = '113'; // McLean County
            } else if (tractId.startsWith('001')) {
              tractCountyFips = '001'; // Adams County
            } else if (tractId.startsWith('003')) {
              tractCountyFips = '003'; // Alexander County
            }
            // Add more mappings as needed
          }
          
          if (tractCountyFips === countyfp) {
            countyTotal.discipleMakers += tract.disciple_makers || 0;
            countyTotal.simpleChurches += tract.simple_churches || 0;
            countyTotal.legacyChurches += tract.legacy_churches || 0;
          }
        });
        
        const counties = [countyTotal];
        
        const tracts = tractData.map(tract => ({
          tractId: tract.tract_id,
          discipleMakers: tract.disciple_makers || 0,
          simpleChurches: tract.simple_churches || 0,
          legacyChurches: tract.legacy_churches || 0
        }));
        
        res.json({
          coordinators,
          tractData,
          counties,
          tracts,
          userRole: role,
          userScope: 'county',
          userCounty: countyfp
        });
      });
    });
  } else if (role === 'tract') {
    // Get tract data for this specific tract
    db.get('SELECT * FROM tract_data WHERE tract_id = ?', [tractid], (err, tractData) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      
      // Format data for MapDashboard
      const tracts = tractData ? [{
        tractId: tractData.tract_id,
        discipleMakers: tractData.disciple_makers || 0,
        simpleChurches: tractData.simple_churches || 0,
        legacyChurches: tractData.legacy_churches || 0
      }] : [];
      
      res.json({
        coordinators: [],
        tractData: tractData ? [tractData] : [],
        counties: [],
        tracts,
        userRole: role,
        userScope: 'tract',
        userTract: tractid
      });
    });
  }
});

// Public endpoint for view mode - no authentication required
app.get('/api/public/data', (req, res) => {
  // Get all tract data
  db.all('SELECT * FROM tract_data ORDER BY tract_id', [], (err, tractData) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    // Calculate county totals by summing tract data
    const countyTotals = {};
    
    // Initialize all counties with 0 values
    Object.keys(COUNTY_FIPS_TO_NAME).forEach(countyFips => {
      countyTotals[countyFips] = {
        name: COUNTY_FIPS_TO_NAME[countyFips],
        discipleMakers: 0,
        simpleChurches: 0,
        legacyChurches: 0
      };
    });
    
    // Sum tract data into county totals
    tractData.forEach(tract => {
      // Extract county FIPS from tract ID
      const tractId = tract.tract_id;
      let countyFips = null;
      
      if (tractId.length === 11) {
        // Full FIPS code: extract county part (positions 3-5)
        countyFips = tractId.substring(2, 5);
      } else if (tractId.length === 6) {
        // Short tract code: need to map to county
        if (tractId === '000502') {
          countyFips = '113'; // McLean County
        } else if (tractId.startsWith('001')) {
          countyFips = '001'; // Adams County
        } else if (tractId.startsWith('003')) {
          countyFips = '003'; // Alexander County
        }
        // Add more mappings as needed
      }
      
      if (countyFips && countyTotals[countyFips]) {
        countyTotals[countyFips].discipleMakers += tract.disciple_makers || 0;
        countyTotals[countyFips].simpleChurches += tract.simple_churches || 0;
        countyTotals[countyFips].legacyChurches += tract.legacy_churches || 0;
      }
    });
    
    // Convert to array format for frontend
    const counties = Object.values(countyTotals);
    
    const tracts = tractData.map(tract => ({
      tractId: tract.tract_id,
      discipleMakers: tract.disciple_makers || 0,
      simpleChurches: tract.simple_churches || 0,
      legacyChurches: tract.legacy_churches || 0
    }));
    
    res.json({
      counties,
      tracts,
      userRole: 'viewer',
      userScope: 'public'
    });
  });
});

// Get all tract data for a specific county
app.get('/api/county/:countyfp/tracts', requireRole(['state', 'county']), (req, res) => {
  const { countyfp } = req.params;
  const { role, countyfp: userCounty } = req.user;
  
  // County coordinators can only access their own county
  if (role === 'county' && countyfp !== userCounty) {
    return res.status(403).json({ error: 'You can only access data for your assigned county' });
  }
  
  // For now, we'll return all tract data and filter on frontend
  // In a real implementation, you'd want to store county information with tract data
  db.all('SELECT * FROM tract_data ORDER BY tract_id', [], (err, tractData) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    res.json({ tractData });
  });
});

// Bulk update county data
app.post('/api/county/bulk-update', requireRole(['state', 'county']), (req, res) => {
  const { updates } = req.body;
  const { role, countyfp } = req.user;
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates must be an array' });
  }
  
  // Validate permissions for each update
  for (const update of updates) {
    if (role === 'county' && update.countyName !== COUNTY_FIPS_TO_NAME[countyfp]) {
      return res.status(403).json({ error: 'You can only edit data for your assigned county' });
    }
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let completed = 0;
    let errors = [];
    
    updates.forEach((update, index) => {
      const { countyName, discipleMakers, simpleChurches, legacyChurches } = update;
      
      // For now, we'll store county data in a simple table
      // You might want to create a separate counties table
      db.run(`
        INSERT OR REPLACE INTO county_data (county_name, disciple_makers, simple_churches, legacy_churches, updated_at, updated_by)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `, [countyName, discipleMakers || 0, simpleChurches || 0, legacyChurches || 0, req.user.email], function(err) {
        if (err) {
          errors.push({ index, countyName, error: err.message });
        }
        completed++;
        
        if (completed === updates.length) {
          if (errors.length > 0) {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Some updates failed', errors });
          } else {
            db.run('COMMIT');
            res.json({ success: true, message: 'All updates completed successfully' });
          }
        }
      });
    });
  });
});

// Bulk update tract data
app.post('/api/tract/bulk-update', requireRole(['state', 'county', 'tract']), (req, res) => {
  const { updates } = req.body;
  const { role, countyfp, tractid } = req.user;
  
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates must be an array' });
  }
  
  // Validate permissions for each update
  for (const update of updates) {
    if (role === 'tract' && update.tractId !== tractid) {
      return res.status(403).json({ error: 'You can only edit your assigned tract' });
    }
    // Add county validation here if needed
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    let completed = 0;
    let errors = [];
    
    updates.forEach((update, index) => {
      const { tractId, discipleMakers, simpleChurches, legacyChurches } = update;
      
      db.run(`
        INSERT OR REPLACE INTO tract_data (tract_id, disciple_makers, simple_churches, legacy_churches, updated_at, updated_by)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `, [tractId, discipleMakers, simpleChurches, legacyChurches, req.user.email], function(err) {
        if (err) {
          errors.push({ index, tractId, error: err.message });
        }
        completed++;
        
        if (completed === updates.length) {
          if (errors.length > 0) {
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Some updates failed', errors });
          } else {
            db.run('COMMIT');
            res.json({ success: true, message: 'All updates completed successfully' });
          }
        }
      });
    });
  });
});





// Update coordinator information (name and email)
app.put('/api/coordinator/:id', requireRole(['state', 'county']), (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email } = req.body;
  const { role, countyfp } = req.user;
  
  // Validate required fields
  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'First name, last name, and email are required' });
  }
  
  // Check permissions
  db.get('SELECT role, countyfp FROM users WHERE id = ?', [id], (err, coordinator) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found' });
    
    // State coordinators can edit any coordinator
    // County coordinators can only edit tract coordinators in their county
    if (role === 'county' && (coordinator.role !== 'tract' || coordinator.countyfp !== countyfp)) {
      return res.status(403).json({ error: 'You can only edit tract coordinators in your county' });
    }
    
    // Check if email is already taken by another user
    db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id], (err, existingUser) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (existingUser) return res.status(400).json({ error: 'Email is already in use' });
      
      // Update coordinator information
      db.run('UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?', 
        [first_name, last_name, email, id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update coordinator' });
        
        res.json({ 
          success: true, 
          message: 'Coordinator updated successfully',
          coordinator: { id, first_name, last_name, email, role: coordinator.role }
        });
      });
    });
  });
});

// Delete coordinator
app.delete('/api/coordinator/:id', requireRole(['state']), (req, res) => {
  const { id } = req.params;
  
  console.log('Delete request for coordinator ID:', id);
  
  // Check if coordinator exists
  db.get('SELECT role, email FROM users WHERE id = ?', [id], (err, coordinator) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!coordinator) {
      console.log('Coordinator not found with ID:', id);
      return res.status(404).json({ error: 'Coordinator not found' });
    }
    
    console.log('Found coordinator:', coordinator);
    
    // Only allow deletion of county and tract coordinators (not state coordinators)
    if (coordinator.role === 'state') {
      console.log('Attempted to delete state coordinator');
      return res.status(403).json({ error: 'Cannot delete state coordinators' });
    }
    
    // Delete the coordinator
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Failed to delete coordinator:', err);
        return res.status(500).json({ error: 'Failed to delete coordinator' });
      }
      
      console.log('Successfully deleted coordinator:', { id, email: coordinator.email, role: coordinator.role });
      res.json({ 
        success: true, 
        message: 'Coordinator deleted successfully',
        deletedCoordinator: { id, email: coordinator.email, role: coordinator.role }
      });
    });
  });
});

// Clean up expired reset codes (run periodically)
function cleanupExpiredCodes() {
  db.run('DELETE FROM password_reset_codes WHERE expires_at < datetime("now") OR used = 1');
}

// Clean up expired codes every hour
setInterval(cleanupExpiredCodes, 60 * 60 * 1000);

// Get all coordinators
app.get('/api/coordinators', requireRole(['state', 'county']), (req, res) => {
  const { role, countyfp } = req.user;
  
  let query = `
    SELECT id, email, role, countyfp, tractid, first_name, last_name 
    FROM users 
    WHERE role IN ('county', 'tract')
  `;
  let params = [];
  
  // County coordinators can only see tract coordinators in their county
  if (role === 'county') {
    query += ' AND countyfp = ?';
    params.push(countyfp);
  }
  
  query += ' ORDER BY role, first_name, last_name';
  
  db.all(query, params, (err, coordinators) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const formattedCoordinators = coordinators.map(coord => ({
      id: coord.id,
      name: `${coord.first_name || ''} ${coord.last_name || ''}`.trim() || coord.email,
      email: coord.email,
      role: coord.role,
      countyfp: coord.countyfp,
      tractid: coord.tractid
    }));
    
    res.json(formattedCoordinators);
  });
});

// Sync population data from GeoJSON files to database
app.post('/api/sync-population-data', requireRole(['state']), (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Read county GeoJSON file
    const countyGeoJsonPath = path.join(__dirname, '../public/simplified_illinois_counties.geojson');
    const tractGeoJsonPath = path.join(__dirname, '../public/fixed_tracts.geojson');
    
    if (!fs.existsSync(countyGeoJsonPath) || !fs.existsSync(tractGeoJsonPath)) {
      return res.status(404).json({ error: 'GeoJSON files not found' });
    }
    
    const countyData = JSON.parse(fs.readFileSync(countyGeoJsonPath, 'utf8'));
    const tractData = JSON.parse(fs.readFileSync(tractGeoJsonPath, 'utf8'));
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update tract population data from GeoJSON
    tractData.features.forEach(feature => {
      const tractId = feature.properties.TRACTCE || feature.properties.tractce;
      const countyfp = feature.properties.COUNTYFP || feature.properties.countyfp;
      
      // Get population from GeoJSON properties
      let population = 0;
      if (feature.properties.POP_2020 !== undefined && feature.properties.POP_2020 !== null) {
        population = parseInt(feature.properties.POP_2020);
      } else if (feature.properties.population !== undefined && feature.properties.population !== null) {
        population = parseInt(feature.properties.population);
      } else if (feature.properties.POPULATION !== undefined && feature.properties.POPULATION !== null) {
        population = parseInt(feature.properties.POPULATION);
      } else if (feature.properties.POP2010 !== undefined && feature.properties.POP2010 !== null) {
        population = parseInt(feature.properties.POP2010);
      }
      
      if (tractId && population > 0) {
        db.run(`
          INSERT OR REPLACE INTO tract_data 
          (tract_id, population, countyfp, updated_at, updated_by) 
          VALUES (?, ?, ?, datetime('now'), ?)
        `, [tractId, population, countyfp, req.user.email], function(err) {
          if (err) {
            errorCount++;
            console.error(`Error updating tract ${tractId}:`, err);
          } else {
            updatedCount++;
          }
        });
      }
    });
    
    res.json({ 
      success: true, 
      message: `Population data synced successfully. Updated ${updatedCount} tracts, ${errorCount} errors.`,
      updatedCount,
      errorCount
    });
    
  } catch (error) {
    console.error('Error syncing population data:', error);
    res.status(500).json({ error: 'Failed to sync population data' });
  }
});

// Get all tract data
app.get('/api/tract-data', requireRole(['state', 'county', 'tract']), (req, res) => {
  const { role, countyfp, tractid } = req.user;
  
  let query = 'SELECT * FROM tract_data';
  let params = [];
  
  // Filter by user permissions
  if (role === 'county') {
    // County coordinators can see all tracts in their county
    // For now, we'll return all tract data and filter on frontend
    // In a real implementation, you'd want to store county information with tract data
  } else if (role === 'tract') {
    // Tract coordinators can only see their assigned tract
    query += ' WHERE tract_id = ?';
    params.push(tractid);
  }
  
  query += ' ORDER BY tract_id';
  
  db.all(query, params, (err, tractData) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const formattedTractData = {};
    tractData.forEach(tract => {
      formattedTractData[tract.tract_id] = {
        tractId: tract.tract_id,
        population: tract.population || 0,
        discipleMakers: tract.disciple_makers || 0,
        simpleChurches: tract.simple_churches || 0,
        legacyChurches: tract.legacy_churches || 0,
        countyfp: tract.countyfp || null,
        updatedAt: tract.updated_at,
        updatedBy: tract.updated_by
      };
    });
    
    // Ensure all data follows the correct structure:
    // - Population data comes from GeoJSON files (already handled in frontend)
    // - Disciple-makers, simple churches, and legacy churches start at 0
    // - % far from God calculation is handled in frontend based on 85% starting point
    
    res.json(formattedTractData);
  });
});

// Update tract data
app.post('/api/tract-data/update', requireRole(['state', 'county', 'tract']), (req, res) => {
  const { tractId, population, discipleMakers, simpleChurches, legacyChurches } = req.body;
  const { email } = req.user;
  
  if (!tractId) {
    return res.status(400).json({ error: 'Tract ID is required' });
  }
  
  const now = new Date().toISOString();
  
  db.run(`
    INSERT OR REPLACE INTO tract_data 
    (tract_id, population, disciple_makers, simple_churches, legacy_churches, updated_at, updated_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [tractId, population || 0, discipleMakers || 0, simpleChurches || 0, legacyChurches || 0, now, email], function(err) {
    if (err) {
      console.error('Error updating tract data:', err);
      return res.status(500).json({ error: 'Failed to update tract data' });
    }
    
    res.json({ 
      success: true, 
      message: 'Tract data updated successfully',
      tractId,
      updatedAt: now,
      updatedBy: email
    });
  });
});

// Clear all tract data (state coordinators only)
app.delete('/api/tract-data/clear', requireRole(['state']), (req, res) => {
  db.run('DELETE FROM tract_data', [], function(err) {
    if (err) {
      console.error('Error clearing tract data:', err);
      return res.status(500).json({ error: 'Failed to clear tract data' });
    }
    
    res.json({ 
      success: true, 
      message: 'All tract data cleared successfully',
      deletedRows: this.changes
    });
  });
});

// Clear all coordinators except state coordinators
app.delete('/api/coordinators/clear', requireRole(['state']), (req, res) => {
  db.run('DELETE FROM users WHERE role IN ("county", "tract")', [], function(err) {
    if (err) {
      console.error('Error clearing coordinators:', err);
      return res.status(500).json({ error: 'Failed to clear coordinators' });
    }
    
    res.json({ 
      success: true, 
      message: 'All coordinators cleared successfully',
      deletedRows: this.changes
    });
  });
});

// Get disciple makers data (for map)
app.get('/api/disciple-makers', (req, res) => {
  // This endpoint returns county-level disciple makers data
  // For now, we'll calculate it from tract data
  db.all('SELECT * FROM tract_data', [], (err, tractData) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    
    const countyTotals = {};
    
    // Initialize all counties with 0 values
    Object.keys(COUNTY_FIPS_TO_NAME).forEach(countyFips => {
      countyTotals[COUNTY_FIPS_TO_NAME[countyFips]] = 0;
    });
    
    // Sum tract data into county totals
    tractData.forEach(tract => {
      // Extract county FIPS from tract ID
      const tractId = tract.tract_id;
      let countyFips = null;
      
      if (tractId.length === 11) {
        // Full FIPS code: extract county part (positions 3-5)
        countyFips = tractId.substring(2, 5);
      } else if (tractId.length === 6) {
        // Short tract code: need to map to county
        if (tractId === '000502') {
          countyFips = '113'; // McLean County
        } else if (tractId.startsWith('001')) {
          countyFips = '001'; // Adams County
        } else if (tractId.startsWith('003')) {
          countyFips = '003'; // Alexander County
        }
        // Add more mappings as needed
      }
      
      if (countyFips && COUNTY_FIPS_TO_NAME[countyFips]) {
        const countyName = COUNTY_FIPS_TO_NAME[countyFips];
        countyTotals[countyName] += tract.disciple_makers || 0;
      }
    });
    
    res.json(countyTotals);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API-only server - frontend is deployed separately
app.get('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
  // Setup test user if it doesn't exist
  setupTestUser();
}); 