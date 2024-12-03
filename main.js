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
      openDefaultGraph();
    }
  });
};

prepareQuestionData();

const ctx = document.getElementById("canvas");

let ctxInstance;

const createGraph = (labels, data, quesNo, color = null) => {
  if (ctxInstance) {
    ctxInstance.destroy();
  }
  ctxInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Questions Solved: " + quesNo,
          data: data,
          borderWidth: 1,
        },
      ],
    },
    cubicInterpolationMode: "monotone",
    options: {
      elements: {
        line: {
          tension: 0.4,
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
          beginAtZero: false, // Avoid cutting off at the start
          offset: true, // Add padding to the start and end of the axis
          ticks: {
            callback: function (value, index, ticks_array) {
              let characterLimit = 5;
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
        y: {
          title: {
            display: true,
            text: "Seconds",
            font: {
              size: 14,
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
  createGraph(labels, data, data.length, DEFAULT_COLOR);
  createStatsTable(questionData);
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
    data.length,
    id == 0 ? EASY_COLOR : id == 1 ? MEDIUM_COLOR : HARD_COLOR
  );
  createStatsTable(parsedQues);
};

const createGraphBasedOnTimeSpend = () => {
  const parseDataByDate = (data) => {
    const groupedData = data.reduce((acc, obj) => {
      const date = obj.date;
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const dateKey = `${day}-${month}-${year}`;

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
    (item) => item.date + " \nSolved: " + item.frequency
  );
  const data = result.map((item) => item.timeTaken);
  const quesNo = result.reduce((sum, item) => sum + item.frequency, 0);
  createGraph(labels, data, quesNo, TIME_SPENT);
  createStatsTable(result);
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

const openDefaultGraph = () => {
  updateButtonClick(0);
};

// to create a stats table
const statsTable = document.getElementById("statsTable");

const convertSecondsToLeetcodeFormat = (timeInSeconds) => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  let label = "";
  if (minutes != 0) label = `${minutes} m `;
  if (seconds != 0) label += `${seconds} s`;
  return label;
};

const createStatsTable = (data) => {
  const noOfQues = data.length;
  statsTable.innerHTML = "";
  if (noOfQues == 0) {
    return;
  }
  const totalTimeTaken = data.reduce((sum, item) => sum + item.timeTaken, 0);

  const avg = totalTimeTaken / noOfQues;
  const lowest = data.reduce((low, item) => {
    return Math.min(low, item.timeTaken);
  }, 1e9);
  const maximum = data.reduce(
    (high, item) => Math.max(high, item.timeTaken),
    0
  );

  const columnTitles = ["Stats", "Time"];
  const rows = [
    {
      name: "Average Time",
      value: convertSecondsToLeetcodeFormat(avg.toFixed(2)),
    },
    { name: "Minimum Time", value: convertSecondsToLeetcodeFormat(lowest) },
    { name: "Maximum Time", value: convertSecondsToLeetcodeFormat(maximum) },
  ];

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.margin = "20px auto";
  table.style.width = "50%";
  table.style.textAlign = "left";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columnTitles.forEach((title) => {
    const th = document.createElement("th");
    th.textContent = title;
    th.style.border = "1px solid #ddd";
    th.style.padding = "10px";
    th.style.backgroundColor = "#f2f2f2";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");

    const statsCell = document.createElement("td");
    statsCell.textContent = row.name;
    statsCell.style.border = "1px solid #ddd";
    statsCell.style.padding = "10px";
    tr.appendChild(statsCell);

    const valueCell = document.createElement("td");
    valueCell.textContent = row.value;
    valueCell.style.border = "1px solid #ddd";
    valueCell.style.padding = "10px";
    tr.appendChild(valueCell);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  statsTable.appendChild(table);
};

// share the extnesion function
document.getElementById("shareBtn").addEventListener("click", () => {
  const textToShare =
    "I'm using this awesome Chrome extension to track how much time I spend solving LeetCode questions. It helps me analyze and improve my performance over time! 📈\n🔗 Get it here: https://github.com/somesh4545/leetcode-progress-tracker/\nHow it works:\n1️⃣ Tracks time spent on each question automatically.\n2️⃣ Provides stats and visualizations to help you improve.\n3️⃣ Simple to use—just solve problems and check your stats anytime!\n\nIt's been a game-changer for me—give it a try and share your progress! 🎯";

  navigator.clipboard
    .writeText(textToShare)
    .then(() => {
      alert("Text is copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy text");
      console.log(err);
    });
});
