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
      .project({ name: 1, user: 1, domain: { primary: { url: 1 } } })
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
    // let routing = "none";

    // Remove www from the domain is present only on level 1 subdomain
    // if (subDomains && subDomains.length > 0) {
    //   if (subDomains.length == 1) {
    //     if (subDomains[0] === "www") {
    //       url = "www." + domain + "." + topLevelDomains.join(".");
    //     } else {
    //       isSubDomain = true;
    //       url = subDomains[0] + "." + domain + "." + topLevelDomains.join(".");
    //     }
    //   } else {
    //     isSubDomain = true;
    //     url =
    //       subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
    //   }
    // } else {
    //   url = domain + "." + topLevelDomains.join(".");
    // }
    if (subDomains && subDomains.length > 0) {
      url =
        subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
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
      domain: {
        primary: {
          url: data.url,
          ssl: false,
          wildcard: false,
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
    // let routing = "none";
    let mainSite;
    // isWWW = false;
    let sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: serverid })
      .toArray();

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
    // if (subDomains && subDomains.length > 0) {
    //   if (subDomains.length == 1) {
    //     if (subDomains[0] === "www") {
    //       url = domain + "." + topLevelDomains.join(".");
    //     } else {
    //       isSubDomain = true;
    //       url = subDomains[0] + "." + domain + "." + topLevelDomains.join(".");
    //     }
    //   } else {
    //     isSubDomain = true;
    //     url =
    //       subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
    //   }
    // } else {
    //   url = domain + "." + topLevelDomains.join(".");
    // }
    if (subDomains && subDomains.length > 0) {
      url =
        subDomains.join(".") + "." + domain + "." + topLevelDomains.join(".");
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
      // if (site.domain.primary.subDomain) {
      //   if (site.domain.primary.baseurl === url) {
      //     if (site.siteId !== siteid) {
      //       if (!mainSite.domain.exclude.includes(site.domain.primary.url)) {
      //         mainSite.domain.exclude.push(site.domain.primary.url);
      //       }
      //       if (!site.domain.exclude.includes(url)) {
      //         site.domain.exclude.push(url);
      //         site.domain.exclude.push("www." + url);
      //       }
      //     }
      //   }
      // }
      // if (isSubDomain) {
      //   if (site.domain.primary.url === baseUrl) {
      //     if (site.siteId !== siteid) {
      //       if (!site.domain.exclude.includes(url)) {
      //         site.domain.exclude.push(url);
      //       }
      //       if (!mainSite.domain.exclude.includes(site.domain.primary.url)) {
      //         mainSite.domain.exclude.push(site.domain.primary.url);
      //         mainSite.domain.exclude.push("www." + site.domain.primary.url);
      //       }
      //     }
      //   }
      // }
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
        // if (domain.subDomain) {
        //   if (domain.baseurl === url) {
        //     if (site.siteId !== siteid) {
        //       mainSite.domain.exclude.push(domain.url);
        //       if (!site.domain.exclude.includes(url)) {
        //         site.domain.exclude.push(url);
        //         site.domain.exclude.push("www." + url);
        //       }
        //     }
        //   }
        // }
        // if (isSubDomain) {
        //   if (domain.url === baseUrl) {
        //     if (site.siteId !== siteid) {
        //       if (!site.domain.exclude.includes(url)) {
        //         site.domain.exclude.push(url);
        //       }
        //       if (!mainSite.domain.exclude.includes(domain.url)) {
        //         mainSite.domain.exclude.push(domain.url);
        //         mainSite.domain.exclude.push("www." + domain.url);
        //       }
        //     }
        //   }
        // }
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
        // if (domain.subDomain) {
        //   if (domain.baseurl === url) {
        //     if (site.siteId !== siteid) {
        //       mainSite.domain.exclude.push(domain.url);
        //       if (!site.domain.exclude.includes(url)) {
        //         site.domain.exclude.push(url);
        //         site.domain.exclude.push("www." + url);
        //       }
        //     }
        //   }
        // }
        // if (isSubDomain) {
        //   if (domain.url === baseUrl) {
        //     if (site.siteId !== siteid) {
        //       if (!site.domain.exclude.includes(url)) {
        //         site.domain.exclude.push(url);
        //       }
        //       if (!mainSite.domain.exclude.includes(domain.url)) {
        //         mainSite.domain.exclude.push(domain.url);
        //         mainSite.domain.exclude.push("www." + domain.url);
        //       }
        //     }
        //   }
        // }
      }
    }
    sites.forEach((site) => {
      if (site.siteId == siteid) {
        if (data.type == "alias") {
          site.domain.alias.push({
            url: url,
            ssl: false,
            wildcard: false,
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
    let siteJSON = addSingleJSON(app);
    await axios.post(
      "http://" + ip + ":8081/domainedit",
      {
        site: siteJSON,
        name: mainSite.name,
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

    siteJSON = addSingleJSON(mainSite);
    console.time("delete");
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
    siteJSON = addSingleJSON(mainSite);
    console.log(siteJSON);
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

async function changePHP(req, res) {
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
    currentphp = mainSite.php;
    mainSite.php = data.php;

    await axios.post(
      "http://" + mainSite.ip + ":8081/changePHP",
      {
        name: mainSite.name,
        oldphp: currentphp,
        newphp: data.php,
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
      .updateOne({ siteId: siteid }, { $set: { php: mainSite.php } });
    res.json({});
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

async function getPHPini(req, res) {
  siteid = req.params.siteid;
  data = req.body;

  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = sites[0];
    if (!site) {
      res.json({ error: "site not found" });
    }

    result = await axios.get(
      "http://" + site.ip + ":8081/getPHPini/" + site.name,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(result.data);
    phpIni = parseIntFromObj(result.data);
    res.json(phpIni);
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

async function updatePHPini(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  let php = {};
  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = sites[0];
    if (!site) {
      res.json({ error: "site not found" });
    }
    php.MaxExecutionTime = String(data.php.MaxExecutionTime);
    php.MaxFileUploads = String(data.php.MaxFileUploads);
    php.MaxInputTime = String(data.php.MaxInputTime);
    php.MaxInputVars = String(data.php.MaxInputVars);
    php.MemoryLimit = String(data.php.MemoryLimit) + "M";
    php.PostMaxSize = String(data.php.PostMaxSize) + "M";
    php.SessionCookieLifetime = String(data.php.SessionCookieLifetime);
    php.SessionGcMaxLifetime = String(data.php.SessionGcMaxlifetime);
    php.ShortOpenTag = String(data.php.ShortOpenTag);
    php.UploadMaxFilesize = String(data.php.UploadMaxFilesize) + "M";
    await axios.post(
      "http://" + site.ip + ":8081/updatePHPini/" + site.name,
      JSON.stringify(php),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.json({});
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

async function getBackup(req, res) {
  siteid = req.params.siteid;
  try {
    backup = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .project({ backup: 1 })
      .toArray();
    backup = backup[0];
    res.json(backup.backup);
  } catch (error) {}
}

async function updateLocalBackup(req, res) {
  siteid = req.params.siteid;
  data = req.body;

  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .project({ name: 1, user: 1, ip: 1 })
      .toArray();
    site = sites[0];
    await axios.post(
      "http://" +
        site.ip +
        ":8081" +
        "/updatelocalbackup/" +
        data.type +
        "/" +
        site.name +
        "/" +
        site.user,
      JSON.stringify({
        ...data.backup,
      }),
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
      .updateOne({ siteId: siteid }, { $set: { localbackup: data.backup } });

    res.json({});
  } catch (error) {
    console.log("error");
    console.log(error);
    console.log(error.toJSON());
    res.status(404).json({ error: "Something went wrong" });
  }
}

async function takeLocalOndemandBackup(req, res) {
  siteid = req.params.siteid;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid });
    console.log(site);
    if (!site.localbackup.ondemand) {
      type = "new";
    } else {
      type = "existing";
    }
    await axios.get(
      "http://" +
        site.ip +
        ":8081" +
        "/takelocalondemandbackup/" +
        site.name +
        "/" +
        site.user,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!site.localbackup.ondemand) {
      site.localbackup.ondemand = true;
      await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .updateOne(
          { siteId: siteid },
          { $set: { localbackup: site.localbackup } }
        );
    }
    res.json("");
  } catch (error) {
    console.log(error);
    res.status(404).json("");
  }
}

async function getLocalBackupList(req, res) {
  siteid = req.params.siteid;
  mode = req.params.mode;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = site[0];

    result = await axios.get(
      "http://" +
        site.ip +
        ":8081/localbackup/list/" +
        site.name +
        "/" +
        site.user +
        "/" +
        mode,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Cannot get backup list" });
  }
}

async function restoreLocalBackup(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = site[0];
    await axios.get(
      "http://" +
        site.ip +
        ":8081/restorelocalbackup/" +
        site.name +
        "/" +
        site.user +
        "/" +
        data.restore.mode +
        "/" +
        data.restore.id +
        "/" +
        data.restore.type,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.json({ error: "Cannot restore backup" });
  }
}

async function createStaging(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    console.log("E0");
    id = uuidv4();
    console.log("E1");
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = site[0];
    console.log("E2");
    await axios.get(
      "http://" +
        site.ip +
        ":8081/createstaging/" +
        site.name +
        "/" +
        site.user +
        "/" +
        data.url +
        "/" +
        site.domain.primary.url,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("E3");
    site.localbackup.ondemand = true;
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { staging: id } });
    console.log("E4");
    const doc = {
      siteId: id,
      user: site.user,
      serverId: site.serverId,
      name: site.name + "_Staging",
      php: "lsphp74",
      ip: site.ip,
      domain: {
        primary: {
          url: data.url,
          ssl: false,
          wildcard: false,
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
      live: siteid,
      type: "staging",
    };
    await mongodb.get().db("hosting").collection("sites").insertOne(doc);
    console.log("E5");
    return res.json({});
  } catch (error) {
    console.log("Here is the error");
    console.log(error);
    return res.json({ error: "Cannot create staging site" });
  }
}

async function getDatabaseTables(req, res) {
  const siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = site[0];
    result = await axios.get(
      "http://" + site.ip + ":8081/getdbtables/" + site.name + "/" + site.user,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.json({ error: "Something went wrong" });
  }
}

async function syncChanges(req, res) {
  const siteid = req.params.siteid;
  let data = req.body;
  console.log(siteid);
  try {
    mainSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { siteId: siteid },
        {
          projection: {
            _id: 0,
            name: 1,
            user: 1,
            type: 1,
            domain: { primary: { url: 1 } },
            ip: 1,
            staging: 1,
          },
        }
      );
    console.log(mainSite);
    stagingSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        {
          siteId: mainSite.staging,
        },
        {
          projection: {
            _id: 0,
            name: 1,
            user: 1,
            type: 1,
            domain: { primary: { url: 1 } },
          },
        }
      );
    console.log(stagingSite);
    mainSite.url = mainSite.domain.primary.url;
    stagingSite.url = stagingSite.domain.primary.url;
    delete mainSite.domain;
    delete stagingSite.domain;
    var fromSite, toSite;
    if (data.method == "push") {
      fromSite = mainSite;
      toSite = stagingSite;
    } else {
      fromSite = stagingSite;
      toSite = mainSite;
    }
    await axios.post(
      "http://" + mainSite.ip + ":8081" + "/syncChanges",
      JSON.stringify({
        method: data.method,
        type: data.type,
        dbType: data.dbType,
        allSelected: data.allSelected,
        tables: data.tables,
        fromSite,
        toSite,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log(stagingSite);
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(404).json("Something Went wrong");
  }
}

async function getStagingSite(req, res) {
  const siteid = req.params.siteid;
  try {
    staging = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { live: siteid },
        {
          projection: {
            _id: 0,
            name: 1,
            user: 1,
            domain: { primary: { url: 1 } },
          },
        }
      );
    console.log("staging");
    res.json(staging);
  } catch (error) {
    console.log(error);
    res.send().status(404);
  }
}

async function deleteStaging(req, res) {
  console.log("juee");
  siteid = req.params.siteid;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { siteId: siteid, type: "staging" },
        { projection: { _id: 0, ip: 1, name: 1, user: 1, live: 1 } }
      );
    if (!site) {
      throw "Not found";
    }
    await axios.get(
      "http://" +
        site.ip +
        ":8081/deleteStaging/" +
        site.name +
        "/" +
        site.user,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: site.live }, { $set: { staging: "" } });
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .deleteOne({ siteId: siteid });
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(404).json("Something went wrong");
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
    text = JSON.stringify({});
    console.log(text);
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
  } catch (error) {
    console.log(error);
    res.status(404).json("something went wrong");
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
  changePrimary,
  changePHP,
  getPHPini,
  updatePHPini,
  getBackup,
  updateLocalBackup,
  takeLocalOndemandBackup,
  getLocalBackupList,
  restoreLocalBackup,
  createStaging,
  getDatabaseTables,
  syncChanges,
  getStagingSite,
  deleteStaging,
  deleteSite,
};

function addJSON(sites) {
  result = [];
  for (let site of sites) {
    let aliasDomain = [];

    for (domain of site.domain.alias) {
      aliasDomain.push({
        url: domain.url,
        ssl: domain.ssl,
        wildcard: domain.wildcard,
      });
    }
    result.push({
      name: site.name,
      user: site.user,
      primaryDomain: {
        url: site.domain.primary.url,
        ssl: site.domain.primary.ssl,
        wildcard: site.domain.primary.wildcard,
      },
      aliasDomain: aliasDomain,
      localBackup: site.localbackup,
    });
  }
  return result;
}

function addSingleJSON(site) {
  let aliasDomain = [];

  for (domain of site.domain.alias) {
    aliasDomain.push({
      url: domain.url,
      ssl: domain.ssl,
      wildcard: domain.wildcard,
    });
  }
  result = {
    name: site.name,
    user: site.user,
    primaryDomain: {
      url: site.domain.primary.url,
      ssl: site.domain.primary.ssl,
      wildcard: site.domain.primary.wildcard,
    },
    aliasDomain: aliasDomain,
    localBackup: site.localbackup,
  };

  return result;
}

function parseIntFromObj(obj) {
  Object.keys(obj).forEach((key) => {
    if (key != "ShortOpenTag") {
      obj[key] = parseInt(obj[key]);
    }
  });
  return obj;
}
