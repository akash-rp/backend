const mongoClient = require("mongodb").MongoClient;
let mongodb;
// let db;
// async function mongo() {
//   console.log("connecting");
//   const client = new MongoClient("mongodb://localhost:27017");
//   db = await client.connect();
// }

function connect(callback) {
  mongoClient.connect("mongodb://localhost:27017", (err, db) => {
    mongodb = db;
    callback();
  });
}
function get() {
  return mongodb;
}

function close() {
  mongodb.close();
}

module.exports = {
  connect,
  get,
  close,
};
