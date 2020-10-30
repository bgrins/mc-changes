
    (function () {
      let charts = {
        all: null,
        backedout: null,
        regression: null,
      };
      let radios = [...document.querySelectorAll("input[name=grouping]")];
      var previouslySelected = document.querySelector("input[name=grouping]:checked");
      for (let radio of radios) {
        radio.addEventListener("change", function () {
          if (this !== previouslySelected) {
            previouslySelected = this;
            rerender(this.value);
          }
        });
      }

      function rerenderChart(name, data) {
        let series = [];
        let colors = [];
        for (let tag in TESTING_TAGS) {
          series.push({ name: TESTING_TAGS[tag].label, data: [] });
          colors.push(TESTING_TAGS[tag].color);
        }

        let xaxisCategories = [];
        for (let date in data) {
          xaxisCategories.push(date);
          let i = 0;
          for (let tag in data[date]) {
            series[i].data.push(data[date][tag]);
            i++;
          }
        }

        var options = {
          series,
          colors,
          chart: {
            type: 'bar',
            height: 300,
            stacked: true,
            toolbar: {
              show: true
            },
            zoom: {
              enabled: true
            }
          },
          plotOptions: {
            bar: {
              horizontal: false,
            },
          },
          xaxis: {
            categories: xaxisCategories
          }
        };

        // TODO: Print summary percentages etc on top of graph
        let chartContainer = document.querySelector(`#${name}-chart`)

        if (charts[name]) {
          charts[name].destroy();
        }
        charts[name] = new ApexCharts(chartContainer.querySelector(".chart"), options);
        charts[name].render();
      }

      async function rerender(grouping) {
        let allData = await getTestingPolicySummaryData(grouping);
        rerenderChart("all", allData);

        // let backedoutData = await getTestingPolicySummaryData(grouping, (bug) => {
        //   return false;
        // });
        // rerenderChart("backedout", backedoutData);

        // let regressionData = await getTestingPolicySummaryData(grouping);
        // rerenderChart("regression", regressionData);
      }
      rerender(previouslySelected ? previouslySelected.value : undefined);
    })();