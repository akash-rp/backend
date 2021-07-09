const db = require("../db/db");
const nanoid = require("nanoid");
const { default: axios } = require("axios");

async function getServers(req, res) {
  if (!req.body.userId) {
    res.status(400).json({
      error: "Invalid JSON",
    });
    return;
  }
  const userId = req.body.userId;
  try {
    data = await db.query(
      "SELECT name,inet_ntoa(ip),provider,serverid FROM servers WHERE userid = ? ",
      [userId]
    );
    console.log(data);
    data.forEach((element) => {
      element["ip"] = element["inet_ntoa(ip)"];
      delete element["inet_ntoa(ip)"];
    });
    console.log("Here");
    console.log(data);
    if (data.length ==[]){
      res.json({
        error: "something went wrong",
      })
      return
    }
    res.json(data);
  } catch (error) {
    res.json({
      error: "something went wrong",
    });
  }
}

async function addServer(req, res) {
  const data = req.body;
  try {
    // INSERT into servers value (?,?,?,?,?)
    result = await db.query(
      "INSERT into servers value (?,?,?,?,INET_ATON(?))",
      [nanoid.nanoid(12), data.userid, data.name, data.provider, data.ip]
    );

    res.json(result);
  } catch (error) {
    if (error.errno === 1062) {
      res.json({ error: "IP address already exists" });
      return;
    }
    res.json({
      error: error,
    });
  }
}

async function server(req, res) {
  const serverid = req.params.serverid;
  try {
    // INSERT into servers value (?,?,?,?,?)
    result = await db.query(
      "SELECT inet_ntoa(ip) from servers where serverid = ?",
      [serverid]
    );
    result = result[0];
    result["ip"] = result["inet_ntoa(ip)"];
    delete result["inet_ntoa(ip)"];
    let response = await axios.get(
      "http://" + result.ip + ":8081/serverstats",
      { timeout: 5000 }
    );
    res.json(response.data);
  } catch (error) {
    if (error.errno === 1062) {
      res.json({ error: "IP address already exists" });
      return;
    }
    res.json({
      error: "Server not found",
    });
  }
}

module.exports = { getServers, addServer, server };
