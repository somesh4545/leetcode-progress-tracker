chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchQuestionDetails") {
    try {
      const frontendTitle = document.querySelector(
        "div > div > div.flex.items-start.justify-between.gap-4 > div > div > a"
      ).textContent;
      let arr = frontendTitle.split(".");

      let difficulty = document.querySelector(".text-difficulty-easy")
        ? "Easy"
        : document.querySelector(".text-difficulty-medium")
        ? "Medium"
        : "Hard";

      const questionDetails = {
        questionId: arr[0],
        title: arr[1].trim(),
        difficulty: difficulty,
      };

      sendResponse(questionDetails);
    } catch (error) {
      console.warn("While getting content: ", error);
      sendResponse({ title: "0", questionId: 0, difficulty: "Easy" });
    }
  }
  return true;
});
