const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function changePHP(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  let mainSite;
  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ serverId: data.serverid })
      .toArray();
    for (site of sites) {
      if (site.siteId == siteid) {
        mainSite = site;
        break;
      }
    }
    if (mainSite == undefined) {
      res.json({ error: "site not found" });
      return;
    }
    currentphp = mainSite.php;
    mainSite.php = data.php;

    await axios.post(
      "http://" + mainSite.ip + ":8081/changePHP",
      {
        name: mainSite.name,
        oldphp: currentphp,
        newphp: data.php,
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
      .updateOne({ siteId: siteid }, { $set: { php: mainSite.php } });
    res.json({});
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

async function getPHPini(req, res) {
  siteid = req.params.siteid;
  data = req.body;

  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = sites[0];
    if (!site) {
      res.json({ error: "site not found" });
    }

    result = await axios.get(
      "http://" + site.ip + ":8081/getPHPini/" + site.name,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(result.data);
    phpIni = parseIntFromObj(result.data);
    res.json(phpIni);
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

async function updatePHPini(req, res) {
  siteid = req.params.siteid;
  data = req.body;
  let php = {};
  try {
    sites = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .find({ siteId: siteid })
      .toArray();
    site = sites[0];
    if (!site) {
      res.json({ error: "site not found" });
    }
    php.MaxExecutionTime = String(data.php.MaxExecutionTime);
    php.MaxFileUploads = String(data.php.MaxFileUploads);
    php.MaxInputTime = String(data.php.MaxInputTime);
    php.MaxInputVars = String(data.php.MaxInputVars);
    php.MemoryLimit = String(data.php.MemoryLimit) + "M";
    php.PostMaxSize = String(data.php.PostMaxSize) + "M";
    php.SessionCookieLifetime = String(data.php.SessionCookieLifetime);
    php.SessionGcMaxLifetime = String(data.php.SessionGcMaxlifetime);
    php.ShortOpenTag = String(data.php.ShortOpenTag);
    php.UploadMaxFilesize = String(data.php.UploadMaxFilesize) + "M";
    await axios.post(
      "http://" + site.ip + ":8081/updatePHPini/" + site.name,
      JSON.stringify(php),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.json({});
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

module.exports = { changeVersion: changePHP, getPHPini, updatePHPini };
