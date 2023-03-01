const mongodb = require("../db/mongo");
// const { default: axios } = require("axios");

async function addApiKey(req, res) {
  let body = req.body;
  let serviceParam = req.params.service;
  let services = ["backup", "dns"];
  if (!services.includes(serviceParam)) {
    return res.status(400).send();
  }
  try {
    let integrations = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOne({ userId: req.user.id }, { _id: 0, integration: 1 });
    console.log(integrations);
    let service = integrations.integration[serviceParam];
    if (service.some((single) => single.name === body.name)) {
      return res.status(400).json({ error: "name_exists" });
    }
    let serviceString = "integration." + serviceParam;
    let integrationList = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOneAndUpdate(
        { userId: req.user.id },
        { $push: { [serviceString]: { ...body } } },
        {
          returnDocument: "after",
        }
      );
    return res.json(integrationList.value.integration);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function getApiKeys(req, res) {
  try {
    let apiKeys = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOne({ userId: req.user.id });
    if (!apiKeys) {
      return res.status(404).send();
    }
    return res.json(apiKeys.integration);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}
async function getServiceApiKeys(req, res) {
  let service = req.params.service;
  let services = ["backup", "dns"];
  if (!services.includes(service)) {
    return res.status(400).send();
  }
  try {
    let apiKeys = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOne(
        { userId: req.user.id },
        { projection: { _id: 0, ["integration." + service]: 1 } }
      );
    if (!apiKeys) {
      return res.status(404).send();
    }
    console.log(apiKeys);
    return res.json(apiKeys.integration);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}
module.exports = { addApiKey, getApiKeys, getServiceApiKeys };
