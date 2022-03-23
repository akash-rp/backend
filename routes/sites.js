const mongodb = require("../db/mongo");
const { default: axios } = require("axios");
const { parseDomain, fromUrl } = require("parse-domain");
const { v4: uuidv4 } = require("uuid");

// function addJSON(sites) {
//   result = [];
//   for (let site of sites) {
//     let aliasDomain = [];

//     for (domain of site.domain.alias) {
//       aliasDomain.push({
//         url: domain.url,
//         ssl: domain.ssl,
//         wildcard: domain.wildcard,
//       });
//     }
//     result.push({
//       name: site.name,
//       user: site.user,
//       primaryDomain: {
//         url: site.domain.primary.url,
//         ssl: site.domain.primary.ssl,
//         wildcard: site.domain.primary.wildcard,
//       },
//       aliasDomain: aliasDomain,
//       localBackup: site.localbackup,
//     });
//   }
//   return result;
// }

function addSingleJSON(site) {
  let aliasDomain = [];

  for (domain of site.domain.alias) {
    aliasDomain.push({
      url: domain.url,
      ssl: domain.ssl,
      wildcard: domain.wildcard,
    });
  }
  result = {
    name: site.name,
    user: site.user,
    primaryDomain: {
      url: site.domain.primary.url,
      ssl: site.domain.primary.ssl,
      wildcard: site.domain.primary.wildcard,
    },
    aliasDomain: aliasDomain,
    localBackup: site.localbackup,
  };

  return result;
}
