const stapi = require("securitytrails");
const wait = require("util").promisify(setTimeout);
const { logger, pinoHttp } = require("./logging");
const STAPI = new stapi(process.env.ST_API_KEY);

const stResponseHandler = async (response) => {
  if (!response.ok) {
    throw Error(response.statusText);
  }
  return await response.json();
};

// Create template for domain data.
let domainObj = {
  hostname: "",
  host_provider: "",
  company_name: "",
};

exports.get_domains = async (domain, maxPages) => {
  // If we were connected to stateful storage, we would check for existing data here.
  // Since we're not, we'll just do it live in memory.

  // Initialize domains with origin.
  let domains = [Object.assign({}, domainObj, { hostname: domain })];

  // No data, fetch new data
  const domainPromises = [];

  // Add associated domains
  domainPromises.push(this.get_associated_domains(domain, maxPages));

  // Delay next, add subdomains
  wait(1000);
  domainPromises.push(this.get_subdomains(domain));

  await Promise.allSettled(domainPromises).then((results) => {
    // Merge domains
    console.log(results);
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        domains = domains.concat(result.value);
      }
    });
  });

  return domains;
};

/**
 * Fetch associated domains
 * @param {string} domain
 */
exports.get_associated_domains = async (domain, maxPages) => {
  let domains = [];
  const data = await STAPI.domains_associated_domains(domain)
    .then(stResponseHandler)
    .catch(pinoHttp);

  // Add initial domains
  domains = domains.concat(associated_domains_processing(data));

  // Check for additional domains
  if (data.meta.total_pages > 1) {
    maxPages = maxPages == 0 ? data.meta.total_pages : maxPages;
    let pageDomains = await associated_domains_paging(domain, 2, maxPages);
    domains = domains.concat(pageDomains);
  }

  return domains;
};

/**
 * Fetch subdomains.
 * @param {string} domain
 * @returns array
 */
exports.get_subdomains = async (domain) => {
  let domains = [];

  const data = await STAPI.domains_subdomains(domain, true, false)
    .then(stResponseHandler)
    .catch(pinoHttp);

  // Return fully formed subdomains.
  if (data.hasOwnProperty("subdomains") && data.subdomains.length > 0) {
    data.subdomains.forEach((sub) => {
      domains.push(
        Object.assign({}, domainObj, { hostname: `${sub}.${domain}` })
      );
    });
  }

  return domains;
};

/**
 * Extract domains from associated list.
 * @param {object} data
 * @returns array
 */
const associated_domains_processing = (data) => {
  console.log(data);
  const records = data.records;
  let domains = [];

  records.forEach((record) => {
    let newDomain = Object.assign({}, domainObj, {
      hostname: record.hostname,
      company_name:
        getNested(record, "computed", "company_name") !== undefined
          ? record.computed.company_name
          : "",
      host_provider:
        record.host_provider.length > 0 ? record.host_provider[0] : "",
    });
    domains.push(newDomain);
  });

  return domains;
};

/**
 * Process multiple pages of domains.
 * @param {string} domain
 * @param {int} start
 * @param {int} end
 * @returns array
 */
const associated_domains_paging = async (domain, start, end) => {
  let domains = [];

  // Loop through pages, create promises
  let pagedDomains = [];
  for (let page = start; page < end + 1; page++) {
    setTimeout(() => {
      pagedDomains.push(STAPI.domains_associated_domains(domain, page));
    }, 1000);
  }

  // Handle results
  await Promise.allSettled(pagedDomains).then((results) => {
    results.forEach((record) => {
      if (record.status === "fulfilled") {
        const response = record.value;
        const data = response.then(stResponseHandler).catch(pinoHttp);
        domains = domains.concat(associated_domains_processing(data));
      }
    });
  });

  return domains;
};

/**
 * Check for nested values.
 * @param {object} obj
 * @param  {...any} args
 * @returns
 */
const getNested = (obj, ...args) => {
  return args.reduce((obj, level) => obj && obj[level], obj);
};
