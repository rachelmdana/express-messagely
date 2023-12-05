/** User class for message.ly */

const db = require('../db');
const bcrypt = require('bcrypt');
const ExpressError = require('../expressError');
const { BCRYPT_WORK_FACTOR } = require('../config');

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
      RETURNING username, password, first_name, last_name, phone, join_at`,
      [username, hashedPassword, first_name, last_name, phone]
    );
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    // console.log('Authenticating user:', username);
    try {
      const user = await db.query('SELECT * FROM users WHERE username = $1', [username]);

      if (user.rows.length === 1) {
        const isValidPassword = await bcrypt.compare(password, user.rows[0].password);

        if (isValidPassword) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error during authentication:', error);
      
      throw error;
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    // console.log('Updating login timestamp for user:', username);
    const result = await db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE username = $1 RETURNING username',
      [username]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`No such user: ${username}`, 404);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(
      'SELECT username, first_name, last_name, phone FROM users ORDER BY username'
    );
    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users WHERE username = $1`,
      [username]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`No such user: ${username}`, 404);
    }
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const sqlQuery = `SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at, u.first_name, u.last_name, u.phone
    FROM messages AS m
    JOIN users AS u ON m.to_username = u.username
    WHERE from_username = $1`;

    // console.log('SQL Query:', sqlQuery);

    const result = await db.query(sqlQuery, [username]);

  //  console.log('Result:', result.rows);

    return result.rows.map(row => ({
    id: row.id,
    to_user: {
      username: row.to_username,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
    },
    body: row.body,
    sentAt: row.sent_at,
    readAt: row.read_at,
    }));
  }
 

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at, u.first_name, u. last_name, u.phone
      FROM messages AS m
      JOIN users AS u ON m.from_username = u.username
      WHERE to_username = $1`,
      [username]
    );

    return result.rows.map(row => ({
      id: row.id,
      from_user: {
        username: row.from_username,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone
      },
      body: row.body,
      sentAt: row.sent_at,
      readAt: row.read_at,
    }));
  }
}

module.exports = User;