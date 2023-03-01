const mongodb = require("../db/mongo");
const { default: axios } = require("axios");
const { v4: uuidv4 } = require("uuid");
const domainFile = require("../Site/domain.js");
const { searchForUrl } = require("../Site/domain.js");

async function addSite(req, res) {
  try {
    let serverid = req.params.serverid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .findOne(
        { userId: req.user.id, serverId: serverid },
        { projection: { _id: 0, ip: 1 } }
      );

    if (!result) {
      throw Error;
    }

    let sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ userId: req.user.id, serverId: serverid })
      .toArray();
    const data = req.body;
    let { url, routing, isSubDomain } = domainFile.modifyDomain(data.url);
    // if (subDomains && subDomains.length > 0) {
    //   url =
    //     subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
    // } else {
    //   url = domain + "." + topLevelDomains.join(".");
    // }

    // Check for same domain across all app and also on wildcard domain
    if (searchForUrl(url, sites)) {
      return res.status(400).json("Url already exists");
    }

    let dbCred = await axios.post(
      "http://" + result.ip + ":8081/wp/add",
      {
        appName: data.appName,
        userName: data.userName,
        domain: { url: url, isSubDomain: isSubDomain, routing: routing },
        title: data.title,
        adminUser: data.adminUser,
        adminPassword: data.adminPassword,
        adminEmail: data.adminEmail,
        subDomain: isSubDomain,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let id = uuidv4();
    const doc = {
      siteId: id,
      userId: req.user.id,
      user: data.userName,
      serverId: serverid,
      name: data.appName,
      php: data.php,
      ip: result.ip,
      db: dbCred.data,
      domain: {
        primary: {
          url: url,
          ssl: false,
          wildcard: false,
          isSubDomain: isSubDomain,
          routing: routing,
        },
        alias: [],
        redirect: [],
      },
      localbackup: {
        automatic: false,
        frequency: "Daily",
        time: {
          hour: "00",
          minute: "00",
          weekday: "Sunday",
          monthday: "00",
        },
        retention: {
          time: 1,
          type: "Day",
        },
        created: false,
      },
      staging: "",
      type: "live",
      firewall: {
        sevenG: {
          enabled: false,
          disable: [],
        },
        modsecurity: {
          enabled: false,
          paranoiaLevel: 1,
          anomalyThreshold: 5,
        },
      },
      authentication: false,
    };

    await mongodb.get().db("hosting").collection("sites").insertOne(doc);
    result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ userId: req.user.id, serverId: serverid })
      .toArray();
    let site = { [serverid]: result };
    res.json(site);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
    // res.status(400).json(err.response.data);
  }
}

async function getOneSite(req, res) {
  try {
    let siteid = req.params.siteid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!result) {
      return res.status(404).send();
    }
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
}

async function deleteSite(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, staging: 1, ip: 1 } }
      );
    if (!site) {
      throw "Not found";
    }
    let staging;
    let isStaging = false;
    if (site.staging !== "") {
      isStaging = true;
      staging = await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .findOne(
          { userId: req.user.id, siteId: site.staging },
          { projection: { _id: 0, name: 1, user: 1 } }
        );
    }
    await axios.post(
      "http://" + site.ip + ":8081/deleteSite",
      JSON.stringify({
        main: { user: site.user, name: site.name },
        staging: { ...staging },
        isStaging: isStaging,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .deleteOne({ siteId: siteid });
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .deleteOne({ siteId: site.staging });
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(404).json("something went wrong");
  }
}

async function getPluginList(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, ip: 1 } }
      );
    let result = await axios.get(
      "http://" + site.ip + ":8081/plugin/list/" + site.user + "/" + site.name
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to fetch data" });
  }
}
async function getThemeList(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, ip: 1 } }
      );
    let result = await axios.get(
      "http://" + site.ip + ":8081/theme/list/" + site.user + "/" + site.name
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to fetch data" });
  }
}

async function updatePlugins(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, ip: 1 } }
      );
    let postData = [];
    for (let name of data.names) {
      postData.push({ name: name, operation: data.operation });
    }
    let result = await axios.post(
      "http://" + site.ip + ":8081/ptoperation/" + site.user + "/" + site.name,
      {
        plugins: postData,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to perform operation" });
  }
}

async function updateThemes(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, ip: 1 } }
      );
    if (data.operation !== "activate" && data.operation !== "update") {
      return res.status(404).json("Invalid opertaion");
    }
    if (data.operation === "activate") {
      if (data.names.length > 1) {
        return res.status(404).json("Invalid name field");
      }
    }
    let postData = [];
    for (let name of data.names) {
      postData.push({ name: name, operation: data.operation });
    }
    let result = await axios.post(
      "http://" + site.ip + ":8081/ptoperation/" + site.user + "/" + site.name,
      {
        themes: postData,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to perform operation" });
  }
}

async function changeOwnership(req, res) {
  let siteid = req.params.siteid;
  let body = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    await axios.post("http://" + site.ip + ":8081/changeOwner", {
      app: site.name,
      newUser: body.user,
      oldUser: site.user,
      backup: site.localbackup,
    });
    let modifiedSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { userId: req.user.id, siteId: siteid },
        { $set: { user: body.user } },
        { returnDocument: "after" }
      );
    return res.json(modifiedSite.value);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function enableSiteAuth(req, res) {
  let siteid = req.params.siteid;
  let body = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    await axios.post("http://" + site.ip + ":8081/site/auth/add", {
      name: site.name,
      auth: {
        user: body.username,
        password: body.password,
      },
    });
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { userId: req.user.id, siteId: siteid },
        {
          $set: {
            authentication: true,
          },
        },
        {
          returnDocument: "after",
        }
      );
    return res.send(site.value);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}
async function disableSiteAuth(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    await axios.post(
      "http://" + site.ip + ":8081/site/auth/delete/" + site.name
    );
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { userId: req.user.id, siteId: siteid },
        {
          $set: {
            authentication: false,
          },
        },
        {
          returnDocument: "after",
        }
      );
    return res.send(site.value);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function fixSitePermission(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    await axios.post("http://" + site.ip + ":8081/site/fixPermission", {
      name: site.name,
      user: site.user,
    });
    return res.send();
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function searchAndReplace(req, res) {
  let siteid = req.params.siteid;
  let body = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).json("Site not found");
    }
    await axios.post("http://" + site.ip + ":8081/searchAndReplace", {
      search: body.search,
      replace: body.replace,
      name: site.name,
      user: site.user,
    });
    return res.status(200).send();
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function cloneSite(req, res) {
  let siteid = req.params.siteid;
  let body = req.body;
  try {
    let OriginalSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        {
          projection: {
            _id: 0,
            ip: 1,
            serverId: 1,
            php: 1,
            firewall: 1,
            authentication: 1,
            userId: 1,
          },
        }
      );
    if (!OriginalSite) {
      return res.status(404).send();
    }
    let cloneSiteDb = await axios.post(
      "http://" + OriginalSite.ip + ":8081/site/clone",
      {
        ...body,
      }
    );
    let id = uuidv4();
    let doc = {
      name: body.cloneSite.name,
      user: body.cloneSite.user,
      siteId: id,
      ...OriginalSite,
      db: cloneSiteDb.data,
      domain: {
        primary: {
          url: body.cloneSite.domain.url,
          ssl: false,
          wildcard: false,
          isSubDomain: body.cloneSite.domain.isSubDomain,
          routing: body.cloneSite.domain.routing,
        },
        alias: [],
        redirect: [],
      },
      localbackup: {
        automatic: false,
        frequency: "Daily",
        time: {
          hour: "00",
          minute: "00",
          weekday: "Sunday",
          monthday: "00",
        },
        retention: {
          time: 1,
          type: "Day",
        },
        created: false,
      },
      staging: "",
      type: "live",
    };
    await mongodb.get().db("hosting").collection("sites").insertOne(doc);
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ userId: req.user.id, serverId: OriginalSite.serverId })
      .toArray();
    let site = { [OriginalSite.serverId]: result };
    return res.json(site);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

module.exports = {
  add: addSite,
  details: getOneSite,
  delete: deleteSite,
  updatePlugins,
  updateThemes,
  getPluginList,
  getThemeList,
  changeOwnership,
  enableSiteAuth,
  disableSiteAuth,
  fixSitePermission,
  searchAndReplace,
  cloneSite,
};
