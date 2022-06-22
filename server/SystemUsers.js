const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function SystemUserMiddlware(req, res, next) {
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
    req.server = server;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function getSystemUsers(req, res) {
  try {
    let result = await axios.get("http://" + req.server.ip + ":8081/users", {
      headers: { "Content-Type": "application/json" },
    });
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function deleteSystemUser(req, res) {
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
      "http://" + server.ip + ":8081/users/delete",
      {
        user: body.user,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return res.json(result.data);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function changeUserPassword(req, res) {
  let body = req.body;
  try {
    await axios.post(
      "http://" + req.server.ip + ":8081/users/changePassword",
      {
        user: body.user,
        password: body.password,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    res.status(200).send();
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}
module.exports = {
  SystemUserMiddlware,
  getSystemUsers,
  changeUserPassword,
  deleteSystemUser,
};
