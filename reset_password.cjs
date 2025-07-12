const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const newPassword = process.argv[2] || '#NPLIL';

bcrypt.hash(newPassword, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  
  const db = new sqlite3.Database('./auth.db');
  db.run('UPDATE users SET password_hash = ?, must_reset_password = 0 WHERE email = ?', 
    [hash, 'jziegenhorn@teamexpansion.org'], function(err) {
    if (err) {
      console.error('Error updating password:', err);
    } else {
      console.log(`Password reset successfully to ${newPassword}`);
    }
    db.close();
  });
}); 