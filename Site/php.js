const mongodb = require("../db/mongo");
const { default: axios } = require("axios");

async function PhpMiddlware(req, res, next) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { _id: 0, ip: 1, name: 1, user: 1, siteId: 1, php: 1 }
      );
    if (!site) {
      return res.status(404).send();
    }
    req.site = site;
    next();
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function changePHP(req, res) {
  let mainSite = req.site;
  let data = req.body;
  try {
    let currentphp = mainSite.php;
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
      .updateOne({ siteId: mainSite.siteId }, { $set: { php: mainSite.php } });

    res.json();
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error });
  }
}

async function getPHPini(req, res) {
  let site = req.site;
  try {
    let result = await axios.get(
      "http://" + site.ip + ":8081/getPHPini/" + site.name,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let phpIni = parseIntFromObj(result.data);

    res.json(phpIni);
  } catch (error) {
    console.log(error);
    res.json({ error: error });
  }
}

async function updatePHPini(req, res) {
  let data = req.body;
  let php = {};
  let site = req.site;
  try {
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
    php.Timezone = data.php.Timezone;
    php.OpenBaseDir = '"' + data.php.OpenBaseDir + '"';
    let result = await axios.post(
      "http://" + site.ip + ":8081/updatePHPini/" + site.name,
      JSON.stringify(php),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let phpIni = parseIntFromObj(result.data);
    res.json(phpIni);
  } catch (error) {
    res.status(400).json({ error: error });
  }
}

async function getPHPsettings(req, res) {
  let site = req.site;
  try {
    let settings = await axios.get(
      "http://" + site.ip + ":8081/getPHPsettings/" + site.name
    );

    res.json(settings.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

async function updatePHPsettings(req, res) {
  let site = req.site;
  let body = req.body;
  try {
    let settings = await axios.post(
      "http://" + site.ip + ":8081/updatePHPsettings/" + site.name,
      {
        user: site.user,
        settings: body.settings,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    res.json(settings.data);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
}

module.exports = {
  changeVersion: changePHP,
  getPHPini,
  updatePHPini,
  getPHPsettings,
  PhpMiddlware,
  updatePHPsettings,
};

function parseIntFromObj(obj) {
  Object.keys(obj).forEach((key) => {
    if (key != "ShortOpenTag" && key != "Timezone" && key != "OpenBaseDir") {
      obj[key] = parseInt(obj[key]);
    }
  });
  return obj;
}
