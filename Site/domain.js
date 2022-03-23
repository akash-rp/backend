const mongodb = require("../db/mongo");
const { default: axios } = require("axios");
const { parseDomain, fromUrl } = require("parse-domain");
const site = require("./site");

async function addDomainToSite(req, res) {
  try {
    const siteid = req.params.siteid;
    const data = req.body;
    const serverid = data.id;
    let url;
    let mainSite;
    let sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .toArray();
    let isSubDomain = false;
    let routing = "none";
    ip = sites[0].ip;
    sites.forEach((site) => {
      if (site.siteId == siteid) {
        mainSite = site;
      }
    });

    if (mainSite == undefined) {
      res.json();
    }

    const { subDomains, domain, topLevelDomains } = parseDomain(
      fromUrl(data.url)
    );

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
    // Check for same domain across all app and also on wildcard domain
    for (let site of sites) {
      if (site.domain.primary.url === url) {
        res.json({
          error: "This url is being used by other site",
        });
        return;
      }
      /*########################################################################################### 
            Alias For loop    
    ##############################################################################################*/
      for (let domain of site.domain.alias) {
        if (domain.url === url) {
          res.json({
            error: "This url is being used by other site",
          });
          return;
        }
      }
      /*########################################################################################### 
            Redirect for loop  
    ##############################################################################################*/
      for (let domain of site.domain.redirect) {
        if (domain.url === url) {
          res.json({
            error: "This url is being used by other site",
          });
          return;
        }
      }
    }
    sites.forEach((site) => {
      if (site.siteId == siteid) {
        if (data.type == "alias") {
          site.domain.alias.push({
            url: url,
            ssl: {
              issued: false,
              expiry: "",
            },
            wildcard: false,
            isSubDomain: isSubDomain,
            routing: routing,
          });
        }
        // site.domain.exclude = mainSite.domain.exclude;
      }
    });
    let app;
    for (let site of sites) {
      if (site.siteId == siteid) {
        app = site;
      }
    }
    await axios.post(
      "http://" + ip + ":8081/domain/add",
      {
        domain: {
          url: url,
          isSubDomain: isSubDomain,
          routing: routing,
        },
        site: app.name,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // console.timeEnd("axios");
    for (let site of sites) {
      await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .updateOne({ siteId: site.siteId }, { $set: { domain: site.domain } });
    }

    res.json({ ...mainSite });
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
}

async function deleteDomain(req, res) {
  try {
    siteid = req.params.siteid;
    data = req.body;

    let sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: data.serverid })
      .toArray();
    let mainSite;

    sites.forEach((site) => {
      if (site.siteId == siteid) {
        mainSite = site;
      }
    });
    if (mainSite == undefined) {
      res.json({ error: "site not found" });
      return;
    }

    mainSite.domain.alias = mainSite.domain.alias.filter((ali) => {
      if (ali.url !== data.url) {
        return ali;
      }
    });

    console.time("delete");
    await axios.post(
      "http://" + mainSite.ip + ":8081/domain/delete",
      {
        site: mainSite.name,
        domain: { url: data.url },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.timeEnd("delete");
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { domain: mainSite.domain } });
    res.json({});
  } catch (err) {
    console.log(err);
    res.json({ error: err });
  }
}

async function changeRoute(req, res) {
  try {
    siteid = req.params.siteid;
    data = req.body;
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: data.serverid })
      .toArray();
    let mainSite;
    let found;

    for (site of sites) {
      if (site.siteId == siteid) {
        mainSite = site;
        break;
      }
    }

    if (mainSite == undefined) {
      res.json({ error: "site not found" });
      return;
    }
    if (mainSite.domain.primary.url == data.url) {
      if (!mainSite.domain.primary.subDomain) {
        mainSite.domain.primary.routing = data.type;
        found = true;
      } else {
        res.json({ error: "Subdomain not allowed" });
        return;
      }
    }

    if (!found) {
      for (alias of mainSite.domain.alias) {
        if (alias.url === data.url) {
          res.json({ error: "Routing not allowed for Alias Domain" });
          return;
        }
      }
    }

    siteJSON = addSingleJSON(mainSite);
    await axios.post(
      "http://" + mainSite.ip + ":8081/domainedit",
      {
        name: mainSite.name,
        site: siteJSON,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { domain: mainSite.domain } });
    res.json({});
  } catch (error) {
    console.log(error);
    res.json({ error: "Something went wrong" });
  }
}

async function changeWildcard(req, res) {
  try {
    siteid = req.params.siteid;
    data = req.body;
    resSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ serverId: data.serverid, siteId: siteid });

    if (resSite == undefined) {
      res.json({ error: "Site not found" });
      return;
    }
    var found;
    var domain;
    console.log(resSite);
    if (data.type == "primary") {
      if (data.url == resSite.domain.primary.url) {
        if (resSite.domain.primary.isSubDomain) {
          res.json({ error: "Subdomain not allowed" });
          return;
        }
        domain = resSite.domain.primary;
        resSite.domain.primary.wildcard = data.wildcard;
        found = true;
      }
    } else {
      resSite.domain.alias = resSite.domain.alias.map((alias) => {
        if (alias.url === data.url) {
          if (!alias.isSubDomain) {
            found = true;
            domain = alias;
            alias.wildcard = data.wildcard;
            return alias;
          } else {
            return alias;
          }
        } else {
          return alias;
        }
      });
    }
    if (!found) {
      return res.status(400).send();
    }
    method = data.wildcard ? "add" : "remove";

    await axios.post(
      "http://" + resSite.ip + ":8081/domain/wildcard/" + method,
      {
        site: resSite.name,
        domain: {
          url: domain.url,
          isSubDomain: domain.isSubDomain,
          routing: domain.routing,
          type: data.type,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { domain: resSite.domain } });
    // function sleep(ms) {
    //   return new Promise((resolve) => setTimeout(resolve, ms));
    // }
    // await sleep(10000);
    res.json(resSite);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "Something went wrong" });
  }
}

async function changePrimary(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  let mainSite;
  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: data.serverid })
      .toArray();
    for (site of sites) {
      if (site.siteId == siteid) {
        mainSite = site;
        break;
      }
    }
    if (mainSite == undefined) {
      res.json({ error: "site not found" });
      return;
    }
    let tempSite = mainSite.domain.primary;
    mainSite.domain.primary = mainSite.domain.alias.find((ali) => {
      if (ali.url == data.url) return ali;
    });

    mainSite.domain.alias = mainSite.domain.alias.filter(
      (ali) => ali.url != data.url
    );

    mainSite.domain.alias.push(tempSite);
    for (site of sites) {
      if (site.siteId == siteid) {
        site = mainSite;
      }
    }
    await axios.post(
      "http://" + mainSite.ip + ":8081/changeprimary",
      {
        name: mainSite.name,
        mainUrl: data.url,
        aliasUrl: tempSite.url,
        user: mainSite.user,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { domain: mainSite.domain } });
    res.json({});
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

module.exports = {
  add: addDomainToSite,
  delete: deleteDomain,
  changeRoute,
  changeWildcard,
  changePrimary,
};
