const Wappalyzer = require("wappalyzer");
const normalizeUrl = require("normalize-url");
const { logger } = require("./logging");

// Wappalyzer options
const options = {
  // debug: true,
  delay: 1050,
  maxWait: 10000,
};

logger.info(options);

// Prepare Wappalyzer
const wappalyzer = new Wappalyzer(options);
wappalyzer.init();

exports.processDomains = async (domains = []) => {
  const self = this;
  let results = [];
  let promiseDomains = [];
  domains.forEach((domain) => {
    promiseDomains.push(self.processDomain(domain));
  });

  await Promise.allSettled(promiseDomains)
    .then((values) => {
      values.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      });
    })
    .catch((err) => {
      console.log(err);
    });

  return results;
};

/**
 * Process domain requests.
 */
exports.processDomain = async (url) => {
  //   Normalize URL
  url = normalizeUrl(url);
  let results = {};
  await this._processWap(url).then((data) => {
    results = data;
  });
  return results;
};

/**
 *
 * @param {string} url
 * @returns
 */
exports._processWap = async (url) => {
  let results = {};
  try {
    // Analyze request.
    // console.log(url);
    const site = wappalyzer.open(url);

    // Optionally capture and output errors
    site.on("error", console.error);

    // Analyze data
    const data = await site.analyze();
    // console.log(data);
    // Get technology data
    if (data.hasOwnProperty("technologies")) {
      Object.assign(results, this.processApps(data.technologies));
    }

    // Get URL data
    if (data.hasOwnProperty("urls")) {
      Object.assign(results, this.processUrls(data.urls));
    }
  } catch (e) {
    console.error(e);
  }

  return results;
};

/**
 * Process all detected Wappalyzer applications
 * @param {array} apps An array of applications detected on domain.
 */
exports.processApps = (apps) => {
  // Wap shell.
  let wapResults = {
    1: [], // CMS (Drupal, WordPress)
    999: [], // CMS version (custom)
    22: [], // Web Server (Apache, Nginx)
    27: [], // Programming Language (PHP, ASP.net, etc),
    31: [], // CDN (CloudFlare, etc)
    57: [], // Static Site Generator
    62: [], // PaaS (Pantheon, Acquia, etc)
    88: [], // Hosting
    23: [], // Caching
    10: [], // Analytics
    76: [], // Personalization
    32: [], // Marketing Automation
    19: [], // Miscellaneous
  };
  apps.forEach((app) => {
    if (app.hasOwnProperty("categories")) {
      for (let category in app["categories"]) {
        matchCategories(app["categories"][category].id, app, wapResults);
      }
    }
  });
  // Convert arrays to strings
  Object.keys(wapResults).forEach((v) => {
    wapResults[v] = wapResults[v].join(", ");
  });

  // Add category names vs numbers
  const WapCat = {
    1: "cms",
    999: "cms_version",
    22: "web_server",
    27: "programming_language",
    31: "cdn",
    57: "static_site",
    62: "platform",
    88: "hosting",
    23: "caching",
    10: "analytics",
    76: "personalization",
    32: "marketing_automation",
    19: "miscellaneous",
  };
  for (cat in WapCat) {
    delete Object.assign(wapResults, { [WapCat[cat]]: wapResults[cat] })[cat];
  }

  return wapResults;
};

exports.processUrls = (urls) => {
  // Get the first URL, check for redirect.
  let listUrls = Object.keys(urls);
  let firstUrl = listUrls[0];
  let lastUrl = listUrls.pop();
  let status =
    urls[firstUrl].status == undefined || urls[firstUrl].status == null
      ? 200
      : urls[firstUrl].status;
  let originMatch = false;
  let fsu = this.stripURl(firstUrl);
  let lsu = this.stripURl(lastUrl);
  if (fsu == lsu) {
    originMatch = true;
  }

  return {
    url: firstUrl,
    redirect_url: lastUrl,
    http_status: status,
    origin_match: originMatch,
  };
};

/**
 * Return a clean URL stripped down to base domain.
 * @param {string} url
 * @returns
 */
exports.stripURl = (url) => {
  return normalizeUrl(url, { stripProtocol: true, stripHash: true }).split(
    "/"
  )[0];
};

/**
 * Match categories to existing Wappalyzer results.
 * @param {object} cat Category to check.
 * @param {object} app Application object with name.
 */
function matchCategories(cat, app, wapResults) {
  let keys = Object.keys(wapResults);
  for (let key = 0; key < keys.length; key++) {
    const k = keys[key];
    if (cat == k) {
      // Get CMS version
      if (["drupal", "wordpress"].includes(app.slug) && app.version !== null) {
        // Get only the major version
        let cmsVersion = app.version.split(".")[0];
        wapResults[999].push(`${app.name} ${cmsVersion}`);
      }

      // Record technology.
      wapResults[cat].push(app.name);
    }
  }
}
