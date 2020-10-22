// TODO: Fetch real data

let METABUGS_URL =
  "https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status&keywords=feature-testing-meta%2C%20&keywords_type=allwords";
let LANDINGS_URL =
  "https://community-tc.services.mozilla.com/api/index/v1/task/project.bugbug.landings_risk_report.latest/artifacts/public/landings_by_date.json";

let featureMetabugs = (async function () {
  let response = await fetch(METABUGS_URL, { cache: "no-store" });
  let json = await response.json();
  return json.bugs;
})();

let landingsData = (async function () {
  let response = await fetch(LANDINGS_URL, { cache: "no-store" });
  let json = await response.json();
  return json;
})();

async function getTestingPolicySummaryData() {
  let data = await landingsData;

  let orderedDates = [];
  for (let date in data) {
    orderedDates.push(date);
  }
  orderedDates.sort((a, b) => {
    return temporal.Temporal.Date.compare(
      temporal.Temporal.Date.from(a),
      temporal.Temporal.Date.from(b)
    );
  });

  let returnedData = {};
  for (let date of orderedDates) {
    let result = {};
    let originalData = data[date];

    for (let bug of originalData) {
      for (let tag of bug.testing) {
        result[tag] = result[tag] ? result[tag] + 1 : 1;
      }
    }

    returnedData[date] = result;
  }

  return returnedData;
}
