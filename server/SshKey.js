const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function SshKeyMiddlware(req, res, next) {
  let serverid = req.params.serverid;
  try {
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne(
        { userId: req.user.id, serverId: serverid },
        { projection: { _id: 0, ip: 1, sshKeys: 1 } }
      );
    if (!server) {
      return res.status(404).send();
    }
    req.server = server;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function getSshKeys(req, res) {
  res.json(req.server.sshKeys);
}

async function addSshKey(req, res) {
  let body = req.body;
  try {
    await axios.post(
      "http://" + req.server.ip + ":8081/sshKey/add",
      {
        user: body.user,
        key: body.key,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOneAndUpdate(
        { userId: req.user.id, serverId: req.params.serverid },
        {
          $push: {
            sshKeys: {
              label: body.label,
              user: body.user,
              key: body.key,
              addedOn: Date.now(),
            },
          },
        },
        {
          returnDocument: "after",
        }
      );
    res.json(server.value.sshKeys);
  } catch (error) {
    console.log(error);
    if (error.response.data) {
      return res.status(400).json(error.response.data);
    }
    return res.status(400).send();
  }
}

async function deleteSshKey(req, res) {
  let serverid = req.params.serverid;
  let body = req.body;
  try {
    await axios.post(
      "http://" + req.server.ip + ":8081/sshKey/remove",
      {
        user: body.user,
        key: body.key,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let server = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOneAndUpdate(
        { userId: req.user.id, serverId: serverid },
        {
          $pull: {
            sshKeys: { user: body.user, key: body.key, label: body.label },
          },
        },
        {
          returnDocument: "after",
        }
      );
    res.json(server.value.sshKeys);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

module.exports = {
  getSshKeys,
  SshKeyMiddlware,
  addSshKey,
  deleteSshKey,
};
