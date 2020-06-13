const processApps = require('./index.js').processApps
const neatCsv = require('neat-csv')
const fs = require('fs')
const Wappalyzer = require('wappalyzer')
const csvAppend = require('csv-append').csvAppend
const RELATIVE_PATH_TO_CSV = `./hate-out.csv`
const { append, end } = csvAppend(RELATIVE_PATH_TO_CSV)

// Wappalyzer options
const options = {
  // debug: true,
  delay: 500,
  maxUrls: 1,
  maxWait: 10000,
  recursive: false,
  userAgent: 'Wappalyzer',
}

/**
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} value
 */
let objFilter = (obj, key, value) => {
  let found = ''
  for (var i in obj) {
    if (obj[i].hasOwnProperty(key) && obj[i][key] == value) {
      found = i
      break
    }
  }
  return found
}

fs.readFile('hate-in.csv', async (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  // Prepare Wappalyzer
  const wappalyzer = await new Wappalyzer(options)
  await wappalyzer.init()

  neatCsv(data).then((hates) => {
    hates.forEach(async (hate) => {
      try {
        let url = hate['Website']
        let site = await wappalyzer.open(url)

        // Optionally capture and output errors
        // site.on('error', console.error)
        const data = site.analyze()

        data
          .then((d) => {
            if (d.hasOwnProperty('applications')) {
              // Get Wappalyzer apps.
              let tmp = processApps(d.applications)

              // Get good URL
              let goodUrl = objFilter(d.urls, 'status', 200)
              goodUrl = goodUrl == '' ? hate['Website'] : goodUrl

              // Add back group data.
              tmp['Ideology'] = hate['Ideology']
              tmp['Group'] = hate['Group']
              tmp['Website'] = goodUrl

              // Write to CSV, delete object.
              console.log(tmp)
              append(tmp)
              delete tmp
            }
          })
          .catch((e) => {
            console.error(e)
          })
      } catch (e) {
        console.log(e)
      }
    })
  })
  // await wappalyzer.destroy()
})
