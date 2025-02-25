/**
 * Particle3DMesh System - Main export file
 * This file exports all components of the particle system for easy importing
 */

// Import all classes
const Particle3DMesh = require('./Particle3DMesh');
const Particle = require('./Particle');
const Camera = require('./Camera');
const Renderer = require('./Renderer');
const ShapeManager = require('./ShapeManager');
const AnimationController = require('./AnimationController');
const Config = require('./Config');
const ExclusionZone = require('./ExclusionZone');

// Export all classes
module.exports = {
  Particle3DMesh,
  Particle,
  Camera,
  Renderer,
  ShapeManager,
  AnimationController,
  Config,
  ExclusionZone
};
