function userMarkdownSetup(md) {
  // The md parameter stands for the markdown-it instance used throughout the site generator.
  // Feel free to add any plugin you want here instead of /.eleventy.js
}
function userEleventySetup(eleventyConfig) {
  // The eleventyConfig parameter stands for the the config instantiated in /.eleventy.js.
  // Feel free to add any plugin you want here instead of /.eleventy.js
  const {
    STATUS_LABELS,
    gardenNotes,
    gardenTopics,
    gardenTypes,
    gardenHubs,
    labelFromValue,
  } = require("./gardenMetadata");

  eleventyConfig.addFilter("gardenNotes", gardenNotes);
  eleventyConfig.addFilter("gardenTopics", gardenTopics);
  eleventyConfig.addFilter("gardenTypes", gardenTypes);
  eleventyConfig.addFilter("gardenHubs", gardenHubs);
  eleventyConfig.addFilter("gardenStatusLabel", (status) => STATUS_LABELS[status] || "");
  eleventyConfig.addFilter("gardenLabel", labelFromValue);
}
exports.userMarkdownSetup = userMarkdownSetup;
exports.userEleventySetup = userEleventySetup;
