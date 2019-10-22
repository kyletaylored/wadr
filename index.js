const Wappalyzer = require('wappalyzer')
const normalizeUrl = require('normalize-url')

// Wappalyzer options
const options = {
  debug: true,
  delay: 500,
  maxUrls: 1,
  maxWait: 5000,
  recursive: false,
  userAgent: 'Wappalyzer'
}

// Default Wappalyzer Groups
let wapResults = {
  '1': [], // CMS (Drupal, WordPress)
  '22': [], // Web Server (Apache, Nginx)
  '27': [], // Programming Language (PHP, ASP.net, etc),
  '31': [], // CDN (CloudFlare, etc)
  '62': [], // PaaS (Pantheon, Acquia, etc)
  '64': [] // Reverse proxy (Nginx)
}

exports.helloWorld = (req, res) => {
  res.send('Hello, World')
}

exports.processDomain = async (req, res) => {
  //   Check for URL query param
  if (req.query.hasOwnProperty('url')) {
    let results = []
    //   Normalize URL
    let url = normalizeUrl(req.query.url)
    // Prepare Wappalyzer
    const wappalyzer = new Wappalyzer(url, options)
    let data = await wappalyzer
      .analyze()
      .then(json => {
        return json
      })
      .catch(error => {
        console.error(error)
        return {}
      })
    if (data.hasOwnProperty('applications')) {
      processApps(data.applications)
    }
    res.send(wapResults)
  }
  res.send('Hello, World')
}

/**
 * Process all detected Wappalyzer applications
 * @param {array} apps An array of applications detected on domain.
 */
function processApps (apps) {
  apps.forEach(el => {
    if (el.hasOwnProperty('categories')) {
      let cats = el['categories']
      cats.forEach(e => matchCategories(e, el))
    }
  })
  // Convert arrays to strings
  Object.keys(wapResults).forEach(v => {
    wapResults[v] = wapResults[v].join(', ')
  })

  console.log(wapResults)
}

/**
 * Match categories to existing Wappalyzer results.
 * @param {object} cat Category to check.
 * @param {object} app Application object with name.
 */
function matchCategories (cat, app) {
  let keys = Object.keys(wapResults)
  for (let key = 0; key < keys.length; key++) {
    const k = keys[key]
    if (cat.hasOwnProperty(k)) {
      wapResults[k].push(app['name'])
    }
  }
}