const express = require("express");

const router = express.Router();

const users = require("../Identity/users");
const Servers = require("../server/server");
const Site = require("../Site/site");
const Backup = require("../Site/backup");
const Domain = require("../Site/domain");
const PHP = require("../Site/php");
const SSL = require("../Site/ssl");
const Staging = require("../Site/staging");
const SSH = require("../Site/ssh");

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
  Servers.get(req, res);
});

router.post("/userdetails", (req, res) => {
  users.userdetails(req, res);
});

router.post("/addserver", (req, res) => {
  Servers.add(req, res);
});

router.get("/server/:serverid", (req, res) => {
  Servers.details(req, res);
});

router.get("/sitesummary/:serverid", (req, res) => {
  Site.summary(req, res);
});

router.post("/addsite/:serverid", (req, res) => {
  Site.add(req, res);
});

router.get("/server/:serverid/sites", (req, res) => {
  Servers.sites(req, res);
});

router.get("/site/:siteid", (req, res) => {
  Site.details(req, res);
});

router.post("/site/:siteid/addDomain", (req, res) => {
  Domain.add(req, res);
});

router.post("/site/:siteid/deleteDomain", (req, res) => {
  Domain.delete(req, res);
});

router.post("/site/:siteid/changeRoute", (req, res) => {
  Domain.changeRoute(req, res);
});

router.post("/site/:siteid/wildcard", (req, res) => {
  Domain.changeWildcard(req, res);
});

router.post("/site/:siteid/changePrimary", (req, res) => {
  Domain.changePrimary(req, res);
});

router.post("/site/:siteid/changePHP", (req, res) => {
  PHP.changeVersion(req, res);
});

router.get("/site/:siteid/getPHPini", (req, res) => {
  PHP.getPHPini(req, res);
});

router.post("/site/:siteid/updatePhpIni", (req, res) => {
  PHP.updatePHPini(req, res);
});

router.post("/site/:siteid/updatelocalbackup", (req, res) => {
  Backup.updateLocalBackup(req, res);
});

router.get("/site/:siteid/localondemandbackup", (req, res) => {
  Backup.takeOndemand(req, res);
});

router.get("/site/:siteid/localbackuplist/:mode", (req, res) => {
  Backup.getLocalBackupList(req, res);
});

router.post("/site/:siteid/restorelocalbackup", (req, res) => {
  Backup.restoreLocalBackup(req, res);
});

router.post("/site/:siteid/createstaging", (req, res) => {
  Staging.create(req, res);
});

router.get("/site/:siteid/getdbtables", (req, res) => {
  Staging.getDB(req, res);
});
router.get("/site/:siteid/delete", (req, res) => {
  Site.delete(req, res);
});

router.post("/site/:siteid/sync", (req, res) => {
  Staging.sync(req, res);
});
router.get("/staging/:siteid", (req, res) => {
  Staging.get(req, res);
});
router.get("/staging/:siteid/delete", (req, res) => {
  Staging.delete(req, res);
});
router.post("/ssh/add/:siteid", (req, res) => {
  SSH.add(req, res);
});
router.post("/ssh/remove/:siteid", (req, res) => {
  SSH.remove(req, res);
});
router.get("/site/:siteid/ptlist", (req, res) => {
  Site.getPluginsThemesList(req, res);
});
router.post("/site/:siteid/plugins", (req, res) => {
  Site.updatePlugins(req, res);
});
router.post("/site/:siteid/themes", (req, res) => {
  Site.updateThemes(req, res);
});
router.post("/cert/add/:siteid", (req, res) => {
  SSL.add(req, res);
});
router.post("/site/:siteid/enforceHttps", (req, res) => {
  SSL.enforceHttps(req, res);
});
router.get("/server/:serverid/health", (req, res) => {
  Servers.health(req, res);
});

router.get("/server/:serverid/service/status", (req, res) => {
  Servers.serviceStatus(req, res);
});

router.post("/server/:serverid/service/:control/:process", (req, res) => {
  Servers.serviceControl(req, res);
});

module.exports = router;
