
    (function () {
      let chart = null;
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

      async function rerender(grouping) {
        let summaryData = await getTestingPolicySummaryData(grouping);
        // console.log(summaryData);
        // TODO: Print summary percentages etc on top of graph

        let series = [];
        let colors = [];
        for (let tag in TESTING_TAGS) {
          series.push({ name: TESTING_TAGS[tag].label, data: [] });
          colors.push(TESTING_TAGS[tag].color);
        }

        let xaxisCategories = [];
        for (let date in summaryData) {
          xaxisCategories.push(date);
          let i = 0;
          for (let tag in summaryData[date]) {
            series[i].data.push(summaryData[date][tag]);
            i++;
          }
        }

        // var options = {
        //   series,
        //   colors,
        //   chart: {
        //     height: 350,
        //     type: "line",
        //     zoom: {
        //       enabled: false,
        //     },
        //   },
        //   dataLabels: {
        //     enabled: false,
        //   },
        //   stroke: {
        //     curve: "straight",
        //   },
        //   grid: {
        //     row: {
        //       colors: ["#f3f3f3", "transparent"], // takes an array which will be repeated on columns
        //       opacity: 0.5,
        //     },
        //   },
        //   xaxis: {
        //     categories: xaxisCategories,
        //   },
        // };

        if (chart) {
          chart.destroy();
        }

        var options = {
          series,
          colors,
          chart: {
            type: 'bar',
            height: 350,
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


        chart = new ApexCharts(document.querySelector("#chart"), options);
        chart.render();
      }
      rerender(previouslySelected ? previouslySelected.value : undefined);
    })();