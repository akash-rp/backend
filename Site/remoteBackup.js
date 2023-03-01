const mongodb = require("../db/mongo");
// const { S3Client } = require("@aws-sdk/client-s3");
const { default: axios } = require("axios");
const Backblaze = require("./remoteStorage/backblaze");
const S3Storage = require("./remoteStorage/s3");

async function addRemoteStorage(req, res) {
  let body = req.body;

  let siteid = req.params.siteid;
  try {
    let apiKeys = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOne(
        { userId: req.user.id },
        { projection: { _id: 0, "integration.backup": 1 } }
      );

    if (!apiKeys) {
      return res.status(404).send();
    }

    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });

    if (!site) {
      return res.status(404).send();
    }

    let api;
    for (const apiKey of apiKeys.integration.backup) {
      if (apiKey.name == body.name && apiKey.provider == body.provider) {
        api = apiKey;
        break;
      }
    }

    if (!api) {
      return res.status(404).send();
    }
    switch (api.provider) {
      case "backblaze": {
        let b2 = new Backblaze(api.accessKey, api.secretKey, body.bucketName);
        let authorization = await b2.authenticate();

        //Api key restricted to single bucket returns bucket name in authoriaztion response so check for it.
        if (
          authorization.allowed.bucketName &&
          authorization.allowed.bucketName == body.bucketName
        ) {
          //send credentials to remote server
          await axiosRemoteStorageAdd(site, api, body, req);
        } else if (authorization.allowed.bucketName) {
          //This api key is restricted to single bucket which does not match the given bucket name so return error
          return res.status(400).json({
            field: "bucket",
            message: "API key is restricted to other bucket",
          });
        }

        let listBuckets = await b2.listBuckets();

        if (
          listBuckets.buckets.some(
            (bucket) => bucket.bucketName == body.bucketName
          )
        ) {
          await axiosRemoteStorageAdd(site, api, body, req);
        } else {
          await b2.createBucket();
          await axiosRemoteStorageAdd(site, api, body, req);
        }
        break;
      }
      case "wasabi":
      case "aws": {
        let endpoint;
        switch (api.provider) {
          case "wasabi":
            endpoint = "s3." + api.region + ".wasabisys.com";
            break;
          case "aws":
            endpoint = "s3." + api.region + ".amazonaws.com";
        }
        let s3 = new S3Storage(
          api.provider,
          api.accessKey,
          api.secretKey,
          api.region,
          endpoint,
          body.bucketName
        );
        let listBuckets = await s3.listBucket();
        console.log(listBuckets);
        if (
          listBuckets.Buckets.some((bucket) => bucket.Name == body.bucketName)
        ) {
          await axiosRemoteStorageAdd(site, api, body, req, endpoint);
        } else {
          await s3.createBucket();
          await axiosRemoteStorageAdd(site, api, body, req, endpoint);
        }
        break;
      }
      default:
        return res.status(400).json({
          errors: [{ field: "provider", message: "Invalid provider" }],
        });
    }
    let remoteList = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { userId: req.user.id, siteId: siteid },
        {
          $push: {
            remoteBackup: {
              automatic: false,
              frequency: "Hourly",
              time: {
                hour: "00",
                minute: "00",
                weekday: "Sunday",
                monthday: "00",
              },
              retention: {
                time: 7,
                type: "Day",
              },
              provider: api.provider,
              api: body.name,
              bucket: body.bucketName,
            },
          },
        },
        {
          returnDocument: "after",
        }
      );

    return res.json(remoteList.value.remoteBackup);
  } catch (error) {
    console.log(error);
    if (error.errors) {
      res.status(400).json(error);
    } else res.status(400).send("something went wrong");
  }
}

async function listRemoteStorages(req, res) {
  let siteid = req.params.siteid;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { $projection: { _id: 0, remoteBackup: 1 } }
      );
    if (!site) {
      return res.status(404).send();
    }
    res.json(site.remoteBackup);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

async function updateRemoteStorage(req, res) {
  let siteid = req.params.siteid;
  let data = req.body;

  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne(
        { userId: req.user.id, siteId: siteid },
        { projection: { name: 1, user: 1, ip: 1, remoteBackup: 1 } }
      );
    await axios.post(
      "http://" +
        site.ip +
        ":8081" +
        "/updateremotebackup/" +
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
    let index = site.remoteBackup.findIndex(
      (remote) =>
        remote.provider == data.backup.provider &&
        remote.bucket == data.backup.bucket
    );

    site.remoteBackup[index] = data.backup;
    let remoteBackups = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOneAndUpdate(
        { siteId: siteid },
        { $set: { remoteBackup: site.remoteBackup } },
        {
          returnDocument: "after",
        }
      );

    res.json(remoteBackups.value.remoteBackup);
  } catch (error) {
    console.log("error");
    console.log(error);
    console.log(error.toJSON());
    res.status(404).json({ error: "Something went wrong" });
  }
}

async function takeRemoteOndemandBackup(req, res) {
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
        "/remote",

      {
        tag: data.tag,
        storage: data.storage,
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

async function listRemoteBackups(req, res) {
  let siteid = req.params.siteid;
  let storage = req.params.storage;
  try {
    let site = await mongodb
      .get()
      .db("hosting")
      .collection("sites")
      .findOne({ userId: req.user.id, siteId: siteid });
    if (!site) {
      return res.status(404).send();
    }
    let backups = await axios.get(
      "http://" +
        site.ip +
        ":8081/remotebackup/list/" +
        site.name +
        "/" +
        site.user +
        "/" +
        storage
    );
    return res.json(backups.data);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

module.exports = {
  addRemoteStorage,
  listRemoteStorages,
  updateRemoteStorage,
  takeRemoteOndemandBackup,
  listRemoteBackups,
};

async function axiosRemoteStorageAdd(site, api, body, req, endpoint) {
  return await axios
    .post("http://" + site.ip + ":8081/backup/remote/add/" + site.name, {
      provider: api.provider,
      accessKey: api.accessKey,
      secretKey: api.secretKey,
      bucket: body.bucketName,
      id: req.user.id,
      endpoint: endpoint,
    })
    .catch((err) => {
      console.log(err);
      console.log(err.response?.data);
      if (err.response?.data?.errors) {
        throw err.response.data;
      } else throw new Error();
    });
}
