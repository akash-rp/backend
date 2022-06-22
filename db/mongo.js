const mongodb = require("mongodb");
const mongoClient = require("mongodb").MongoClient;

/** @type {mongodb.MongoClient} */
let db;

function connect(callback) {
  mongoClient.connect("mongodb://localhost:27017", (err, dbref) => {
    db = dbref;

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
