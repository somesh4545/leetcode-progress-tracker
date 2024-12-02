const DEFAULT_GRAPH = document.getElementById("defaultGraph");
const EASY_GRAPH = document.getElementById("easyGraph");
const MEDIUM_GRAPH = document.getElementById("mediumGraph");
const HARD_GRAPH = document.getElementById("hardGraph");
const TIME_SPENT_GRAPH = document.getElementById("timeSpent");
const DEFAULT_COLOR = "#3033f5";
const EASY_COLOR = "#46c6c2";
const MEDIUM_COLOR = "#fac31d";
const HARD_COLOR = "#f8615c";
const TIME_SPENT = "#640D5F";
const graph_types = [
  DEFAULT_GRAPH,
  EASY_GRAPH,
  MEDIUM_GRAPH,
  HARD_GRAPH,
  TIME_SPENT_GRAPH,
];

let orgQuestionData = [];
let questionData = [];
let optionSelected = -1;
const prepareQuestionData = () => {
  const key = "questionSolvedDetails"; // Replace with your key
  chrome.storage.local.get([key], (result) => {
    if (!chrome.runtime.lastError) {
      orgQuestionData = result[key] || [];
      orgQuestionData.forEach((ques) => {
        ques.date = new Date(JSON.parse(ques.date));
      });
      orgQuestionData.sort((a, b) => a.date - b.date);
      questionData = orgQuestionData;
    }
  });
};

prepareQuestionData();

const ctx = document.getElementById("canvas");

let ctxInstance;

const createGraph = (labels, data, color = null) => {
  if (ctxInstance) {
    ctxInstance.destroy();
  }
  ctxInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "",
          data: data,
          borderWidth: 1,
        },
      ],
    },
    options: {
      elements: {
        line: {
          tension: 0.2,
          borderWidth: 5,
          backgroundColor: !color ? DEFAULT_COLOR : color,
          borderColor: !color ? DEFAULT_COLOR : color,
        },
        point: {
          backgroundColor: !color ? DEFAULT_COLOR : color,
          color: !color ? DEFAULT_COLOR : color,
        },
      },
      scales: {
        x: {
          ticks: {
            callback: function (value, index, ticks_array) {
              let characterLimit = 3;
              let label = this.getLabelForValue(value);
              if (label.length >= characterLimit) {
                return label
                  .slice(0, label.length)
                  .substring(0, characterLimit - 1)
                  .trim();
              }
              return label;
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (tooltipItem) {
              const seconds = tooltipItem.raw;
              let time_label = "";
              if (seconds >= 60) {
                time_label += ` ${Math.floor(seconds / 60)} m`;
              }
              if (seconds % 60 != 0 && seconds != 0) {
                time_label += ` ${seconds % 60} s`;
              }
              return `Time: ${time_label}`;
            },
          },
        },
      },
    },
  });
};

const createDefaultGraph = () => {
  const labels = questionData.map(
    (ques) => ques.questionId + " - " + ques.title
  );
  const data = questionData.map((ques) => ques.timeTaken);
  createGraph(labels, data, DEFAULT_COLOR);
};

const createGraphBasedOnDifficulty = (id) => {
  const parsedQues = questionData.filter(
    (ques) =>
      ques.difficulty === (id == 0 ? "Easy" : id == 1 ? "Medium" : "Hard")
  );
  const labels = parsedQues.map((ques) => ques.questionId + " - " + ques.title);
  const data = parsedQues.map((ques) => ques.timeTaken);
  createGraph(
    labels,
    data,
    id == 0 ? EASY_COLOR : id == 1 ? MEDIUM_COLOR : HARD_COLOR
  );
};

const createGraphBasedOnTimeSpend = () => {
  const parseDataByDate = (data) => {
    const groupedData = data.reduce((acc, obj) => {
      const dateKey = obj.date.toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { timeTaken: 0, frequency: 0 };
      }
      acc[dateKey].timeTaken += obj.timeTaken;
      acc[dateKey].frequency += 1;
      return acc;
    }, {});
    return Object.entries(groupedData).map(
      ([date, { timeTaken, frequency }]) => ({
        date,
        timeTaken,
        frequency,
      })
    );
  };

  const result = parseDataByDate(questionData);
  const labels = result.map(
    (item) => item.date + " \nSolved - " + item.frequency
  );
  const data = result.map((item) => item.timeTaken);

  createGraph(labels, data, TIME_SPENT);
};

const updateButtonClick = (id) => {
  for (const g of graph_types) g.style.borderColor = "#000";
  optionSelected = id;
  if (id == 0) {
    DEFAULT_GRAPH.style.borderColor = DEFAULT_COLOR;
    createDefaultGraph();
  } else if (id == 1) {
    EASY_GRAPH.style.borderColor = EASY_COLOR;
    createGraphBasedOnDifficulty(0);
  } else if (id == 2) {
    MEDIUM_GRAPH.style.borderColor = MEDIUM_COLOR;
    createGraphBasedOnDifficulty(1);
  } else if (id == 3) {
    HARD_GRAPH.style.borderColor = HARD_COLOR;
    createGraphBasedOnDifficulty(2);
  } else if (id == 4) {
    TIME_SPENT_GRAPH.style.borderColor = TIME_SPENT;
    createGraphBasedOnTimeSpend();
  }
};

DEFAULT_GRAPH.addEventListener("click", () => {
  updateButtonClick(0);
});
EASY_GRAPH.addEventListener("click", () => {
  updateButtonClick(1);
});
MEDIUM_GRAPH.addEventListener("click", () => {
  updateButtonClick(2);
});
HARD_GRAPH.addEventListener("click", () => {
  updateButtonClick(3);
});
TIME_SPENT_GRAPH.addEventListener("click", () => {
  updateButtonClick(4);
});

// for the select option
document.getElementsByTagName("select")[0].onchange = function () {
  var index = this.selectedIndex;
  const currentTime = new Date();
  if (index == 1) {
    const sevenDaysAgo = new Date(currentTime);
    sevenDaysAgo.setDate(currentTime.getDate() - 7);
    questionData = orgQuestionData.filter((ques) => ques.date >= sevenDaysAgo);
  } else if (index == 2) {
    const thirtyDaysAgo = new Date(currentTime);
    thirtyDaysAgo.setDate(currentTime.getDate() - 30);
    questionData = orgQuestionData.filter((ques) => ques.date >= thirtyDaysAgo);
  } else if (index == 3) {
    const ninetyDaysAgo = new Date(currentTime);
    ninetyDaysAgo.setDate(currentTime.getDate() - 90);
    questionData = orgQuestionData.filter((ques) => ques.date >= ninetyDaysAgo);
  } else {
    questionData = orgQuestionData;
  }
  updateButtonClick(optionSelected);
};
