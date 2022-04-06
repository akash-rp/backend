const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

/** @type {import("express").RequestHandler} */
async function update7Gwaf(req, res) {
  let siteid = req.params.siteid;
  body = req.body;

  try {
    let mongo = mongodb.get();
    let site = await mongo
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid }, { _id: 0, ip: 1, name: 1, user: 1 });
    if (site === undefined) {
      return res.status(404).send();
    }
    await axios.post(
      "http://" + site.ip + ":8081/update7G",
      {
        app: site.name,
        user: site.user,
        enabled: body.enabled,
        disable: body.disable,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    site = await mongo
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { siteId: siteid },
        {
          $set: {
            "firewall.sevenG": { enabled: body.enabled, disable: body.disable },
          },
        },
        {
          returnDocument: "after",
        }
      );
    res.json(site.value);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

/** @type {import("express").RequestHandler} */

async function updateModsec(req, res) {
  let siteid = req.params.siteid;
  let body = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid });
    if (site === undefined) {
      return res.status(400).send();
    }
    let data = {
      app: site.name,
      enabled: body.enabled,
      paranoiaLevel: +body.paranoiaLevel,
      anomalyThreshold: +body.anomalyThreshold,
    };
    console.log(data);
    await axios.post("http://" + site.ip + ":8081/updateModsecurity", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { siteId: siteid },
        {
          $set: {
            "firewall.modsecurity": data,
          },
        },
        {
          returnDocument: "after",
        }
      );

    res.json(site.value);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

module.exports = {
  update7Gwaf,
  updateModsec,
};
