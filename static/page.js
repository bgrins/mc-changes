// TODO: On click, show previous components affected by similar patches.
// TODO: On click, show previous bugs caused by similar patches.
// TODO: Pull live data from https://community-tc.services.mozilla.com/api/index/v1/task/project.bugbug.landings_risk_report.latest/artifacts/public/landings_by_date.json
// TODO: Convert the landing data into testing policy summary graph

const HIGH_RISK_COLOR = "rgb(255, 13, 87)";
const MEDIUM_RISK_COLOR = "darkkhaki";
const LOW_RISK_COLOR = "green";

let options = {
  metaBugID: {
    value: null,
    type: "text",
  },
  testingTags: {
    value: null,
    type: "select",
  },
  startDate: {
    value: null,
    type: "text",
  },
  endDate: {
    value: null,
    type: "text",
  },
  riskinessEnabled: {
    value: null,
    type: "checkbox",
  },
};

if (new URLSearchParams(window.location.search).has("riskiness")) {
  document.querySelector("#riskinessEnabled").checked = true;
}

let metabugsDropdown = document.querySelector("#featureMetabugs");

// TODO: port this to an option maybe
async function buildMetabugsDropdown() {
  metabugsDropdown.addEventListener("change", () => {
    setOption("metaBugID", metabugsDropdown.value);
    rebuildTable();
  });
  let bugs = await featureMetabugs;
  metabugsDropdown.innerHTML = `<option value="" selected>Choose a feature metabug</option>`;
  for (let bug of bugs) {
    let option = document.createElement("option");
    option.setAttribute("value", bug.id);
    option.textContent = bug.summary;
    metabugsDropdown.append(option);
  }
}

function getOption(name) {
  return options[name].value;
}

function getOptionType(name) {
  return options[name].type;
}

function setOption(name, value) {
  return (options[name].value = value);
}

function addRow(bugSummary) {
  let table = document.getElementById("table");

  let row = table.insertRow(table.rows.length);

  let num_column = document.createElement("th");
  num_column.scope = "row";
  num_column.appendChild(document.createTextNode(table.rows.length - 1));
  row.appendChild(num_column);

  let bug_column = row.insertCell(1);
  let bug_link = document.createElement("a");
  bug_link.textContent = `Bug ${bugSummary["id"]}`;
  bug_link.href = `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugSummary["id"]}`;
  bug_link.target = "_blank";
  bug_column.appendChild(bug_link);
  bug_column.appendChild(
    document.createTextNode(` - ${bugSummary["summary"]}`)
  );

  let components_percentages = Object.entries(
    bugSummary["most_common_regression_components"]
  );
  if (components_percentages.length > 0) {
    let component_container = document.createElement("div");
    component_container.classList.add("desc-box");
    bug_column.append(component_container);
    components_percentages.sort(
      ([component1, percentage1], [component2, percentage2]) =>
        percentage2 - percentage1
    );
    component_container.appendChild(
      document.createTextNode("Most common regression components:")
    );
    let component_list = document.createElement("ul");
    for (let [component, percentage] of components_percentages.slice(0, 3)) {
      let component_list_item = document.createElement("li");
      component_list_item.appendChild(
        document.createTextNode(
          `${component} - ${Math.round(100 * percentage)}%`
        )
      );
      component_list.appendChild(component_list_item);
    }
    component_container.appendChild(component_list);
  }

  /*<hr>
          The patches have a high chance of causing regressions of type <b>crash</b> and <b>high severity</b>.
          <br><br>
          The patches could affect the <b>Search</b> and <b>Bookmarks</b> features.
          <br><br>
          Examples of previous bugs caused by similar patches:
          <ul>
            <li>Bug 1 - Can"t bookmark pages</li>
            <li>Bug 7 - Search doesn"t work anymore <span style="background-color:gold;color:yellow;">STR</span></li>
          </ul>*/

  let date_column = row.insertCell(2);
  date_column.textContent = bugSummary.date;

  let testing_tags_column = row.insertCell(3);
  testing_tags_column.classList.add("testing-tags");
  let testing_tags_list = document.createElement("ul");
  for (let testing_tag of bugSummary["testing"]) {
    let testing_tags_list_item = document.createElement("li");
    testing_tags_list_item.appendChild(document.createTextNode(testing_tag));
    testing_tags_list.appendChild(testing_tags_list_item);
  }
  testing_tags_column.appendChild(testing_tags_list);

  if (getOption("riskinessEnabled")) {
    let risk_column = row.insertCell(4);
    let riskText = document.createElement("span");
    riskText.textContent = Math.round(100 * bugSummary["risk"]);
    if (bugSummary["risk"] > 0.8) {
      riskText.style.color = HIGH_RISK_COLOR;
    } else if (bugSummary["risk"] > 0.5) {
      riskText.style.color = MEDIUM_RISK_COLOR;
    } else {
      riskText.style.color = LOW_RISK_COLOR;
    }
    risk_column.appendChild(riskText);
  }
}

async function buildTable() {
  let data = await landingsData;
  let metaBugID = getOption("metaBugID");
  let testingTags = getOption("testingTags");

  let bugSummaries = [].concat.apply([], Object.values(data));
  if (metaBugID) {
    bugSummaries = bugSummaries.filter((bugSummary) =>
      bugSummary["meta_ids"].includes(Number(metaBugID))
    );
  }

  let startDate = getOption("startDate");
  if (startDate) {
    startDate = temporal.Temporal.Date.from(startDate);
    bugSummaries = bugSummaries.filter((bugSummary) => {
      return (
        temporal.Temporal.Date.compare(
          temporal.Temporal.Date.from(bugSummary.date),
          startDate
        ) >= 0
      );
    });
  }

  let endDate = getOption("endDate");
  if (endDate) {
    endDate = temporal.Temporal.Date.from(endDate);
    bugSummaries = bugSummaries.filter((bugSummary) => {
      return (
        temporal.Temporal.Date.compare(
          temporal.Temporal.Date.from(bugSummary.date),
          endDate
        ) <= 0
      );
    });
  }

  if (testingTags) {
    bugSummaries = bugSummaries.filter((bugSummary) =>
      bugSummary["testing"].some((tag) => testingTags.includes(tag))
    );
  }

  bugSummaries.reverse();
  if (getOption("riskinessEnabled")) {
    // bugSummaries.sort(
    //   (bugSummary1, bugSummary2) => bugSummary2["risk"] - bugSummary1["risk"]
    // );
    document.getElementById("riskinessColumn").style.removeProperty("display");
  } else {
    document.getElementById("riskinessColumn").style.display = "none";
  }

  for (let bugSummary of bugSummaries) {
    addRow(bugSummary);
  }
}

function rebuildTable() {
  let table = document.getElementById("table");

  while (table.rows.length > 1) {
    table.deleteRow(table.rows.length - 1);
  }

  buildTable();
}

(function init() {
  buildMetabugsDropdown();

  Object.keys(options).forEach(function (optionName) {
    let optionType = getOptionType(optionName);
    let elem = document.getElementById(optionName);

    if (optionType === "text") {
      setOption(optionName, elem.value);
      elem.addEventListener("change", function () {
        setOption(optionName, elem.value);
        rebuildTable();
      });
    } else if (optionType === "checkbox") {
      setOption(optionName, elem.checked);

      elem.onchange = function () {
        setOption(optionName, elem.checked);
        rebuildTable();
      };
    } else if (optionType === "select") {
      let value = [];
      for (let option of elem.options) {
        if (option.selected) {
          value.push(option.value);
        }
      }

      setOption(optionName, value);

      elem.onchange = function () {
        let value = [];
        for (let option of elem.options) {
          if (option.selected) {
            value.push(option.value);
          }
        }

        setOption(optionName, value);
        rebuildTable();
      };
    } else {
      throw new Error("Unexpected option type.");
    }
  });
  buildTable();
})();
