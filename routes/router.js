const express = require("express");
const fetch = require("node-fetch");

const fusionauth = require("../connectors/fusionauth");
const router = express.Router();

const users = require("./users");
const servers = require("./servers");
const sites = require("./sites");
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

router.post("/site/:siteid/changePrimary", (req, res) => {
  sites.changePrimary(req, res);
});

router.post("/site/:siteid/changePHP", (req, res) => {
  sites.changePHP(req, res);
});

router.get("/site/:siteid/getPHPini", (req, res) => {
  sites.getPHPini(req, res);
});

router.post("/site/:siteid/updatePhpIni", (req, res) => {
  sites.updatePHPini(req, res);
});

router.post("/site/:siteid/updatelocalbackup", (req, res) => {
  sites.updateLocalBackup(req, res);
});

router.get("/site/:siteid/localondemandbackup", (req, res) => {
  sites.takeLocalOndemandBackup(req, res);
});

router.get("/site/:siteid/localbackuplist/:mode", (req, res) => {
  sites.getLocalBackupList(req, res);
});

router.post("/site/:siteid/restorelocalbackup", (req, res) => {
  sites.restoreLocalBackup(req, res);
});

router.post("/site/:siteid/createstaging", (req, res) => {
  sites.createStaging(req, res);
});

router.get("/site/:siteid/getdbtables", (req, res) => {
  sites.getDatabaseTables(req, res);
});
router.get("/site/:siteid/delete", (req, res) => {
  sites.deleteSite(req, res);
});

router.post("/site/:siteid/sync", (req, res) => {
  sites.syncChanges(req, res);
});
router.get("/staging/:siteid", (req, res) => {
  sites.getStagingSite(req, res);
});
router.get("/staging/:siteid/delete", (req, res) => {
  sites.deleteStaging(req, res);
});
router.get("/asdf", (req, res) => {
  res.redirect("/servers");
});
router.post("/ssh/add/:siteid", (req, res) => {
  sites.addSSHkey(req, res);
});
router.post("/ssh/remove/:siteid", (req, res) => {
  sites.removeSSHkey(req, res);
});
module.exports = router;
