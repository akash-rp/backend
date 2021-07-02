const fs = require("fs");
const path = require("path");
const { NodeSSH } = require("node-ssh");

const ssh = new NodeSSH();
const password = "106Ee14002a";

const conn = async function (req, res) {
  await ssh
    .connect({
      host: "139.59.78.116",
      username: "root",
      port: 22,
      password,
      tryKeyboard: true,
    })
    /*
    Or
    ssh.connect({
        host: 'localhost',
        username: 'steel',
        privateKey: fs.readFileSync('/home/steel/.ssh/id_rsa', 'utf8')
    })
    if you want to use the raw string as private key
    */
    .then(function () {
      ssh
        .execCommand("bash go.bash", {
          cwd: ".",
        })
        .then(function (result) {
          console.log("STDOUT: " + result.stdout);
          if (result.stderr) {
            console.log("STDERR: " + result.stderr);
          }
        });

      res.json({ progress: "working" });
    });
};

module.exports = { conn };
