// Load environmental variables
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const { logger, initLogCorrelation } = require("./utils/logging");
const { fetchProjectId } = require("./utils/metadata");

// Main entry point
exports.entry = async (req, res) => {
  // Init GCP tracing
  let project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    try {
      project = await fetchProjectId();
    } catch (err) {
      logger.warn("Could not fetch Project Id for tracing.");
    }
  }
  // Initialize request-based logger with project Id
  initLogCorrelation(project);

  const paths = getPaths(req.path);
  console.log(paths);

  if (paths[1] == "domains") {
    await this.securitytrails(req, res);
  } else if (paths[1] == "analyze") {
    await this.wappalyzer(req, res);
  } else {
    res.json({ error: "Something went wrong" });
  }
};

/**
 * Get the paths from the url
 * @param {string} path
 * @returns
 */
const getPaths = (path) => {
  return path.split("/");
};

/**
 * Return domains from Security Trails
 * @param {*} req
 * @param {*} res
 */
exports.securitytrails = async (req, res) => {
  logger.info("Get domains from Security Trails");
  const stapi = require("./utils/securitytrails");
  const paths = getPaths(req.path);
  const domain = paths[2];
  let maxpage = req.query && req.query.maxpage ? req.query.maxpage : 0;

  const domains = await stapi.get_domains(domain, maxpage);
  res.json(domains);
};

/**
 * Get wappalyzer data
 * @param {*} req
 * @param {*} res
 */
exports.wappalyzer = async (req, res) => {
  logger.info("Process domains in Wappalyzer");
  // Check if we have a domain available
  let domain = "";
  // Optionally accept a domain via query parameter.
  if (req.query.hasOwnProperty("domain")) {
    domain = req.query.domain;
  } else {
    const paths = getPaths(req.path);
    domain = paths[2];
  }
  const { processDomain } = require("./utils/wappalyzer");
  const data = await processDomain(domain);
  res.json(data);
};
