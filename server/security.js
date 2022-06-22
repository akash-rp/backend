const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

/** @type {import("express").RequestHandler} */
async function getUfwRules(req, res) {
  let serverid = req.params.serverid;

  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (server === undefined) {
      return res.status(404).send();
    }
    let result = await axios.get("http://" + server.ip + ":8081/ufw/rules", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.json(result.data);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function deleteUfwRule(req, res) {
  let serverid = req.params.serverid;
  let body = req.body;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (!server) {
      return res.status(404).json("Server not found");
    }
    let result = await axios.post(
      "http://" + server.ip + ":8081/ufw/delete",
      {
        index: body.index,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function addUfwRule(req, res) {
  let serverid = req.params.serverid;
  let body = req.body;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (!server) {
      return res.status(404).send();
    }
    let result = await axios.post(
      "http://" + server.ip + ":8081/ufw/add",
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function getSshUsers(req, res) {
  let serverid = req.params.serverid;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (!server) {
      return res.status(404).send();
    }
    let result = await axios.get("http://" + server.ip + ":8081/ssh/users", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send;
  }
}

async function killSshUsers(req, res) {
  let serverid = req.params.serverid;
  let body = req.body;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (!server) {
      return res.status(404).send();
    }
    let result = await axios.post(
      "http://" + server.ip + ":8081/ssh/kill",
      {
        user: body.id,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function getBannedips(req, res) {
  let serverid = req.params.serverid;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (!server) {
      return res.status(404).send();
    }
    let result = await axios.get("http://" + server.ip + ":8081/fail2ban/ip", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}
async function unbanIp(req, res) {
  let serverid = req.params.serverid;
  let body = req.body;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne({ userId: req.user.id, serverId: serverid });
    if (!server) {
      return res.status(404).send();
    }
    let result = await axios.post(
      "http://" + server.ip + ":8081/fail2ban/unban",
      {
        ip: body.ip,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

module.exports = {
  getUfwRules,
  deleteUfwRule,
  addUfwRule,
  getSshUsers,
  killSshUsers,
  getBannedips,
  unbanIp,
};
