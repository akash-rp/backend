const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function getBackupSettings(req, res) {
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

module.exports = {
  settings: getBackupSettings,
  updateLocalBackup,
  takeOndemand: takeLocalOndemandBackup,
  getLocalBackupList,
  restoreLocalBackup,
};
