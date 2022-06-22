const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const router = require("./routes/router");
const mongodb = require("./db/mongo");

const app = express();
const corsOptions = {
  maxAge: 2000,
  origin: "http://localhost:3000",
  credentials: true,
};
Error.stackTraceLimit = Infinity;
app.use(express.json());

app.use(cookieParser());
// CORS options
app.use(cors(corsOptions));

// Routes are defined in router.js files
app.use("", router);

app.options("*", cors());
mongodb.connect(() => {
  app.listen(80, () => {
    console.log("Listening");
  });
});
// app.listen(80);
