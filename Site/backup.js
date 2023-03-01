const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function getBackupSettings(req, res) {
  let siteid = req.params.siteid;
  try {
    let backup = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { backup: 1 } }
      );

    if (!backup) {
      throw Error;
    }
    return res.json(backup.backup);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function updateLocalBackup(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;

  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { name: 1, user: 1, ip: 1 } }
      );
    await axios.post(
      "http://" +
        site.ip +
        ":8081" +
        "/updatelocalbackup/" +
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

    res.status(200).send();
  } catch (error) {
    console.log("error");
    console.log(error);
    console.log(error.toJSON());
    res.status(404).json({ error: "Something went wrong" });
  }
}

async function takeLocalOndemandBackup(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    let result = await axios.post(
      "http://" +
        site.ip +
        ":8081" +
        "/takeondemandbackup/" +
        site.name +
        "/" +
        site.user +
        "/local",

      {
        tag: data.tag,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.json(result.data);
  } catch (error) {
    console.log(error);
    res.status(404).send(error);
  }
}

async function getLocalBackupList(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    let result = await axios.get(
      "http://" +
        site.ip +
        ":8081/localbackup/list/" +
        site.name +
        "/" +
        site.user,
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

async function restoreBackup(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    await axios.post("http://" + site.ip + ":8081/restorebackup", {
      name: site.name,
      user: site.user,
      restore: data.restore,
    });
    res.json("Success");
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: "Cannot restore backup" });
  }
}

async function downloadBackup(req, res) {
  let siteid = req.params.siteid;
  let mode = req.params.mode;
  let id = req.params.id;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-disposition": "attachment;",
    });
    await axios
      .get(
        "http://" + site.ip + ":8081/site/backup/download/" + mode + "/" + id,
        { responseType: "stream" }
      )
      .then((stream) => {
        console.log(stream.data);
        stream.data.pipe(res);
      });
    // res.send();
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}
module.exports = {
  settings: getBackupSettings,
  updateLocalBackup,
  takeOndemand: takeLocalOndemandBackup,
  getLocalBackupList,
  restoreBackup,
  downloadBackup,
};
