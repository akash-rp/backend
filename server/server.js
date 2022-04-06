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
    sites = mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .limit(5)
      .toArray();
    result = result[0];
    if (!result) {
      throw Error;
    }
    stats = axios.get("http://" + result.ip + ":8081/serverstats", {
      timeout: 5000,
    });
    all = await Promise.all([sites, stats]);
    final = { sites: all[0], stats: all[1].data };

    // sites = sites.data;
    // sites = { sites: { ...sites } };
    // response = Object.assign(response.data, sites);
    res.json(final);
  } catch (error) {
    console.log(error.message);
    console.log(error.request);
    res.status(404).json({
      error: "Server not found",
    });
  }
}

async function serverHealth(req, res) {
  const serverid = req.params.serverid;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ serverId: serverid }, { projection: { _id: 0, ip: 1 } });
    if (!server) {
      res.status(404).json({ error: "server not found" });
    }
    metrics = await axios.get("http://" + server.ip + ":8081/metrics");
    res.json(metrics.data);
  } catch {
    res.status(404).json({ error: "server not found" });
  }
}
async function serviceStatus(req, res) {
  const serverid = req.params.serverid;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ serverId: serverid }, { projection: { _id: 0, ip: 1 } });
    if (!server) {
      return res.status(404).json({ error: "server not found" });
    }
    service = await axios.get("http://" + server.ip + ":8081/service/status");
    res.json(service.data);
  } catch {
    res.status(404).json({ error: "server not found" });
  }
}

async function serviceControl(req, res) {
  const serverid = req.params.serverid;
  const control = req.params.control;
  const process = req.params.process;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ serverId: serverid }, { projection: { _id: 0, ip: 1 } });
    if (!server) {
      return res.status(404).json({ error: "server not found" });
    }
    service = await axios.post(
      "http://" + server.ip + ":8081/service/" + control + "/" + process,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(service.data);
  } catch (error) {
    console.log(error);
    res.status(400).end();
  }
}

module.exports = {
  get: getServers,
  add: addServer,
  details: serverDetails,
  sites: getSitesOfServer,
  health: serverHealth,
  serviceStatus: serviceStatus,
  serviceControl,
};

async function getSitesOfServer(req, res) {
  try {
    serverid = req.params.serverid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .toArray();
    let site = { [serverid]: result };
    res.json(site);
  } catch (err) {
    res.status(400).json();
  }
}
