/**
 * Particle3DMesh System - Main export file
 * This file exports all components of the particle system for easy importing in Node.js environments.
 * For browser usage, include the individual script files directly in your HTML.
 */

// This file is only needed for Node.js environments.
// For browser usage, include the individual script files directly in your HTML:
// <script src="Config.js"></script>
// <script src="ExclusionZone.js"></script>
// <script src="Particle.js"></script>
// <script src="Camera.js"></script>
// <script src="Renderer.js"></script>
// <script src="ShapeManager.js"></script>
// <script src="AnimationController.js"></script>
// <script src="SpatialGrid.js"></script>
// <script src="Particle3DMesh.js"></script>

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
  const Particle3DMesh = require('./Particle3DMesh');
  const Particle = require('./Particle');
  const Camera = require('./Camera');
  const Renderer = require('./Renderer');
  const ShapeManager = require('./ShapeManager');
  const AnimationController = require('./AnimationController');
  const Config = require('./Config');
  const ExclusionZone = require('./ExclusionZone');
  const SpatialGrid = require('./SpatialGrid');

  module.exports = {
    Particle3DMesh,
    Particle,
    Camera,
    Renderer,
    ShapeManager,
    AnimationController,
    Config,
    ExclusionZone,
    SpatialGrid
  };
}
