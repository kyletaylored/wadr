const Wappalyzer = require('wappalyzer')
const normalizeUrl = require('normalize-url')
const request = require('request')

// Wappalyzer options
const options = {
  // debug: true,
  delay: 500,
  maxUrls: 1,
  maxWait: 5000,
  recursive: false,
  userAgent: 'Wappalyzer',
}

exports.helloWorld = (req, res) => {
  res.send('Hello, World')
}

/**
 * Process domain requests.
 */
exports.processDomain = async (req, res) => {
  //   Check for URL query param
  if (req.query.hasOwnProperty('url')) {
    //   Normalize URL
    let url = this.getRealUrl(req.query.url)
    await this._processWap(url).then((d) => {
      res.send(d)
    })
  } else {
    res.send({})
  }
}

exports._processWap = async (url) => {
  // Default Wappalyzer Groups
  const wapResults = {
    '1': [], // CMS (Drupal, WordPress)
    '22': [], // Web Server (Apache, Nginx)
    '27': [], // Programming Language (PHP, ASP.net, etc),
    '31': [], // CDN (CloudFlare, etc)
    '57': [], // Static Site Generator
    '62': [], // PaaS (Pantheon, Acquia, etc)
    '64': [], // Reverse proxy (Nginx)
  }

  // Prepare Wappalyzer
  const wappalyzer = await new Wappalyzer(options)

  try {
    await wappalyzer.init()
    // Analyze request.
    console.log(url)
    const site = await wappalyzer.open(url)

    // Optionally capture and output errors
    site.on('error', console.error)

    const data = site.analyze()
    console.log(data)
    // Log data
    // console.log(data)

    if (data.hasOwnProperty('applications')) {
      this.processApps(data.applications, wapResults)
    }
  } catch (e) {
    console.error(e)
  }

  return wapResults
}

/**
 * Catch any redirects.
 * @param {string} url A URL link.
 */
exports.getRealUrl = (url) => {
  try {
    url = normalizeUrl(url)
    var r = request.get(url)

    return r.uri.href
  } catch (e) {
    return null
  }
}

/**
 * Process all detected Wappalyzer applications
 * @param {array} apps An array of applications detected on domain.
 */
exports.processApps = (apps) => {
  // Wap shell.
  let wapResults = {
    '1': [], // CMS (Drupal, WordPress)
    '22': [], // Web Server (Apache, Nginx)
    '27': [], // Programming Language (PHP, ASP.net, etc),
    '31': [], // CDN (CloudFlare, etc)
    '57': [], // Static Site Generator
    '62': [], // PaaS (Pantheon, Acquia, etc)
    '64': [], // Reverse proxy (Nginx)
  }
  apps.forEach((app) => {
    if (app.hasOwnProperty('categories')) {
      for (var category in app['categories']) {
        matchCategories(category, app, wapResults)
      }
    }
  })
  // Convert arrays to strings
  Object.keys(wapResults).forEach((v) => {
    wapResults[v] = wapResults[v].join(', ')
  })

  return wapResults
}

/**
 * Match categories to existing Wappalyzer results.
 * @param {object} cat Category to check.
 * @param {object} app Application object with name.
 */
function matchCategories(cat, app, wapResults) {
  let keys = Object.keys(wapResults)
  for (let key = 0; key < keys.length; key++) {
    const k = keys[key]
    if (cat === k) {
      wapResults[cat].push(app['name'])
    }
  }
}
