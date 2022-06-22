const { default: axios } = require("axios");
const mongodb = require("../db/mongo");

/** @type {import("express").RequestHandler} */
async function update7Gwaf(req, res) {
  const { siteid } = req.params;
  let body = req.body;

  try {
    const mongo = mongodb.get();
    let site = await mongo.db("hosting").collection("sites").findOne(
      { userId: req.user.id, siteId: siteid },
      {
        _id: 0,
        ip: 1,
        name: 1,
        user: 1,
      }
    );
    if (site === undefined) {
      return res.status(404).send();
    }
    await axios.post(
      `http://${site.ip}:8081/update7G`,
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
        { userId: req.user.id, siteId: siteid },
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

async function updateModsec(req, res) {
  const { siteid } = req.params;
  const { body } = req;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (site === undefined) {
      return res.status(400).send();
    }
    const data = {
      app: site.name,
      enabled: body.enabled,
      paranoiaLevel: +body.paranoiaLevel,
      anomalyThreshold: +body.anomalyThreshold,
    };
    console.log(data);
    await axios.post(`http://${site.ip}:8081/updateModsecurity`, data, {
      headers: {
        "Content-Type": "application/json",
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
