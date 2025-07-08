const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

bcrypt.hash('#NPLIL', 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  
  const db = new sqlite3.Database('./backend/auth.db');
  db.run('UPDATE users SET password_hash = ?, must_reset_password = 1 WHERE email = ?', 
    [hash, 'jziegenhorn@teamexpansion.org'], function(err) {
    if (err) {
      console.error('Error updating password:', err);
    } else {
      console.log('Password reset successfully to #NPLIL');
    }
    db.close();
  });
}); 