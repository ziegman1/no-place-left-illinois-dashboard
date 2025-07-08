require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

// SQLite setup
const db = new sqlite3.Database('./auth.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    must_reset_password INTEGER DEFAULT 1,
    role TEXT DEFAULT 'coordinator',
    countyfp TEXT,
    tractid TEXT
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
    disciple_makers INTEGER DEFAULT 0,
    simple_churches INTEGER DEFAULT 0,
    legacy_churches INTEGER DEFAULT 0,
    updated_at DATETIME,
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

// Simple email notification function (replace with real email service in production)
function sendWelcomeEmail(email, name, tractId) {
  // In production, integrate with SendGrid, AWS SES, or similar
  console.log('='.repeat(60));
  console.log('WELCOME EMAIL SENT');
  console.log('='.repeat(60));
  console.log(`To: ${email}`);
  console.log(`Subject: Welcome to #NoPlaceLeft Illinois - Tract Coordinator Assignment`);
  console.log('');
  console.log(`Dear ${name},`);
  console.log('');
  console.log(`Welcome to the #NoPlaceLeft Illinois project!`);
  console.log('');
  console.log(`You have been assigned as the coordinator for census tract ${tractId}.`);
  console.log('');
  console.log(`Your login credentials:`);
  console.log(`Username: ${email}`);
  console.log(`Password: #NPLIL`);
  console.log('');
  console.log(`Please log in at http://localhost:5173 and change your password on first login.`);
  console.log('');
  console.log(`Thank you for serving with us!`);
  console.log('');
  console.log(`#NoPlaceLeft Illinois Team`);
  console.log('='.repeat(60));
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

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
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
  db.get('SELECT email FROM users WHERE countyfp = ? AND role = "county"', [countyfp], (err, coordinator) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ coordinator: coordinator ? coordinator.email : null });
  });
});

// Get coordinator for a tract
app.get('/api/coordinator/tract/:tractid', (req, res) => {
  const { tractid } = req.params;
  db.get('SELECT email FROM users WHERE tractid = ? AND role = "tract"', [tractid], (err, coordinator) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ coordinator: coordinator ? coordinator.email : null });
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
            // Update existing user's tract assignment
            db.run('UPDATE users SET tractid = ? WHERE email = ?', [tractId, coordinator.email], function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to update coordinator assignment' });
              }
              
              // Send welcome email
              sendWelcomeEmail(coordinator.email, coordinator.name, tractId);
              
              db.run('COMMIT');
              res.json({ 
                success: true, 
                message: 'Tract data updated and coordinator assigned successfully',
                coordinatorAssigned: true
              });
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
                sendWelcomeEmail(coordinator.email, coordinator.name, tractId);
                
                db.run('COMMIT');
                res.json({ 
                  success: true, 
                  message: 'Tract data updated and new coordinator created successfully',
                  coordinatorAssigned: true
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
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existingUser) {
      // Update existing user's county assignment and role
      db.run('UPDATE users SET countyfp = ?, role = "county" WHERE email = ?', [countyfp, email], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update coordinator assignment' });
        sendWelcomeEmail(email, name, countyfp);
        res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
      });
    } else {
      // Create new user
      bcrypt.hash('#NPLIL', 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Failed to hash password' });
        db.run('INSERT INTO users (email, password_hash, must_reset_password, role, countyfp) VALUES (?, ?, 1, "county", ?)', [email, hash, countyfp], function(err) {
          if (err) return res.status(500).json({ error: 'Failed to create coordinator account' });
          sendWelcomeEmail(email, name, countyfp);
          res.json({ success: true, message: 'Coordinator assigned and welcome email sent' });
        });
      });
    }
  });
});

// Clean up expired reset codes (run periodically)
function cleanupExpiredCodes() {
  db.run('DELETE FROM password_reset_codes WHERE expires_at < datetime("now") OR used = 1');
}

// Clean up expired codes every hour
setInterval(cleanupExpiredCodes, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
}); 