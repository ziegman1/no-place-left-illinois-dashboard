const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

bcrypt.hash('Iluvlinz1!#', 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  
  const db = new sqlite3.Database('./backend/auth.db');
  db.run('INSERT INTO users (email, password_hash, must_reset_password, role) VALUES (?, ?, 0, ?)', 
    ['jziegenhorn@teamexpansion.org', hash, 'state'], function(err) {
    if (err) {
      console.error('Error creating user:', err);
    } else {
      console.log('User created successfully!');
      console.log('Email: jziegenhorn@teamexpansion.org');
      console.log('Password: Iluvlinz1!#');
      console.log('Role: state');
    }
    db.close();
  });
}); 