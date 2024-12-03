chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    /leetcode\.com\/problems\//.test(tab.url)
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
  }
});

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

console.log("Extension working!");
