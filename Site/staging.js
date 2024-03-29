const { default: axios } = require("axios");
const { v4: uuidv4 } = require("uuid");
const mongodb = require("../db/mongo");

async function createStaging(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let id = uuidv4();
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    await axios.get(
      `http://${site.ip}:8081/createstaging/${site.name}/${site.user}/${data.url}/${site.domain.primary.url}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    site.localbackup.ondemand = true;
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { staging: id } });
    const doc = {
      siteId: id,
      user: site.user,
      serverId: site.serverId,
      name: `${site.name}_Staging`,
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
    return res.json({});
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: "Cannot create staging site" });
  }
}

async function getDatabaseTables(req, res) {
  const { siteid } = req.params;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    let result = await axios.get(
      `http://${site.ip}:8081/getdbtables/${site.name}/${site.user}`,
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
  const { siteid } = req.params;
  const data = req.body;
  try {
    let mainSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        {
          projection: {
            _id: 0,
            name: 1,
            user: 1,
            type: 1,
            "domain.primary.url": 1,
            ip: 1,
            staging: 1,
          },
        }
      );
    let stagingSite = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: mainSite.staging },
        {
          projection: {
            _id: 0,
            name: 1,
            user: 1,
            type: 1,
            "domain.primary.url": 1,
          },
        }
      );
    mainSite.url = mainSite.domain.primary.url;
    stagingSite.url = stagingSite.domain.primary.url;
    delete mainSite.domain;
    delete stagingSite.domain;
    let fromSite;
    let toSite;
    if (data.method == "push") {
      fromSite = mainSite;
      toSite = stagingSite;
    } else {
      fromSite = stagingSite;
      toSite = mainSite;
    }
    await axios.post(
      `http://${mainSite.ip}:8081` + "/syncChanges",
      JSON.stringify({
        type: data.type,
        dbType: data.dbType,
        allSelected: data.allSelected,
        tables: data.tables,
        fromSite,
        toSite,
        exclude: data.exclude,
        deleteDestFiles: data.deleteDestFiles,
        copyMethod: data.copyMethod,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(404).json("Something Went wrong");
  }
}

async function getStagingSite(req, res) {
  const { siteid } = req.params;
  try {
    let staging = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, live: siteid },
        {
          projection: {
            _id: 0,
            name: 1,
            user: 1,
            "domain.primary.url": 1,
          },
        }
      );
    res.json(staging);
  } catch (error) {
    console.log(error);
    res.status(404).send();
  }
}

async function deleteStaging(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid, type: "staging" },
        {
          projection: {
            _id: 0,
            ip: 1,
            name: 1,
            user: 1,
            live: 1,
          },
        }
      );
    if (!site) {
      throw "Not found";
    }
    await axios.get(
      `http://${site.ip}:8081/deleteStaging/${site.name}/${site.user}`,
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

module.exports = {
  create: createStaging,
  getDB: getDatabaseTables,
  sync: syncChanges,
  get: getStagingSite,
  delete: deleteStaging,
};
