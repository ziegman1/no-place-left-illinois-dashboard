const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'backend/auth.db'));

async function createTestUser() {
  const email = 'test@example.com';
  const password = 'password123';
  const role = 'state';
  
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert the user
    db.run(
      'INSERT OR REPLACE INTO users (email, password_hash, must_reset_password, role) VALUES (?, ?, 0, ?)',
      [email, passwordHash, role],
      function(err) {
        if (err) {
          console.error('Error creating test user:', err);
        } else {
          console.log('Test user created successfully!');
          console.log('Email:', email);
          console.log('Password:', password);
          console.log('Role:', role);
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    db.close();
  }
}

createTestUser(); 