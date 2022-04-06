const mongodb = require("mongodb");
const mongoClient = require("mongodb").MongoClient;

/** @type {mongodb.MongoClient} */
let db;
// let db;
// async function mongo() {
//   console.log("connecting");
//   const client = new MongoClient("mongodb://localhost:27017");
//   db = await client.connect();
// }

function connect(callback) {
  mongoClient.connect("mongodb://localhost:27017", (err, dbref) => {
    db = dbref;

    console.log("connected to database");
    callback();
  });
}
function get() {
  return db;
}

function close() {
  mongodb.close();
}

module.exports = {
  connect,
  get,
  close,
};
