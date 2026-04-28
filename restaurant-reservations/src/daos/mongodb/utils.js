const { getCollection } = require("../../config/mongoDb");

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
};

const now = () => new Date();

const removeMongoId = (document) => {
  if (!document) {
    return null;
  }

  const { _id, ...cleanDocument } = document;
  return cleanDocument;
};

const getNextId = async (counterName) => {
  const counters = await getCollection("counters");

  const result = await counters.findOneAndUpdate(
    { _id: counterName },
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  const counter = result.value || result;
  return counter.sequence_value;
};

module.exports = {
  toNumber,
  now,
  removeMongoId,
  getNextId
};
