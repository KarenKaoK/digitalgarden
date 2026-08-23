require("dotenv").config();
const { pickNoteMetadata } = require("../../helpers/bases-engine/noteMetadata");
const { normalizeStatus, getUserProperty } = require("../../helpers/gardenMetadata");

module.exports = {
  eleventyComputed: {
    layout: (data) => {
      if (data.tags.indexOf("gardenEntry") != -1) {
        return "layouts/index.njk";
      }
      return "layouts/note.njk";
    },
    permalink: (data) => {
      if (data.tags.indexOf("gardenEntry") != -1) {
        return "/";
      }
      return data.permalink || undefined;
    },
    basesNotes: (data) => {
      if (!data.collections || !data.collections.note) return [];
      return data.collections.note.map((item) => ({
        path: item.filePathStem.replace("/notes/", ""),
        url: item.url,
        metadata: pickNoteMetadata(item.data),
        fileSlug: item.fileSlug,
      }));
    },
    maturityStatus: (data) => {
      return normalizeStatus(getUserProperty(data, "status"));
    },
  },
};
