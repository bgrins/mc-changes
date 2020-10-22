// TODO: Fetch real data

let METABUGS_URL =
  "https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status&keywords=feature-testing-meta%2C%20&keywords_type=allwords";
let LANDINGS_URL =
  "https://community-tc.services.mozilla.com/api/index/v1/task/project.bugbug.landings_risk_report.latest/artifacts/public/landings_by_date.json";

function getCSSVariableValue(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

let TESTING_TAGS = {
  "testing-approved": getCSSVariableValue("--green-60"),
  "testing-exception-elsewhere": getCSSVariableValue("--blue-50"),
  "testing-exception-ui": getCSSVariableValue("--purple-50"),
  "testing-exception-unchanged": getCSSVariableValue("--yellow-50"),
  "testing-exception-other": getCSSVariableValue("--red-50"),
};

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
    // Ignore data before the testing policy took place.
    if (
      temporal.Temporal.Date.compare(
        temporal.Temporal.Date.from(date),
        // temporal.Temporal.Date.from("2020-09-15") Once we get the historical data
        temporal.Temporal.Date.from("2020-10-16")
      ) < 1
    ) {
      continue;
    }

    let returnedDataForDate = {};
    for (let tag in TESTING_TAGS) {
      returnedDataForDate[tag] = 0;
    }

    let originalData = data[date];
    for (let bug of originalData) {
      for (let tag of bug.testing) {
        returnedDataForDate[tag] = returnedDataForDate[tag] + 1;
      }
    }

    returnedData[date] = returnedDataForDate;
  }

  return returnedData;
}
