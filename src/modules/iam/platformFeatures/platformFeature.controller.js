/* src/modules/iam/platformFeatures/platformFeature.controller.js */

const {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  bulkCreateFeatures,
} = require("./platformFeature.service");

/* ---------------- LIST ---------------- */
async function list(req, res, next) {
  try {
    const data = await listFeatures(req.query);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/* ---------------- GET ONE ---------------- */
async function getOne(req, res, next) {
  try {
    const data = await getFeature(req.params.id);
    return res.json({ success: true, message: "Feature fetched successfully", data });
  } catch (e) {
    next(e);
  }
}

/* ---------------- BULK CREATE ---------------- */
async function createBulk(req, res, next) {
  try {
    const data = await bulkCreateFeatures(req.body);
    return res.status(201).json({ success: true, message: "Bulk Features created successfully", data });
  } catch (e) {
    next(e);
  }
}

/* ---------------- CREATE ---------------- */
async function create(req, res, next) {
  try {
    const data = await createFeature(req.body);
    return res.status(201).json({ success: true, message: "Feature created successfully", data });
  } catch (e) {
    next(e);
  }
}

/* ---------------- UPDATE ---------------- */
async function update(req, res, next) {
  try {
    const data = await updateFeature(req.params.id, req.body);
    return res.json({ success: true, message: "Feature updated successfully", data });
  } catch (e) {
    next(e);
  }
}

/* ---------------- DELETE ---------------- */
async function remove(req, res, next) {
  try {
    await deleteFeature(req.params.id);
    return res.json({ success: true, message: "Platform feature deleted" });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getOne, createBulk, create, update, remove };
