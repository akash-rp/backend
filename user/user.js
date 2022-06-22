const mongodb = require("../db/mongo");

async function getUser(req, res) {
  try {
    let user = await mongodb
      .get()
      .db("hosting")
      .collection("users")
      .findOne(
        { userId: req.user.id },
        {
          projection: {
            "integration.cloudflare.key": 0,
            "integration.cloudflare.email": 0,
          },
        }
      );
    if (!user) {
      return res.status(404).send();
    }
    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(400).send();
  }
}

module.exports = {
  getUser,
};
