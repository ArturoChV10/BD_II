const path = require("path");

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: [path.join(__dirname, "tests", "setup.js")],
  testPathIgnorePatterns: ["/node_modules/"]
};
