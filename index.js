const Wappalyzer = require("wappalyzer");
const normalizeUrl = require("normalize-url");
const request = require("request");

// Wappalyzer options
const options = {
  debug: true,
  delay: 500,
  maxUrls: 1,
  maxWait: 5000,
  recursive: false,
  userAgent: "Wappalyzer"
};

exports.helloWorld = (req, res) => {
  res.send("Hello, World");
};

/**
 * Process domain requests.
 */
exports.processDomain = async (req, res) => {
  // Default Wappalyzer Groups
  var wapResults = {
    "1": [], // CMS (Drupal, WordPress)
    "22": [], // Web Server (Apache, Nginx)
    "27": [], // Programming Language (PHP, ASP.net, etc),
    "31": [], // CDN (CloudFlare, etc)
    "57": [], // Static Site Generator
    "62": [], // PaaS (Pantheon, Acquia, etc)
    "64": [] // Reverse proxy (Nginx)
  };

  //   Check for URL query param
  if (req.query.hasOwnProperty("url")) {
    let results = [];
    //   Normalize URL
    let url = getRealUrl(req.query.url);

    // Prepare Wappalyzer
    const wappalyzer = new Wappalyzer(url, options);
    let data = await wappalyzer
      .analyze()
      .then(json => {
        return json;
      })
      .catch(error => {
        console.error(error);
        return {};
      });
    if (data.hasOwnProperty("applications")) {
      processApps(data.applications, wapResults);
    }
  }
  res.send(wapResults);
};

/**
 * Catch any redirects.
 * @param {string} url A URL link.
 */
function getRealUrl(url) {
  url = normalizeUrl(url);
  var r = request.get(url);
  console.log(r.redirects);
  return r.uri.href;
}

/**
 * Process all detected Wappalyzer applications
 * @param {array} apps An array of applications detected on domain.
 */
function processApps(apps, wapResults) {
  apps.forEach(el => {
    if (el.hasOwnProperty("categories")) {
      let cats = el["categories"];
      cats.forEach(e => matchCategories(e, el, wapResults));
    }
  });
  // Convert arrays to strings
  Object.keys(wapResults).forEach(v => {
    wapResults[v] = wapResults[v].join(", ");
  });

  console.log(wapResults);
}

/**
 * Match categories to existing Wappalyzer results.
 * @param {object} cat Category to check.
 * @param {object} app Application object with name.
 */
function matchCategories(cat, app, wapResults) {
  let keys = Object.keys(wapResults);
  for (let key = 0; key < keys.length; key++) {
    const k = keys[key];
    if (cat.hasOwnProperty(k)) {
      wapResults[k].push(app["name"]);
    }
  }
}
