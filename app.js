const express = require("express");
const cors = require("cors");
const router = require("./routes/router");
const db = require("./db/mongo");
const proxy = require("express-http-proxy");
const app = express();
const corsOptions = {
  maxAge: 2000,
};

//Middlewear for parsing incomming json request
app.use(
  "/proxy",
  proxy("128.199.28.207:8080", {
    proxyReqPathResolver: function (req) {
      var parts = req.url.split("?");
      var queryString = parts[1];
      var updatedPath = parts[0].replace(/test/, "tent");
      return "/proxy/" + updatedPath + (queryString ? "?" + queryString : "");
    },
  })
);
app.use(express.json());

//CORS options
app.use(cors(corsOptions));

//Routes are defined in router.js files
app.use("", router);
app.options("*", cors());
db.connect(() => {
  app.listen(80, function () {
    console.log(`Listening`);
  });
});
// app.listen(80);
