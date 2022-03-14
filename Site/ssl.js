const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function addCert(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid }, { projection: { _id: 0, ip: 1, name: 1 } });
    result = await axios.post(
      "http://" + site.ip + ":8081/cert/add",
      {
        appName: site.name,
        url: data.url,
        domainType: data.type,
        email: data.email,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log(result.data);
    if (data.type == "primary") {
      await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .updateOne(
          { siteId: siteid },
          {
            $set: {
              "domain.primary.ssl": { issued: true, expiry: result.data },
            },
          }
        );
    } else if (data.type == "alias") {
      await mongodb
        .get()
        .db("hosting")
        .collection("sites")
        .updateOne(
          { siteId: siteid, "domain.alias.url": data.url },
          {
            $set: {
              "domain.alias.$.ssl": { issued: true, expiry: result.data },
            },
          }
        );
    }
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to issue certificate" });
  }
}

async function enforceHttps(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid }, { projection: { _id: 0, name: 1, ip: 1 } });
    await axios.post(
      "http://" + site.ip + ":8081/enforceHttps",
      {
        operation: data.operation,
        name: site.name,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    if (data.operation == "enable") {
      operation = true;
    } else {
      operation = false;
    }
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne({ siteId: siteid }, { $set: { enforceHttps: operation } });
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.json("Failed");
  }
}

module.exports = { add: addCert, enforceHttps };
