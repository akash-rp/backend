const { default: axios } = require("axios");
const { Buffer } = require("buffer");

class Backblaze {
  constructor(accessKey, secretKey, bucket) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.bucket = bucket;
  }
  async authenticate() {
    return await axios
      .get("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(this.accessKey + ":" + this.secretKey).toString(
              "base64"
            ),
        },
      })
      .then((res) => {
        this.authorization = res.data;
        return res.data;
      })
      .catch((err) => {
        console.log(err);
        if (err.response?.status == 401) {
          throw {
            errors: [{ field: "apiKey", message: "API Key unauthorized" }],
          };
        } else {
          throw new Error("something went wrong");
        }
      });
  }
  async listBuckets() {
    return await axios
      .post(
        this.authorization.apiUrl + "/b2api/v2/b2_list_buckets",
        {
          accountId: this.authorization.accountId,
        },
        {
          headers: {
            Authorization: this.authorization.authorizationToken,
          },
        }
      )
      .then((res) => res.data)
      .catch((err) => {
        if (err.response?.data) {
          throw {
            errors: [{ field: "apiKey", message: "Cannot get bucket list" }],
          };
        } else {
          throw new Error();
        }
      });
  }
  async createBucket() {
    return await axios
      .post(
        this.authorization.apiUrl + "/b2api/v2/b2_create_bucket",
        {
          accountId: this.authorization.accountId,
          bucketName: this.bucket,
          bucketType: "allPrivate",
        },
        {
          headers: {
            Authorization: this.authorization.authorizationToken,
          },
        }
      )
      .catch((err) => {
        if (err.response?.data) {
          console.log(err.response);
          throw {
            errors: [{ field: "bucket", message: "Cannot create bucket" }],
          };
        } else {
          throw new Error();
        }
      });
  }
}

module.exports = Backblaze;

// async function test() {
//   let b2 = new Backblaze(
//     "002c262daedcdbd0000000007",
//     "K002AjASyee93K/qqVQHBhMyj7r9DY0",
//     "test"
//   );
//   try {
//     let auth = await b2.authenticate();
//     console.log(auth);
//   } catch (err) {
//     console.log(err);
//   }
// }

// test();
