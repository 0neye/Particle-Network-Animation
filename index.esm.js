/**
 * Particle3DMesh System - ESM export file
 * This file exports all components of the particle system for ES module environments like Nuxt 3.
 */

// Import all modules
import Particle3DMesh from './Particle3DMesh.esm.js';
import Particle from './Particle.esm.js';
import Camera from './Camera.esm.js';
import Renderer from './Renderer.esm.js';
import WebGLRenderer from './WebGLRenderer.esm.js';
import ShapeManager from './ShapeManager.esm.js';
import AnimationController from './AnimationController.esm.js';
import Config from './Config.esm.js';
import ExclusionZone from './ExclusionZone.esm.js';
import SpatialGrid from './SpatialGrid.esm.js';
import Matrix4 from './Matrix4.esm.js';

// Export all components
export {
  Particle3DMesh,
  Particle,
  Camera,
  Renderer,
  WebGLRenderer,
  ShapeManager,
  AnimationController,
  Config,
  ExclusionZone,
  SpatialGrid,
  Matrix4
};

// Default export for convenience
export default Particle3DMesh;
