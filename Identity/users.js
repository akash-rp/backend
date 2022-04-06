const fusionauth = require("../connectors/fusionauth");
const md5 = require("md5");

const createAccount = async function (req, res) {
  try {
    //Register user in fusionauth database
    let fusionResponse = await fusionauth.createAccount(req.body.userData);

    //Add userId returned from database to main database which is used as primary key
    const user = await db.query(
      "INSERT INTO users(userid,active) VALUES (?,?)",
      [fusionResponse.user.id, 1]
    );

    res.json({
      userId: fusionResponse.user.id,
      firstName: fusionResponse.user.firstName,
      email: fusionResponse.user.email,
      token: fusionResponse.token,
    });
  } catch (err) {
    //Error will be either "Something went wrong" from DB side or "User already Exists" from fusionauth side
    res.json({
      error: err,
    });
  }
};

const login = async function (req, res) {
  try {
    //Send email and password to fusionauth and get token,userid,Name
    const response = await fusionauth.login(req.body.email, req.body.password);

    res.json({
      token: response.token,
      id: response.user.id,
      firstName: response.user.firstName,
      gravatar: `https://www.gravatar.com/avatar/${md5(
        response.user.email.toLowerCase()
      )}?s=200`,
      email: response.user.email,
    });
  } catch (err) {
    //Non 2xx errors are treated as "Invalid email or password"
    res.json({
      error: "Invalid Email/Password",
    });
  }
};

const userdetails = async function (req, res) {
  try {
    const response = await fusionauth.userDetails(req.body.id);
    res.json({
      firstName: response.user.firstName,
      email: response.user.email,
      gravatar: `https://www.gravatar.com/avatar/${md5(
        response.user.email.toLowerCase()
      )}?s=200`,
    });
  } catch (err) {
    res.status(400).json({});
  }
};

module.exports = { login, createAccount, userdetails };
