const mongodb = require("../db/mongo");

async function getCloudflareApis(req, res) {
  let body = req.body;
  try {
    let apis = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOne(
        { userId: body.id },
        {
          projection: {
            "integration.cloudflare.label": 1,
            _id: 0,
          },
        }
      );
    if (!apis) {
      res.status(404).send();
    }
    return res.json(apis.integration.cloudflare);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

module.exports = {
  getCloudflareApis,
};
