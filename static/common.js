// let METABUGS_URL =
//   "https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status&keywords=feature-testing-meta%2C%20&keywords_type=allwords";
let LANDINGS_URL =
  "https://community-tc.services.mozilla.com/api/index/v1/task/project.bugbug.landings_risk_report.latest/artifacts/public/landings_by_date.json";

function getCSSVariableValue(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

let TESTING_TAGS = {
  "testing-approved": getCSSVariableValue("--green-60"),
  "testing-exception-elsewhere": getCSSVariableValue("--blue-50"),
  "testing-exception-ui": getCSSVariableValue("--purple-50"),
  "testing-exception-unchanged": getCSSVariableValue("--yellow-50"),
  "testing-exception-other": getCSSVariableValue("--red-50"),
};

let taskclusterLandingsArtifact = (async function () {
  let response = await fetch(LANDINGS_URL, { cache: "no-store" });
  let json = await response.json();
  return json;
})();

let featureMetabugs = (async function () {
  let json = await taskclusterLandingsArtifact;
  return json.featureMetabugs;
})();

let landingsData = (async function () {
  let json = await taskclusterLandingsArtifact;
  json = json.landings;

  // Sort the dates so object iteration will be sequential:
  let orderedDates = [];
  for (let date in json) {
    orderedDates.push(date);
  }
  orderedDates.sort((a, b) => {
    return temporal.Temporal.Date.compare(
      temporal.Temporal.Date.from(a),
      temporal.Temporal.Date.from(b)
    );
  });

  let returnedObject = {};
  for (let date of orderedDates) {
    returnedObject[date] = json[date];
  }

  return returnedObject;
})();

function getNewTestingTagCountObject() {
  let obj = {};
  for (let tag in TESTING_TAGS) {
    obj[tag] = 0;
  }
  return obj;
}

async function getTestingPolicySummaryData(grouping = "daily") {
  let data = await landingsData;

  console.log(data);

  let dailyData = {};
  for (let date in data) {
    // Ignore data before the testing policy took place.
    if (
      temporal.Temporal.Date.compare(
        temporal.Temporal.Date.from(date),
        temporal.Temporal.Date.from("2020-09-15") // Once we get the historical data
        // temporal.Temporal.Date.from("2020-10-16")
      ) < 1
    ) {
      continue;
    }

    let returnedDataForDate = getNewTestingTagCountObject();

    let originalData = data[date];
    for (let bug of originalData) {
      for (let commit of bug.commits) {
        if (!commit.testing) {
          // returnedDataForDate["Missing"]
          // console.log(commit, date, bug);
        } else {
          for (let tag of commit.testing) {
            returnedDataForDate[tag] = returnedDataForDate[tag] + 1;
          }
        }
      }
    }

    dailyData[date] = returnedDataForDate;
  }

  // TODO:
  if (grouping == "weekly") {
    let weeklyData = {};
    for (let daily in dailyData) {
      let date = temporal.Temporal.Date.from(daily);
      let weekStart = date.minus({ days: date.dayOfWeek }).toString();

      if (!weeklyData[weekStart]) {
        weeklyData[weekStart] = getNewTestingTagCountObject();
      }

      weeklyData[weekStart.toString()] = getNewTestingTagCountObject();
      // console.log(date, date.weekOfYear, date.year, date.dayOfWeek);
    }
  } else if (grouping == "monthly") {
    // .toYearMonth()
  }

  // If grouping by week:
  // let foo = temporal.Temporal.Date.from("2020-10-09")
  // foo.weekOfYear
  // foo.year

  return dailyData;
}
