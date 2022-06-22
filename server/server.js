const { customAlphabet } = require("nanoid");
const { default: axios } = require("axios");
const mongodb = require("../db/mongo");

let isIP;
(async () => {
  isIP = await import("is-ip");
})();

const nanoid = customAlphabet(
  "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);
async function getServers(req, res) {
  try {
    // data = await db.query(
    //   "SELECT name,inet_ntoa(ip),provider,serverid FROM servers WHERE userid = ? ",
    //   [userId]
    // );
    const data = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .find({ userId: req.user.id })
      .toArray();
    if (data.length === 0) {
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
  let id = nanoid();
  let insertData = {
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
  const { serverid } = req.params;
  try {
    // INSERT into servers value (?,?,?,?,?)
    const result = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    let sites = mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ userId: req.user.id, serverId: serverid })
      .limit(5)
      .toArray();
    if (!result) {
      throw Error;
    }
    let stats = axios.get(`http://${result.ip}:8081/serverstats`, {
      timeout: 5000,
    });
    let all = await Promise.all([sites, stats]);
    let final = { sites: all[0], stats: all[1].data, ...result };

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
  const { serverid } = req.params;
  try {
    const server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne(
        { userId: req.user.id, serverId: serverid },
        { projection: { _id: 0, ip: 1 } }
      );
    if (!server) {
      res.status(404).json({ error: "server not found" });
    }
    let metrics = await axios.get(`http://${server.ip}:8081/metrics`);
    res.json(metrics.data);
  } catch {
    res.status(400).send();
  }
}

async function serverIndividualHealthMetris(req, res) {
  const { serverid } = req.params;
  const { metrics } = req.params;
  const { duration } = req.params;
  try {
    const server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne(
        { userId: req.user.id, serverId: serverid },
        { projection: { _id: 0, ip: 1 } }
      );
    if (!server) {
      res.status(404).json({ error: "server not found" });
    }
    const result = await axios.get(
      `http://${server.ip}:8081/metrics/${metrics
        .charAt(0)
        .toUpperCase()}${metrics.slice(1)}/${duration}`
    );

    res.json(result.data);
  } catch (err) {
    console.log(err);
    res.status(400).send();
  }
}

async function serviceStatus(req, res) {
  const { serverid } = req.params;
  try {
    const server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne(
        { userId: req.user.id, serverId: serverid },
        { projection: { _id: 0, ip: 1 } }
      );
    if (!server) {
      return res.status(404).json({ error: "server not found" });
    }
    let service = await axios.get(`http://${server.ip}:8081/service/status`);
    res.json(service.data);
  } catch {
    res.status(404).json({ error: "server not found" });
  }
}

async function serviceControl(req, res) {
  const { serverid } = req.params;
  const { control } = req.params;
  const { process } = req.params;
  try {
    const server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne(
        { userId: req.user.id, serverId: serverid },
        { projection: { _id: 0, ip: 1 } }
      );
    if (!server) {
      return res.status(404).json({ error: "server not found" });
    }
    let service = await axios.post(
      `http://${server.ip}:8081/service/${control}/${process}`,
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

async function renameServerName(req, res) {
  const { serverid } = req.params;
  const { body } = req;
  try {
    const result = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOneAndUpdate(
        {
          userID: req.user.id,
          serverId: serverid,
        },
        { $set: { name: body.name } },
        {
          returnDocument: "after",
        }
      );
    res.json(result.value);
  } catch (err) {
    console.log(err);
    res.status(400).send();
  }
}

async function changeServerIp(req, res) {
  const { serverid } = req.params;
  const { body } = req;
  try {
    if (!isIP.isIP(body.ip)) {
      return res
        .status(400)
        .json({ error: { field: "ip", message: "Invalid IP" } });
    }

    const checkIp = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ ip: body.ip });

    if (checkIp) {
      return res
        .status(404)
        .json({ error: { field: "ip", message: "IP already exists" } });
    }
    const result = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOneAndUpdate(
        {
          userId: req.user.id,
          serverId: serverid,
        },
        { $set: { ip: body.ip } },
        {
          returnDocument: "after",
        }
      );
    res.json(result.value);
  } catch (err) {
    console.log(err);
    res.status(400).send();
  }
}

module.exports = {
  get: getServers,
  add: addServer,
  details: serverDetails,
  sites: getSitesOfServer,
  health: serverHealth,
  serverIndividualHealthMetris,
  serviceStatus,
  serviceControl,
  renameServerName,
  changeServerIp,
};

async function getSitesOfServer(req, res) {
  try {
    let serverid = req.params.serverid;
    const result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ userId: req.user.id, serverId: serverid })
      .toArray();
    const site = { [serverid]: result };
    res.json(site);
  } catch (err) {
    res.status(400).json();
  }
}
