const {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
} = require("@aws-sdk/client-s3");

class S3Storage {
  constructor(provider, accessKey, secretKey, region, endpoint, bucket) {
    this.provider = provider;
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.region = region;
    this.bucket = bucket;
    this.endpoint = endpoint;
  }
  async listBucket() {
    const client = new S3Client({
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
      },
      endpoint: "https://" + this.endpoint,
      region: this.region,
    });

    return await client
      .send(new ListBucketsCommand(""))
      .then((res) => res)
      .catch((err) => {
        console.log(err);
        throw {
          errors: [{ field: "apiKey", message: "Cannot get bucket list" }],
        };
      });
  }
  async createBucket() {
    const client = new S3Client({
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
      },
      endpoint: "https://" + this.endpoint,
      region: this.region,
    });
    return await client
      .send(new CreateBucketCommand({ Bucket: this.bucket }))
      .catch((err) => {
        console.log(err);
        throw {
          errors: [{ field: "bucket", message: "Cannot create bucket" }],
        };
      });
  }
}

//   let buckets = await client.send(new ListBucketsCommand(""));
//   console.log(buckets);
//   await client.send(
//     new CreateBucketCommand({ Bucket: "kashurp", Region: "us-east-2" })
//   );

module.exports = S3Storage;
