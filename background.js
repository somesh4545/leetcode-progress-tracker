chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    /leetcode\.com\/problems\//.test(tab.url)
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
    // setTimeout(async () => {
    //   const question_details = await getQuestionDetails();
    //   console.log(question_details);
    // }, 2000);
  }
});

let headers = null;

chrome.webRequest.onSendHeaders.addListener(
  async function (details) {
    if (details.method === "POST" && details.requestBody) {
      headers = details.requestHeaders;
      console.log(headers);
      return;
    }
  },
  { urls: ["*://leetcode.com/graphql*"] },
  ["requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    if (details.method === "POST" && details.requestBody) {
      const rawBody = details.requestBody.raw[0]?.bytes;
      if (rawBody) {
        const decodedBody = new TextDecoder().decode(new Uint8Array(rawBody));

        try {
          const bodyObj = JSON.parse(decodedBody);
          if (bodyObj && bodyObj.operationName == "updateSubmissionNote") {
            // [ Time taken: 1 m 9 s ]
            const note = bodyObj.variables.note;
            const timeTken = calculateTImeTaken(note);

            console.log("Time taken: ", timeTken);
            if (timeTken == 0) return;

            const question_details = await getQuestionDetails();
            console.log(question_details);

            storeQuestionSolvedDetails(question_details, timeTken);
          }
        } catch (e) {
          console.warn("Request body is not valid JSON:", decodedBody);
        }
      }
    }
  },
  { urls: ["*://leetcode.com/graphql*"] },
  ["requestBody"]
);

const getQuestionDetails = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(
          tabId,
          { action: "fetchQuestionDetails" },
          function (response) {
            if (response) {
              resolve(response);
            } else {
              resolve({ title: "0", questionId: 0, difficulty: "Easy" });
            }
          }
        );
      } else {
        reject(new Error("No active tab found"));
      }
    });
  });
};

const calculateTImeTaken = (note) => {
  console.log(note);
  const parts = note.split("[ Time taken:");
  if (parts.length < 2) {
    console.warn("Unable to parse: ", note);
    return;
  }
  const timePart = parts[1].replace("]", "").trim();

  let totalSeconds = 0;

  const minuteMatch = timePart.match(/(\d+)\s*m/); // Matches "X m"
  const secondMatch = timePart.match(/(\d+)\s*s/); // Matches "Y s"

  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
  }
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1], 10);
  }

  return totalSeconds;
};

const fetchQuestionsSolvedArr = (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        resolve([]);
      } else {
        console.log(`Array retrieved for key "${key}":`, result[key]);
        resolve(result[key]);
      }
    });
  });
};

const storeQuestionArr = (key, array) => {
  chrome.storage.local.set({ [key]: array }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error storing data:", chrome.runtime.lastError);
    } else {
      console.log(`Array stored under key "${key}":`, array);
    }
  });
};

const key = "questionSolvedDetails";

const storeQuestionSolvedDetails = async (question_details, timeTken) => {
  if (!question_details || question_details?.title == "0") return;

  try {
    const obj = {
      questionId: question_details.questionId,
      title: question_details.title,
      difficulty: question_details.difficulty,
      timeTaken: timeTken,
      date: JSON.stringify(new Date()),
    };
    const data = await fetchQuestionsSolvedArr(key);
    const updatedArray = data ? [...data, obj] : [obj];
    storeQuestionArr(key, updatedArray);
  } catch (error) {
    console.log("Error while storing question details");
    console.log(error);
  }
};

// const questionData = [
//   {
//     questionId: "1",
//     title: "Two Sum",
//     difficulty: "Easy",
//     timeTaken: 12, // in minutes
//     date: JSON.stringify(new Date(2024, 10, 1)), // Nov 1, 2024
//   },
//   {
//     questionId: "2",
//     title: "Add Two Numbers",
//     difficulty: "Medium",
//     timeTaken: 45,
//     date: JSON.stringify(new Date(2024, 10, 5)), // Nov 5, 2024
//   },
//   {
//     questionId: "3",
//     title: "Longest Substring Without Repeating Characters",
//     difficulty: "Medium",
//     timeTaken: 50,
//     date: JSON.stringify(new Date(2024, 10, 10)), // Nov 10, 2024
//   },
//   {
//     questionId: "4",
//     title: "Median of Two Sorted Arrays",
//     difficulty: "Hard",
//     timeTaken: 120,
//     date: JSON.stringify(new Date(2024, 10, 15)), // Nov 15, 2024
//   },
//   {
//     questionId: "5",
//     title: "Container With Most Water",
//     difficulty: "Medium",
//     timeTaken: 35,
//     date: JSON.stringify(new Date(2024, 10, 20)), // Nov 20, 2024
//   },
//   {
//     questionId: "6",
//     title: "Valid Parentheses",
//     difficulty: "Easy",
//     timeTaken: 15,
//     date: JSON.stringify(new Date(2024, 10, 25)), // Nov 25, 2024
//   },
//   {
//     questionId: "7",
//     title: "Reverse Integer",
//     difficulty: "Easy",
//     timeTaken: 18,
//     date: JSON.stringify(new Date(2024, 10, 27)), // Nov 27, 2024
//   },
//   {
//     questionId: "8",
//     title: "Regular Expression Matching",
//     difficulty: "Hard",
//     timeTaken: 150,
//     date: JSON.stringify(new Date(2024, 10, 28)), // Nov 28, 2024
//   },
//   {
//     questionId: "9",
//     title: "Palindrome Number",
//     difficulty: "Easy",
//     timeTaken: 10,
//     date: JSON.stringify(new Date(2024, 11, 1)), // Dec 1, 2024
//   },
//   {
//     questionId: "10",
//     title: "3Sum",
//     difficulty: "Medium",
//     timeTaken: 70,
//     date: JSON.stringify(new Date(2024, 11, 2)), // Dec 2, 2024
//   },
//   {
//     questionId: "11",
//     title: "Binary Search",
//     difficulty: "Easy",
//     timeTaken: 20,
//     date: JSON.stringify(new Date(2024, 10, 2)), // Nov 2, 2024
//   },
//   {
//     questionId: "12",
//     title: "Climbing Stairs",
//     difficulty: "Easy",
//     timeTaken: 12,
//     date: JSON.stringify(new Date(2024, 10, 3)), // Nov 3, 2024
//   },
//   {
//     questionId: "13",
//     title: "Merge Two Sorted Lists",
//     difficulty: "Easy",
//     timeTaken: 25,
//     date: JSON.stringify(new Date(2024, 10, 6)), // Nov 6, 2024
//   },
//   {
//     questionId: "14",
//     title: "Search in Rotated Sorted Array",
//     difficulty: "Medium",
//     timeTaken: 40,
//     date: JSON.stringify(new Date(2024, 10, 8)), // Nov 8, 2024
//   },
//   {
//     questionId: "15",
//     title: "Combination Sum",
//     difficulty: "Medium",
//     timeTaken: 55,
//     date: JSON.stringify(new Date(2024, 10, 12)), // Nov 12, 2024
//   },
//   {
//     questionId: "16",
//     title: "Maximum Subarray",
//     difficulty: "Easy",
//     timeTaken: 30,
//     date: JSON.stringify(new Date(2024, 10, 16)), // Nov 16, 2024
//   },
//   {
//     questionId: "17",
//     title: "Sudoku Solver",
//     difficulty: "Hard",
//     timeTaken: 180,
//     date: JSON.stringify(new Date(2024, 10, 18)), // Nov 18, 2024
//   },
//   {
//     questionId: "18",
//     title: "Word Search",
//     difficulty: "Medium",
//     timeTaken: 60,
//     date: JSON.stringify(new Date(2024, 10, 22)), // Nov 22, 2024
//   },
//   {
//     questionId: "19",
//     title: "Unique Paths",
//     difficulty: "Medium",
//     timeTaken: 50,
//     date: JSON.stringify(new Date(2024, 10, 23)), // Nov 23, 2024
//   },
//   {
//     questionId: "20",
//     title: "LRU Cache",
//     difficulty: "Hard",
//     timeTaken: 120,
//     date: JSON.stringify(new Date(2024, 10, 29)), // Nov 29, 2024
//   },
//   {
//     questionId: "21",
//     title: "Minimum Path Sum",
//     difficulty: "Medium",
//     timeTaken: 35,
//     date: JSON.stringify(new Date(2024, 10, 30)), // Nov 30, 2024
//   },
//   {
//     questionId: "22",
//     title: "Longest Palindromic Substring",
//     difficulty: "Medium",
//     timeTaken: 75,
//     date: JSON.stringify(new Date(2024, 11, 3)), // Dec 3, 2024
//   },
//   {
//     questionId: "23",
//     title: "Trapping Rain Water",
//     difficulty: "Hard",
//     timeTaken: 140,
//     date: JSON.stringify(new Date(2024, 11, 4)), // Dec 4, 2024
//   },
//   {
//     questionId: "24",
//     title: "Generate Parentheses",
//     difficulty: "Medium",
//     timeTaken: 60,
//     date: JSON.stringify(new Date(2024, 11, 6)), // Dec 6, 2024
//   },
//   {
//     questionId: "25",
//     title: "Spiral Matrix",
//     difficulty: "Medium",
//     timeTaken: 45,
//     date: JSON.stringify(new Date(2024, 11, 7)), // Dec 7, 2024
//   },
//   {
//     questionId: "26",
//     title: "Merge Intervals",
//     difficulty: "Medium",
//     timeTaken: 50,
//     date: JSON.stringify(new Date(2024, 11, 9)), // Dec 9, 2024
//   },
//   {
//     questionId: "27",
//     title: "Largest Rectangle in Histogram",
//     difficulty: "Hard",
//     timeTaken: 125,
//     date: JSON.stringify(new Date(2024, 11, 11)), // Dec 11, 2024
//   },
//   {
//     questionId: "28",
//     title: "Sliding Window Maximum",
//     difficulty: "Hard",
//     timeTaken: 90,
//     date: JSON.stringify(new Date(2024, 11, 13)), // Dec 13, 2024
//   },
//   {
//     questionId: "29",
//     title: "Word Ladder",
//     difficulty: "Hard",
//     timeTaken: 150,
//     date: JSON.stringify(new Date(2024, 11, 15)), // Dec 15, 2024
//   },
//   {
//     questionId: "30",
//     title: "Longest Consecutive Sequence",
//     difficulty: "Medium",
//     timeTaken: 60,
//     date: JSON.stringify(new Date(2024, 11, 17)), // Dec 17, 2024
//   },
// ];

// storeQuestionArr(key, questionData);

console.log("Extension working!");
