const mongodb = require("../db/mongo");
const { default: axios } = require("axios");
const { parseDomain, fromUrl } = require("parse-domain");
const { v4: uuidv4 } = require("uuid");

async function getSiteSummary(req, res) {
  try {
    serverid = req.params.serverid;
    const data = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .project({ name: 1, user: 1, "domain.primary.url": 1 })
      .toArray();
    res.json(data);
  } catch (err) {
    console.log(err);
    res.json({ error: "Something went wrong" });
  }
}

async function addSite(req, res) {
  try {
    serverid = req.params.serverid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("servers")
      .find({ serverId: serverid })
      .project({ ip: 1 })
      .toArray();
    result = result[0];
    if (!result) {
      throw Error;
    }

    let sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .toArray();
    const data = req.body;
    let url = data.url;
    const { subDomains, domain, topLevelDomains } = parseDomain(fromUrl(url));
    let isSubDomain = false;
    let routing = "none";

    //Remove www from the domain is present only on level 1 subdomain
    if (subDomains && subDomains.length > 0) {
      if (subDomains.length == 1) {
        if (subDomains[0] === "www") {
          url = domain + "." + topLevelDomains.join(".");
          routing = "www";
        } else {
          isSubDomain = true;
          url = subDomains[0] + "." + domain + "." + topLevelDomains.join(".");
        }
      } else {
        isSubDomain = true;
        url =
          subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
      }
    } else {
      url = domain + "." + topLevelDomains.join(".");
    }
    // if (subDomains && subDomains.length > 0) {
    //   url =
    //     subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
    // } else {
    //   url = domain + "." + topLevelDomains.join(".");
    // }
    // Check for same domain across all app and also on wildcard domain
    for (let site of sites) {
      if (site.domain.primary.url === url) {
        res.json({
          error: "This url is being used by other site",
        });
        return;
      }

      for (let domain of site.domain.alias) {
        if (domain.url === url) {
          res.json({
            error: "This url is being used by other site",
          });
          return;
        }
      }
      for (let domain of site.domain.redirect) {
        if (domain.url === url) {
          res.json({
            error: "This url is being used by other site",
          });
          return;
        }
      }
    }
    dbCred = await axios.post(
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
    id = uuidv4();
    const doc = {
      siteId: id,
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
    };

    await mongodb.get().db("hosting").collection("sites").insertOne(doc);
    result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
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
    siteid = req.params.siteid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid });
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(400).json();
  }
}

async function deleteSite(req, res) {
  siteid = req.params.siteid;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, staging: 1, ip: 1 } }
      );
    console.log(site);
    if (!site) {
      throw "Not found";
    }
    if (site.staging !== "") {
      isStaging = true;
      staging = await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .findOne(
          { siteId: site.staging },
          { projection: { _id: 0, name: 1, user: 1 } }
        );
    }
    console.log(
      JSON.stringify({
        main: { user: site.user, name: site.name },
        staging: { ...staging },
        isStaging: isStaging,
      })
    );
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

async function getPluginsThemesList(req, res) {
  siteid = req.params.siteid;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, ip: 1 } }
      );
    result = await axios.get(
      "http://" + site.ip + ":8081/ptlist/" + site.user + "/" + site.name
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to fetch data" });
  }
}

async function updatePlugins(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { siteId: siteid },
        { projection: { _id: 0, name: 1, user: 1, ip: 1 } }
      );
    let postData = [];
    for (let name of data.names) {
      postData.push({ name: name, operation: data.operation });
    }
    console.log(postData);
    result = await axios.post(
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
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { siteId: siteid },
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
    result = await axios.post(
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

module.exports = {
  summary: getSiteSummary,
  add: addSite,
  details: getOneSite,
  delete: deleteSite,
  getPluginsThemesList,
  updatePlugins,
  updateThemes,
};
