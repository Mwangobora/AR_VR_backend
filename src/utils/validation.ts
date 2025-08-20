const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'super_admin').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required()
});

const createLocationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().optional(),
  category: Joi.string().max(100).optional(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

const createHotspotSchema = Joi.object({
  location_id: Joi.number().integer().positive().required(),
  title: Joi.string().min(2).max(255).required(),
  description: Joi.string().optional(),
  map_x: Joi.number().required(),
  map_y: Joi.number().required(),
  hotspot_type: Joi.string().valid('panoramic', 'info', 'external_link').required(),
  icon_type: Joi.string().max(50).optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createLocationSchema,
  createHotspotSchema
};
