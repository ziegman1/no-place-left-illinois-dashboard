const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function setupTestUser() {
  const db = new sqlite3.Database(path.join(__dirname, 'auth.db'));
  
  const email = 'test@example.com';
  const password = 'password123';
  const role = 'state';
  
  // Check if test user already exists
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      console.error('Error checking for test user:', err);
      db.close();
      return;
    }
    
    if (user) {
      console.log('Test user already exists');
      db.close();
      return;
    }
    
    try {
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Insert the test user
      db.run(
        'INSERT INTO users (email, password_hash, must_reset_password, role) VALUES (?, ?, 0, ?)',
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
  });
}

module.exports = setupTestUser; 