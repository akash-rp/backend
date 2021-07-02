const { default: axios } = require("axios");
const fetch = require("node-fetch");

const postHeaders = {
  headers: {
    "Content-Type": "application/json",
    Authorization: "nxm_m_OvXrK8BRVkpSPg0FlOz_AD1DvtL_-_scuyfEENB22mWGno1St5",
  },
};

async function login(email, password) {
  try {
    const response = await axios.post(
      "http://localhost:9011/api/login",
      {
        loginId: email,
        password: password,
      },
      postHeaders
    );
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function createAccount(userData) {
  try {
    const response = await axios.post(
      "http://localhost:9011/api/user/registration/",
      {
        registration: {
          applicationId: "0df41b25-152f-4785-bc13-747614681147",
        },
        user: {
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      },
      postHeaders
    );
    return response.data;
  } catch (error) {
    throw "User already Exists";
  }
}

async function userDetails(id) {
  try {
    console.log(id);
    const response = await axios.get(`http://localhost:9011/api/user/${id}`, {
      headers: {
        Authorization:
          "nxm_m_OvXrK8BRVkpSPg0FlOz_AD1DvtL_-_scuyfEENB22mWGno1St5",
      },
    });
    console.log("im here");
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.log(error.response);
    throw "something went wrong";
  }
}
module.exports = { login, createAccount, userDetails };
