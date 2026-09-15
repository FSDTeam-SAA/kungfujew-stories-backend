const assert = require("node:assert/strict");
const test = require("node:test");
const RealShipmentStory = require("../model/realShipmentStoryModel");
const {
  getStories,
  getStoryBySlug,
  publishStory,
} = require("../controllers/realShipmentStoryController");

test("getStories limits public pagination and filters by service line", async () => {
  const originalFind = RealShipmentStory.find;
  const originalCountDocuments = RealShipmentStory.countDocuments;
  let findQuery;
  let countQuery;
  let skipped;
  let limited;

  RealShipmentStory.find = (query) => {
    findQuery = query;
    return {
      sort() {
        return this;
      },
      skip(value) {
        skipped = value;
        return this;
      },
      limit(value) {
        limited = value;
        return Promise.resolve([]);
      },
    };
  };
  RealShipmentStory.countDocuments = (query) => {
    countQuery = query;
    return Promise.resolve(0);
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
    await getStories(
      {
        headers: {},
        query: {
          page: "-2",
          limit: "500",
          serviceLine: "freight",
          search: "a.*",
        },
      },
      response
    );

    assert.equal(response.statusCode, 200);
    assert.equal(findQuery.isPublished, true);
    assert.equal(findQuery.serviceLine, "freight");
    assert.equal(findQuery.$or[0].title.$regex, "a\\.\\*");
    assert.deepEqual(countQuery, findQuery);
    assert.equal(skipped, 0);
    assert.equal(limited, 50);
    assert.equal(response.body.pagination.page, 1);
    assert.equal(response.body.pagination.limit, 50);
  } finally {
    RealShipmentStory.find = originalFind;
    RealShipmentStory.countDocuments = originalCountDocuments;
  }
});

test("getStoryBySlug excludes draft stories from public requests", async () => {
  const originalFindOne = RealShipmentStory.findOne;
  RealShipmentStory.findOne = () => Promise.resolve({ isPublished: false });
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
    await getStoryBySlug({ headers: {}, params: { slug: "draft-story" } }, response);
    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
  } finally {
    RealShipmentStory.findOne = originalFindOne;
  }
});

test("getStoryBySlug excludes published stories awaiting service-line review", async () => {
  const originalFindOne = RealShipmentStory.findOne;
  RealShipmentStory.findOne = () => Promise.resolve({ isPublished: true });
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
    await getStoryBySlug({ headers: {}, params: { slug: "unreviewed-story" } }, response);
    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
  } finally {
    RealShipmentStory.findOne = originalFindOne;
  }
});

test("publishStory requires a reviewed service line", async () => {
  const originalFindById = RealShipmentStory.findById;
  RealShipmentStory.findById = () => Promise.resolve({ isPublished: false });
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
    await publishStory(
      { params: { id: "story-id" }, body: { isPublished: true } },
      response
    );
    assert.equal(response.statusCode, 400);
    assert.match(response.body.message, /serviceLine/);
  } finally {
    RealShipmentStory.findById = originalFindById;
  }
});
