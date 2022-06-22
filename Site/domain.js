const { default: axios } = require("axios");
const { parseDomain, fromUrl } = require("parse-domain");
const mongodb = require("../db/mongo");

async function addDomainToSite(req, res) {
  try {
    const { siteid } = req.params;
    const data = req.body;
    const serverid = data.id;
    let mainSite;
    const sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ userId: req.user.id, serverId: serverid })
      .toArray();

    let ip = sites[0].ip;
    sites.forEach((site) => {
      if (site.siteId == siteid) {
        mainSite = site;
      }
    });

    if (mainSite == undefined) {
      return res.status(400).json();
    }

    const { url, routing, isSubDomain } = modifyDomain(data.url);

    // Check for same domain across all sites and also on wildcard domain
    if (searchForUrl(url, sites)) {
      return res.status(400).json({ error: "Url exists" });
    }
    if (data.type == "alias") {
      mainSite.domain.alias.push({
        url,
        ssl: {
          issued: false,
          expiry: "",
        },
        wildcard: false,
        isSubDomain,
        routing,
      });
    }
    // site.domain.exclude = mainSite.domain.exclude;

    await axios.post(
      `http://${ip}:8081/domain/add`,
      {
        domain: {
          url,
          isSubDomain,
          routing,
        },
        site: mainSite.name,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // console.timeEnd("axios");
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne(
        { siteId: mainSite.siteId },
        { $set: { domain: mainSite.domain } }
      );

    res.json({ ...mainSite });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err });
  }
}

async function deleteDomain(req, res) {
  try {
    let siteid = req.params.siteid;
    let data = req.body;

    const site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    if (site == undefined) {
      res.json({ error: "site not found" });
      return;
    }

    //remove requested domain url from domain alias array and return filter domain alias array
    site.domain.alias = site.domain.alias.filter((ali) => {
      if (ali.url !== data.url) {
        return ali;
      }
    });

    await axios.post(
      `http://${site.ip}:8081/domain/delete`,
      {
        site: site.name,
        domain: { url: data.url },
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
      .updateOne({ siteId: siteid }, { $set: { domain: site.domain } });

    res.json({});
  } catch (err) {
    console.log(err);
    res.status(400).send();
  }
}

//currently this feature not implemented, don't check as many things changed
async function changeRoute(req, res) {
  try {
    let siteid = req.params.siteid;
    let data = req.body;
    let mainSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    let found;

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
      for (let alias of mainSite.domain.alias) {
        if (alias.url === data.url) {
          res.json({ error: "Routing not allowed for Alias Domain" });
          return;
        }
      }
    }

    await axios.post(
      `http://${mainSite.ip}:8081/domainedit`,
      {
        name: mainSite.name,
        site: mainSite,
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
    let siteid = req.params.siteid;
    let data = req.body;
    let resSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({
        userId: req.user.id,
        siteId: siteid,
      });

    if (resSite == undefined) {
      res.status(400).json({ error: "Site not found" });
      return;
    }
    let found;
    let domain;
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
          }
          return alias;
        }
        return alias;
      });
    }
    if (!found) {
      return res.status(400).send();
    }
    let method = data.wildcard ? "add" : "remove";

    await axios.post(
      `http://${resSite.ip}:8081/domain/wildcard/${method}`,
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
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    const site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    if (site == undefined) {
      res.json({ error: "site not found" });
      return;
    }
    const tempSite = site.domain.primary;
    site.domain.primary = site.domain.alias.find((ali) => {
      if (ali.url == data.url) return ali;
    });

    site.domain.alias = site.domain.alias.filter((ali) => ali.url != data.url);

    site.domain.alias.push(tempSite);

    await axios.post(
      `http://${site.ip}:8081/changeprimary`,
      {
        name: site.name,
        mainUrl: data.url,
        aliasUrl: tempSite.url,
        user: site.user,
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
      .updateOne({ siteId: siteid }, { $set: { domain: site.domain } });
    res.json({});
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

module.exports = {
  add: addDomainToSite,
  delete: deleteDomain,
  changeRoute,
  changeWildcard,
  changePrimary,
  modifyDomain,
  searchForUrl,
};

function searchForUrl(url, sites) {
  for (const site of sites) {
    if (site.domain.primary.url === url) {
      return true;
    }
    /* ###########################################################################################
          Alias For loop
  ############################################################################################## */
    for (const domain of site.domain.alias) {
      if (domain.url === url) {
        return true;
      }
    }
    /* ###########################################################################################
          Redirect for loop
  ############################################################################################## */
    for (const domain of site.domain.redirect) {
      if (domain.url === url) {
        return true;
      }
    }
  }
  return false;
}

function modifyDomain(originalurl) {
  let url;
  let isSubDomain = false;
  let routing = "none";
  const { subDomains, domain, topLevelDomains } = parseDomain(
    fromUrl(originalurl)
  );

  if (subDomains && subDomains.length > 0) {
    if (subDomains.length == 1) {
      if (subDomains[0] === "www") {
        url = `${domain}.${topLevelDomains.join(".")}`;
        routing = "www";
      } else {
        isSubDomain = true;
        url = `${subDomains[0]}.${domain}.${topLevelDomains.join(".")}`;
      }
    } else {
      isSubDomain = true;
      url = `${subDomains.join(".")}.${domain}.${topLevelDomains.join(".")}`;
    }
  } else {
    url = `${domain}.${topLevelDomains.join(".")}`;
  }
  return { url, routing, isSubDomain };
}
