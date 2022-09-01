# Pantheon Almanac Functions

## A set of prospecting APIs built on Google Cloud Functions.

A simple serverless function to support Google Sheets app script in adding additional info about domains.

## Running Locally

You will neet a Secure Trails API key. Talk to Kyle to get that.

```
echo 'ST_API_KEY=[insert key here]' > .env
node i -D && node run start
```

Now you will have a running instance of the function and can query it like so:

```
# Get a list of domains via Secure Trails
http://localhost:8080/domains/schwab.com

# Analyze a specific domain with Wapalyzer
http://localhost:8080/analyze/schwab.com
```

Happy hunting!