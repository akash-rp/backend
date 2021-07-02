const express = require("express");
const fetch = require("node-fetch");

const fusionauth = require("../connectors/fusionauth");
const router = express.Router();

const users = require("./users");
const servers = require("./servers");
const ssh = require("./ssh");
// get the client

router.get("/", async function (req, res) {});

router.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400).json({
      error: "Invalid JSON",
    });
  }
  users.login(req, res);
});

router.post("/register", (req, res) => {
  if (
    !req.body.userData ||
    !req.body.userData.email ||
    !req.body.userData.password ||
    !req.body.userData.firstName ||
    !req.body.userData.lastName
  ) {
    res.status(400).json({ error: "invalid JSON" });
    return;
  }
  users.createAccount(req, res);
});

router.post("/servers", (req, res) => {
  servers.getServers(req, res);
});

router.post("/userdetails", (req, res) => {
  users.userdetails(req, res);
});

router.get("/ssh", (req, res) => {
  ssh.conn(req, res);
});

router.post("/addserver", (req, res) => {
  servers.addServer(req, res);
});

router.get("/server/:serverid", (req, res) => {
  servers.server(req, res);
});
module.exports = router;
