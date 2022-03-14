const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function addSSHkey(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid }, { projection: { _id: 0, user: 1, ip: 1 } });
    await axios.post(
      "http://" + site.ip + ":8081/addSSH/" + site.user,
      JSON.stringify({
        key: data.key,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne(
        { siteId: siteid },
        { $push: { ssh: { label: data.label, key: data.key } } }
      );
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.json("Failed");
  }
}

async function removeSSHkey(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  try {
    site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ siteId: siteid }, { projection: { _id: 0, user: 1, ip: 1 } });
    await axios.post(
      "http://" + site.ip + ":8081/removeSSH/" + site.user,
      JSON.stringify({
        key: data.key,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .updateOne(
        { siteId: siteid },
        { $pull: { ssh: { key: data.key, label: data.label } } }
      );
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.json("Failed");
  }
}

module.exports = { add: addSSHkey, remove: removeSSHkey };
