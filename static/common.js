// let METABUGS_URL =
//   "https://bugzilla.mozilla.org/rest/bug?include_fields=id,summary,status&keywords=feature-testing-meta%2C%20&keywords_type=allwords";
let LANDINGS_URL =
  "https://community-tc.services.mozilla.com/api/index/v1/task/project.bugbug.landings_risk_report.latest/artifacts/public/landings_by_date.json";

function getCSSVariableValue(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

const EXPIRE_CACHE = (() => {
  localforage.config({
    driver: localforage.INDEXEDDB,
  });
  return {
    get: async (key) => {
      let data;
      try {
        data = await localforage.getItem(key);
      } catch (e) {}

      if (!data) return data;

      const { expire, value } = data;

      if (expire < Date.now()) {
        localforage.removeItem(key);
        return null;
      }

      return value;
    },
    set: (key, value, expire = false, callback = false) => {
      if (expire && typeof expire === "number")
        expire = Math.round(expire * 1000 + Date.now()); // * 1000 to use seconds

      return localforage.setItem(key, { value, expire }, expire && callback);
    },
  };
})();
let TESTING_TAGS = {
  "testing-approved": {
    color: getCSSVariableValue("--green-60"),
    label: "approved",
  },
  "testing-exception-unchanged": {
    color: getCSSVariableValue("--yellow-50"),
    label: "unchanged",
  },
  "testing-exception-elsewhere": {
    color: getCSSVariableValue("--blue-50"),
    label: "elsewhere",
  },
  "testing-exception-ui": {
    color: getCSSVariableValue("--purple-50"),
    label: "ui",
  },
  "testing-exception-other": {
    color: getCSSVariableValue("--red-50"),
    label: "other",
  },
  missing: {
    color: getCSSVariableValue("--red-80"),
    label: "missing",
  },
};

let taskclusterLandingsArtifact = (async function () {
  let json = await EXPIRE_CACHE.get("taskclusterLandingsArtifact");
  if (!json) {
    let response = await fetch(LANDINGS_URL);
    json = await response.json();
    EXPIRE_CACHE.set("taskclusterLandingsArtifact", json, 60 * 10);
  } else {
    console.log("cache hit", json);
  }

  return json;
})();

let featureMetabugs = (async function () {
  let json = await taskclusterLandingsArtifact;
  return json.featureMetaBugs;
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

  document.body.classList.remove("loading-data");

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
        if (!commit.testing || !commit.testing.length) {
          // XXX distinguish between unknown and missing
          returnedDataForDate.missing++;
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
