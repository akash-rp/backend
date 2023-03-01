const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function addCert(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, ip: 1, name: 1, user: 1 } }
      );
    let token = "";
    if (data.challenge == "dns-01") {
      let apiKeys = await mongodb
        .get()
        .db("hosting")
        .collection("users")
        .findOne(
          { userId: req.user.id },
          { projection: { _id: 0, "integration.dns": 1 } }
        );
      if (!apiKeys) {
        return res.status(404).send();
      }
      let api;
      for (const apiKey of apiKeys.integration.dns) {
        if (apiKey.name == data.api && apiKey.provider == data.dnsProvider) {
          api = apiKey;
          break;
        }
      }
      if (!api) {
        return res.status(404).send();
      }
      token = api.accessKey;
    }
    await axios.post(
      "http://" + site.ip + ":8081/cert/add",
      {
        app: site.name,
        user: site.user,
        domainName: data.domainName,
        challenge: data.challenge,
        domains: data.domains,
        provider: data.provider,
        dnsProvider: data.dnsProvider || "",
        token: token,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to issue certificate" });
  }
}

async function listCerts(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, ip: 1, name: 1 } }
      );
    let result = await axios.get(
      "http://" + site.ip + ":8081/cert/list/" + site.name
    );

    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).json({ error: "Unable to fetch certificates" });
  }
}
async function enforceHttps(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { _id: 0, name: 1, ip: 1 } }
      );
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
    let operation;
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

module.exports = { add: addCert, enforceHttps, listCerts };
