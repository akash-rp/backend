const mysql = require("mysql2/promise");
const config = require("./config");
const pool = mysql.createPool(config);

async function query(sql, params) {
  try {
    const [rows, fields] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  query,
};
