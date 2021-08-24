const mongodb = require("../db/mongo");
const { customAlphabet } = require("nanoid");
const { default: axios } = require("axios");
const { parseDomain, fromUrl } = require("parse-domain");
const { json } = require("express");
const nanoid = customAlphabet(
  "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
);

async function getSiteSummary(req, res) {
  try {
    serverid = req.params.serverid;
    const data = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .project({ name: 1, user: 1, domain: { primary: { url: 1 } } })
      .toArray();
    res.json(data);
  } catch (err) {
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
      .project({ domain: 1, siteId: 1, name: 1 })
      .toArray();
    const data = req.body;
    let url = data.url;
    const { subDomains, domain, topLevelDomains } = parseDomain(fromUrl(url));
    let isSubDomain = false;
    let routing = "none";
    let baseUrl = "";
    let exclude = [];

    // Remove www from the domain is present only on level 1 subdomain
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
    if (isSubDomain) {
      baseUrl = domain + "." + topLevelDomains.join(".");
    }

    // Check for same domain across all app and also on wildcard domain
    for (let site of sites) {
      if (site.domain.primary.url === url) {
        res.json({
          error: "This url is being used by other site",
        });
        return;
      }
      console.log("site", site);
      if (site.domain.primary.subDomain) {
        if (site.domain.primary.baseurl === url) {
          if (!exclude.includes(site.domain.primary.url)) {
            console.log("Inside exclude", site.domain.primary.url);
            exclude.push(site.domain.primary.url);
            console.log(exclude);
          }
          if (!site.domain.exclude.includes(url)) {
            console.log("inside domain exclude", url);
            site.domain.exclude.push(url);
            site.domain.exclude.push("www." + url);
          }
        }
      }
      if (isSubDomain) {
        if (site.domain.primary.url === baseUrl) {
          if (!site.domain.exclude.includes(url)) {
            site.domain.exclude.push(url);
          }
          if (!exclude.includes(site.domain.primary.url)) {
            exclude.push(site.domain.primary.url);
            exclude.push("www." + site.domain.primary.url);
          }
        }
      }
      for (let domain of site.domain.alias) {
        if (domain.url === url) {
          res.json({
            error: "This url is being used by other site",
          });
          return;
        }

        if (domain.subDomain) {
          if (domain.baseurl === url) {
            if (!exclude.includes(domain.url)) {
              exclude.push(domain.url);
            }
            if (!site.domain.exclude.includes(url)) {
              site.domain.exclude.push(url);
              site.domain.exclude.push("www." + url);
            }
          }
        }
        if (isSubDomain) {
          if (domain.url === baseUrl) {
            if (!site.domain.exclude.includes(url)) {
              site.domain.exclude.push(url);
            }
            if (!exclude.includes(domain.url)) {
              exclude.push(domain.url);
              exclude.push("www." + domain.url);
            }
          }
        }
      }
      for (let domain of site.domain.redirect) {
        if (domain.url === url) {
          res.json({
            error: "This url is being used by other site",
          });
          return;
        }
        if (domain.subDomain) {
          if (domain.baseurl === url) {
            if (!exclude.includes(domain.url)) {
              exclude.push(domain.url);
            }
            if (!site.domain.exclude.includes(url)) {
              site.domain.exclude.push(url);
              site.domain.exclude.push("www." + url);
            }
          }
        }
        if (isSubDomain) {
          if (domain.url === baseUrl) {
            if (!site.domain.exclude.includes(url)) {
              site.domain.exclude.push(url);
            }
            if (!exclude.includes(domain.url)) {
              exclude.push(domain.url);
              exclude.push("www." + domain.url);
            }
          }
        }
      }
    }
    let siteJSON = [];
    for (let site of sites) {
      let aliasDomain = [];
      console.log("site json", site);
      for (let domain in site.domain.alias) {
        aliasDomain.push({
          url: domain.url,
          subDomain: domain.subDomain,
          ssl: domain.ssl,
          wildcard: domain.wildcard,
          routing: domain.routing,
        });
      }
      siteJSON.push({
        name: site.name,
        primaryDomain: {
          url: site.domain.primary.url,
          subDomain: site.domain.primary.subDomain,
          ssl: site.domain.primary.ssl,
          wildcard: site.domain.primary.wildcard,
          routing: site.domain.primary.routing,
        },
        aliasDomain: aliasDomain,
        exclude: site.domain.exclude,
      });
      console.log("exclude", exclude);
    }
    await axios.post(
      "http://" + result.ip + ":8081/wp/add",
      {
        appName: data.appName,
        userName: data.userName,
        url: url,
        title: data.title,
        adminUser: data.adminUser,
        adminPassword: data.adminPassword,
        adminEmail: data.adminEmail,
        subDomain: isSubDomain,
        routing: routing,
        sites: siteJSON,
        exclude: exclude,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    id = nanoid();
    const doc = {
      siteId: id,
      user: data.userName,
      serverId: serverid,
      name: data.appName,
      php: data.php,
      ip: result.ip,
      domain: {
        primary: {
          url: data.url,
          ssl: false,
          wildcard: false,
          routing: routing,
          subDomain: isSubDomain,
          baseurl: baseUrl,
        },
        alias: [],
        redirect: [],
        exclude: exclude,
      },
    };
    for (let site of sites) {
      await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .updateOne({ siteId: site.siteId }, { $set: { domain: site.domain } });
    }

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
    res.json(err);
    // res.status(400).json(err.response.data);
  }
}

async function getSitesOfServer(req, res) {
  try {
    serverid = req.params.serverid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .toArray();
    let site = { [serverid]: result };
    res.json(site);
  } catch (err) {
    res.status(400).json();
  }
}

async function getOneSite(req, res) {
  try {
    siteid = req.params.siteid;
    let result = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(400).json();
  }
}

async function addDomainToSite(req, res) {
  try {
    const siteid = req.params.siteid;
    const data = req.body;
    const serverid = data.id;
    let url;
    let isSubDomain = false;
    let baseUrl;
    let routing = "none";
    let mainSite;
    let sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .toArray();

    let exclude = [];
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
    if (isSubDomain) {
      baseUrl = domain + "." + topLevelDomains.join(".");
    }

    // Check for same domain across all app and also on wildcard domain
    for (let site of sites) {
      if (site.domain.primary.url === url) {
        res.json({
          error: "This url is being used by other site",
        });
        return;
      }
      if (site.domain.primary.subDomain) {
        if (site.domain.primary.baseurl === url) {
          if (site.siteId !== siteid) {
            if (!mainSite.domain.exclude.includes(site.domain.primary.url)) {
              mainSite.domain.exclude.push(site.domain.primary.url);
            }
            if (!site.domain.exclude.includes(url)) {
              site.domain.exclude.push(url);
              site.domain.exclude.push("www." + url);
            }
          }
        }
      }
      if (isSubDomain) {
        if (site.domain.primary.url === baseUrl) {
          if (site.siteId !== siteid) {
            if (!site.domain.exclude.includes(url)) {
              site.domain.exclude.push(url);
            }
            if (!mainSite.domain.exclude.includes(site.domain.primary.url)) {
              mainSite.domain.exclude.push(site.domain.primary.url);
              mainSite.domain.exclude.push("www." + site.domain.primary.url);
            }
          }
        }
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
        if (domain.subDomain) {
          console.log("inside domain.subdoamin");
          if (domain.baseurl === url) {
            if (site.siteId !== siteid) {
              console.log("should be here");
              mainSite.domain.exclude.push(domain.url);
              console.log("main site", mainSite.domain.exclude);
              if (!site.domain.exclude.includes(url)) {
                site.domain.exclude.push(url);
                site.domain.exclude.push("www." + url);
              }
            }
          }
        }
        if (isSubDomain) {
          if (domain.url === baseUrl) {
            if (site.siteId !== siteid) {
              if (!site.domain.exclude.includes(url)) {
                site.domain.exclude.push(url);
              }
              if (!mainSite.domain.exclude.includes(domain.url)) {
                mainSite.domain.exclude.push(domain.url);
                mainSite.domain.exclude.push("www." + domain.url);
              }
            }
          }
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
        if (domain.subDomain) {
          if (domain.baseurl === url) {
            if (site.siteId !== siteid) {
              mainSite.domain.exclude.push(domain.url);
              if (!site.domain.exclude.includes(url)) {
                site.domain.exclude.push(url);
                site.domain.exclude.push("www." + url);
              }
            }
          }
        }
        if (isSubDomain) {
          if (domain.url === baseUrl) {
            if (site.siteId !== siteid) {
              if (!site.domain.exclude.includes(url)) {
                site.domain.exclude.push(url);
              }
              if (!mainSite.domain.exclude.includes(domain.url)) {
                mainSite.domain.exclude.push(domain.url);
                mainSite.domain.exclude.push("www." + domain.url);
              }
            }
          }
        }
      }
    }
    console.log("mian site exclude ", mainSite.domain.exclude);
    sites.forEach((site) => {
      if (site.siteId == siteid) {
        if (data.type == "alias") {
          site.domain.alias.push({
            url: url,
            subDomain: isSubDomain,
            routing: routing,
            ssl: false,
            wildcard: false,
            baseurl: baseUrl,
          });
        }
        site.domain.exclude = mainSite.domain.exclude;
      }
    });
    let siteJSON = addJSON(sites);
    await axios.post(
      "http://" + ip + ":8081/domainedit",
      {
        sites: siteJSON,
        name: mainSite.name,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
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
    for (site of sites) {
      if (site.siteId === siteid) {
        site = mainSite;
      }
    }
    siteJSON = addJSON(sites);
    await axios.post(
      "http://" + site.ip + ":8081/domainedit",
      {
        name: mainSite.name,
        sites: siteJSON,
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
    console.log(sites);
    for (site of sites) {
      if (site.siteId == siteid) {
        console.log(site);
        mainSite = site;
        break;
      }
    }
    console.log(mainSite);
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
          if (!alias.subDomain) {
            alias.routing = data.type;
            break;
          } else {
            res.json({ error: "Subdomain not allowed" });
            return;
          }
        }
      }
    }
    
    siteJSON = addJSON(sites);
    await axios.post(
      "http://" + mainSite.ip + ":8081/domainedit",
      {
        name: mainSite.name,
        sites: siteJSON,
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
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: data.serverid })
      .toArray();
    let mainSite;
    let found;
    console.log(sites, siteid);
    for (site of sites) {
      if (site.siteId == siteid) {
        mainSite = site;
        break;
      }
    }
    if (mainSite == undefined) {
      res.json({ error: "Site not found" });
      return;
    }

    if (data.url == mainSite.domain.primary.url) {
      if (mainSite.domain.primary.subDomain) {
        res.json({ error: "Subdomain not allowed" });
        return;
      }
      mainSite.domain.primary.wildcard = data.wildcard;
      found = true;
    }
    if (!found) {
      for (alias of mainSite.domain.alias) {
        if (alias.url === data.url) {
          if (!alias.subDomain) {
            alias.wildcard = data.wildcard;
            break;
          } else {
            res.json({ error: "Subdomain not allowed" });
            return;
          }
        }
      }
    }
    siteJSON = addJSON(sites);
    await axios.post(
      "http://" + mainSite.ip + ":8081/domainedit",
      {
        name: mainSite.name,
        sites: siteJSON,
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
    console.log('main find',mainSite.domain.alias);
    mainSite.domain.alias = mainSite.domain.alias.filter(
      (ali) => ali.url != data.url
    );

    console.log("main filter",mainSite.domain.alias);
    mainSite.domain.alias.push(tempSite);
    for(site of sites){
      if(site.siteId == siteid){
        site = mainSite
      }
    }
    siteJSON = addJSON(sites)
    await axios.post(
      "http://" + mainSite.ip + ":8081/changeprimary",
      {
        name: mainSite.name,
        sites: siteJSON,
        mainUrl:data.url,
        aliasUrl:tempSite.url,
        user:mainSite.user
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
      res.json({})
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

module.exports = {
  getSiteSummary,
  addSite,
  getSitesOfServer,
  getOneSite,
  addDomainToSite,
  deleteDomain,
  changeRoute,
  changeWildcard,
  changePrimary
};

function addJSON(sites) {
  result = [];
  for (let site of sites) {
    let aliasDomain = [];
    console.log("Inside function", site);
    for (domain of site.domain.alias) {
      aliasDomain.push({
        url: domain.url,
        subDomain: domain.subDomain,
        ssl: domain.ssl,
        wildcard: domain.wildcard,
        routing: domain.routing,
      });
    }
    result.push({
      name: site.name,
      primaryDomain: {
        url: site.domain.primary.url,
        subDomain: site.domain.primary.subDomain,
        ssl: site.domain.primary.ssl,
        wildcard: site.domain.primary.wildcard,
        routing: site.domain.primary.routing,
      },
      aliasDomain: aliasDomain,
      exclude: site.domain.exclude,
    });
  }
  return result;
}
