const express = require("express");
const fetch = require("node-fetch");

const fusionauth = require("../connectors/fusionauth");
const router = express.Router();

const users = require("./users");
const servers = require("./servers");
const sites = require("./sites");
const ssh = require("./ssh");
const db = require("../db/mongo");

const { customAlphabet } = require("nanoid");
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
  servers.serverDetails(req, res);
});

router.get("/sitesummary/:serverid", (req, res) => {
  sites.getSiteSummary(req, res);
});

router.post("/addsite/:serverid", (req, res) => {
  sites.addSite(req, res);
});

router.get("/server/:serverid/sites", (req, res) => {
  sites.getSitesOfServer(req, res);
});

router.get("/site/:siteid", (req, res) => {
  sites.getOneSite(req, res);
});

router.post("/site/:siteid/addDomain", (req, res) => {
  sites.addDomainToSite(req, res);
});

router.post("/site/:siteid/deleteDomain", (req, res) => {
  sites.deleteDomain(req, res);
});

router.post("/site/:siteid/changeRoute", (req, res) => {
  sites.changeRoute(req, res);
});

router.post("/site/:siteid/wildcard", (req, res) => {
  sites.changeWildcard(req, res);
});

router.post("/site/:siteid/changePrimary",(req,res)=>{
  sites.changePrimary(req,res)
})
module.exports = router;
