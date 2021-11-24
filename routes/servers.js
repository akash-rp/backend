const db = require("../db/db");
const mongodb = require("../db/mongo");
const { customAlphabet } = require("nanoid");
const { default: axios } = require("axios");

const nanoid = customAlphabet(
  "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);
async function getServers(req, res) {
  if (!req.body.userId) {
    res.status(400).json({
      error: "Invalid JSON",
    });
    return;
  }
  const userId = req.body.userId;
  try {
    // data = await db.query(
    //   "SELECT name,inet_ntoa(ip),provider,serverid FROM servers WHERE userid = ? ",
    //   [userId]
    // );
    const data = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .find({ userId: userId })
      .toArray();
    if (data.length == 0) {
      res.json();
    } else res.json(data);
  } catch (error) {
    res.json({
      error: "Something went wrong",
    });
  }
}

async function addServer(req, res) {
  const data = req.body;
  // INSERT into servers value (?,?,?,?,?)
  // result = await db.query(
  //   "INSERT into servers value (?,?,?,?,INET_ATON(?))",
  //   [nanoid.nanoid(12), data.userid, data.name, data.provider, data.ip]
  // );
  id = nanoid();
  insertData = {
    serverId: id,
    userId: data.userId,
    name: data.name,
    provider: data.provider,
    ip: data.ip,
  };

  mongodb
    .get()
    .db("hosting")
    .collection("servers")
    .insertOne(insertData)
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      if (err.code == 11000) {
        res.json({ error: "IP address already exists" });
      }
    });
}

async function serverDetails(req, res) {
  const serverid = req.params.serverid;
  try {
    // INSERT into servers value (?,?,?,?,?)
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .find({ serverId: serverid })
      .toArray();

    result = result[0];
    console.log(result);
    if (!result) {
      throw Error;
    }
    let response = await axios.get(
      "http://" + result.ip + ":8081/serverstats",
      { timeout: 5000 }
    );
    let sites = await axios.get("http://" + result.ip + ":8081/sites", {
      timeout: 5000,
    });
    sites = sites.data;
    sites = { sites: { ...sites } };
    response = Object.assign(response.data, sites);
    res.json(response);
  } catch (error) {
    console.log(error);
    res.json({
      error: "Server not found",
    });
  }
}

module.exports = { getServers, addServer, serverDetails };
