const assert = require("node:assert/strict");
const test = require("node:test");
const Project = require("../model/projectModel");
const { getProjects } = require("../controllers/projectController");

test("getProjects applies every search word before pagination and counting", async () => {
  const originalFind = Project.find;
  const originalCountDocuments = Project.countDocuments;
  let findQuery;
  let countQuery;

  Project.find = (query) => {
    findQuery = query;
    return {
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit() {
        return Promise.resolve([{ name: "Blue Cargo", category: "International" }]);
      },
    };
  };
  Project.countDocuments = (query) => {
    countQuery = query;
    return Promise.resolve(1);
  };

  const response = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
    },
  };

  try {
    await getProjects(
      { query: { page: "1", limit: "10", search: "Blue Cargo" } },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(findQuery.$and.length, 2);
    assert.deepEqual(countQuery, findQuery);
  } finally {
    Project.find = originalFind;
    Project.countDocuments = originalCountDocuments;
  }
});
