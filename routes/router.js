const express = require("express");

const router = express.Router();

const Servers = require("../server/server");
const Site = require("../Site/site");
const Backup = require("../Site/backup");
const Domain = require("../Site/domain");
const PHP = require("../Site/php");
const SSL = require("../Site/ssl");
const Staging = require("../Site/staging");
const SSH = require("../Site/ssh");
const Firewall = require("../Site/firewall");
const Security = require("../server/security");
const SystemUsers = require("../server/SystemUsers");
const SshKeys = require("../server/SshKey");
const Users = require("../user/user");
const Dns = require("../dns-management/dns");
const { registrationFlow } = require("../auth/login");
const { default: axios } = require("axios");
const Integration = require("../user/Integration");

router.use((req, res, next) => {
  if (req.route != "/login") {
    if (req.headers.cookie == undefined) {
      return res.status(401).send();
    }
    console.time("whoami");
    axios
      .get("http://localhost:4000/sessions/whoami", {
        headers: { Cookie: req.headers.cookie },
      })
      .then((user) => {
        req.user = user.data.identity;
        next();
      })
      .catch((err) => {
        console.log(err);
        res.status(401).send();
      });
    console.timeEnd("whoami");
  } else {
    next();
  }
});

router.post("/servers", Servers.get);
router.post("/addserver", Servers.add);
router.get("/server/:serverid", Servers.details);
router.get("/server/:serverid/sites", Servers.sites);
router.get("/server/:serverid/health", Servers.health);
router.get(
  "/server/:serverid/health/:metrics/:duration",
  Servers.serverIndividualHealthMetris
);
router.get("/server/:serverid/service/status", Servers.serviceStatus);
router.post(
  "/server/:serverid/service/:control/:process",
  Servers.serviceControl
);
router.post("/server/:serverid/rename", Servers.renameServerName);
router.post("/server/:serverid/changeip", Servers.changeServerIp);

router.post("/addsite/:serverid", Site.add);
router.get("/site/:siteid", Site.details);
router.post("/site/:siteid/delete", Site.delete);
router.post("/site/:siteid/changeOwner", Site.changeOwnership);
router.post("/site/:siteid/auth/enable", Site.enableSiteAuth);
router.post("/site/:siteid/auth/disable", Site.disableSiteAuth);
router.post("/site/:siteid/fixPermission", Site.fixSitePermission);
router.post("/site/:siteid/searchReplace", Site.searchAndReplace);
router.post("/site/:siteid/clone", Site.cloneSite);
router.get("/site/:siteid/plugin/list", Site.getPluginList);
router.get("/site/:siteid/theme/list", Site.getThemeList);
router.post("/site/:siteid/plugins", Site.updatePlugins);
router.post("/site/:siteid/themes", Site.updateThemes);

router.post("/site/:siteid/addDomain", Domain.add);
router.post("/site/:siteid/deleteDomain", Domain.delete);
router.post("/site/:siteid/changeRoute", Domain.changeRoute);
router.post("/site/:siteid/wildcard", Domain.changeWildcard);
router.post("/site/:siteid/changePrimary", Domain.changePrimary);

router.post("/site/:siteid/changePHP", PHP.PhpMiddlware, PHP.changeVersion);
router.get("/site/:siteid/getPHPini", PHP.PhpMiddlware, PHP.getPHPini);
router.get(
  "/site/:siteid/getPHPsettings",
  PHP.PhpMiddlware,
  PHP.getPHPsettings
);
router.post(
  "/site/:siteid/updatePHPsettings",
  PHP.PhpMiddlware,
  PHP.updatePHPsettings
);
router.post("/site/:siteid/updatePhpIni", PHP.PhpMiddlware, PHP.updatePHPini);

router.post("/site/:siteid/updatelocalbackup", Backup.updateLocalBackup);
router.post("/site/:siteid/localondemandbackup", Backup.takeOndemand);
router.get("/site/:siteid/localbackuplist/:mode", Backup.getLocalBackupList);
router.post("/site/:siteid/restorelocalbackup", Backup.restoreLocalBackup);
router.get("/site/:siteid/backup/download/:mode/:id", Backup.downloadBackup);

router.post("/site/:siteid/createstaging", Staging.create);
router.get("/site/:siteid/getdbtables", Staging.getDB);
router.post("/site/:siteid/sync", Staging.sync);
router.get("/staging/:siteid", Staging.get);
router.get("/staging/:siteid/delete", Staging.delete);

router.post("/ssh/add/:siteid", SSH.add);
router.post("/ssh/remove/:siteid", SSH.remove);

router.get(
  "/server/:serverid/sshKeys",
  SshKeys.SshKeyMiddlware,
  SshKeys.getSshKeys
);
router.post(
  "/server/:serverid/sshKey/add",
  SshKeys.SshKeyMiddlware,
  SshKeys.addSshKey
);
router.post(
  "/server/:serverid/sshKey/remove",
  SshKeys.SshKeyMiddlware,
  SshKeys.deleteSshKey
);

router.post("/cert/add/:siteid", SSL.add);
router.post("/site/:siteid/enforceHttps", SSL.enforceHttps);

router.post("/site/:siteid/firewall/sevenG/update", Firewall.update7Gwaf);
router.post("/site/:siteid/firewall/modsec/update", Firewall.updateModsec);

router.get("/server/:serverid/ufw/rules", Security.getUfwRules);
router.post("/server/:serverid/ufw/delete", Security.deleteUfwRule);
router.post("/server/:serverid/ufw/add", Security.addUfwRule);
router.get("/server/:serverid/ssh/users", Security.getSshUsers);
router.post("/server/:serverid/ssh/kill", Security.killSshUsers);
router.get("/server/:serverid/fail2ban/ip", Security.getBannedips);
router.post("/server/:serverid/fail2ban/unban", Security.unbanIp);

router.get(
  "/server/:serverid/users",
  SystemUsers.SystemUserMiddlware,
  SystemUsers.getSystemUsers
);
router.post(
  "/server/:serverid/users/changePassword",
  SystemUsers.SystemUserMiddlware,
  SystemUsers.changeUserPassword
);
router.post(
  "/server/:serverid/users/delete",
  SystemUsers.SystemUserMiddlware,
  SystemUsers.deleteSystemUser
);

router.post("/user", Users.getUser);
router.post("/integration/add/:service", Integration.addApiKey);
router.get("/integration", Integration.getApiKeys);
router.get("/integration/:service", Integration.getServiceApiKeys);

router.post("/integration/cloudflare", Dns.getCloudflareApis);
router.get("/auth/register", registrationFlow);

module.exports = router;
