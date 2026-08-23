const { getGraph } = require("../../helpers/linkUtils");
const { getFileTree } = require("../../helpers/filetreeUtils");
const { userComputed } = require("../../helpers/userUtils");
const settings = require("../../helpers/constants");

const allSettings = settings.ALL_NOTE_SETTINGS;

function resolveSettings(data) {
  const noteSettings = {};
  allSettings.forEach((setting) => {
    let noteSetting = data[setting];
    let globalSetting = process.env[setting];

    let settingValue =
      noteSetting || (globalSetting === "true" && noteSetting !== false);
    noteSettings[setting] = settingValue;
  });
  return noteSettings;
}

module.exports = {
  graph: async (data) => await getGraph(data),
  filetree: (data) => getFileTree(data),
  userComputed: (data) => userComputed(data),
  noteProps: (data) => data["dg-note-properties"],
  settings: resolveSettings,
};
