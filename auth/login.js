const { default: axios } = require("axios");

async function registrationFlow(req, res) {
  let flow = await axios.get(
    "http://127.0.0.1:4430/self-service/registration/browser",
    {
      headers: {
        accept: "application/json",
      },
    }
  );
  res.setHeader("set-cookie", flow.headers["set-cookie"]);
  res.json({ headers: flow.headers, data: flow.data });
}

module.exports = { registrationFlow };
