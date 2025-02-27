/**
 * SpatialGrid - Manages a spatial partitioning grid for efficient proximity checks
 * Divides 3D space into cells and tracks which particles are in each cell
 */
class SpatialGrid {
  /**
   * Create a new spatial grid
   * @param {number} cellSize - Size of each grid cell (typically equal to CONNECTION_DISTANCE)
   * @param {number} bound - The boundary size of the world (from -bound to +bound)
   */
  constructor(cellSize, bound) {
    this.cellSize = cellSize;
    this.bound = bound;
    this.grid = {}; // Maps cell keys to arrays of particles
  }

  /**
   * Clear the grid
   */
  clear() {
    this.grid = {};
  }

  /**
   * Get the cell key for a given position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {string} - Cell key in the format "x_y_z"
   */
  getCellKey(x, y, z) {
    const cx = Math.floor((x + this.bound) / this.cellSize);
    const cy = Math.floor((y + this.bound) / this.cellSize);
    const cz = Math.floor((z + this.bound) / this.cellSize);
    return `${cx}_${cy}_${cz}`;
  }

  /**
   * Add a particle to the grid
   * @param {Particle} particle - The particle to add
   */
  addParticle(particle) {
    const key = this.getCellKey(particle.x, particle.y, particle.z);
    if (!this.grid[key]) {
      this.grid[key] = [];
    }
    this.grid[key].push(particle);
  }

  /**
   * Add multiple particles to the grid
   * @param {Array<Particle>} particles - Array of particles to add
   */
  addParticles(particles) {
    this.clear();
    for (const particle of particles) {
      this.addParticle(particle);
    }
  }

  /**
   * Get all neighboring cells for a given cell
   * @param {string} cellKey - The cell key in format "x_y_z"
   * @returns {Array<string>} - Array of neighboring cell keys
   */
  getNeighborKeys(cellKey) {
    const [cx, cy, cz] = cellKey.split('_').map(Number);
    const neighbors = [];
    
    // Check all 27 cells in the 3x3x3 neighborhood (including the center cell)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const neighborKey = `${cx + dx}_${cy + dy}_${cz + dz}`;
          neighbors.push(neighborKey);
        }
      }
    }
    
    return neighbors;
  }

  /**
   * Get all particles in a given cell
   * @param {string} cellKey - The cell key
   * @returns {Array<Particle>} - Array of particles in the cell
   */
  getParticlesInCell(cellKey) {
    return this.grid[cellKey] || [];
  }

  /**
   * Get all particles in a cell and its neighboring cells
   * @param {string} cellKey - The cell key
   * @returns {Array<Particle>} - Array of particles in the cell and neighboring cells
   */
  getParticlesInNeighborhood(cellKey) {
    const neighborKeys = this.getNeighborKeys(cellKey);
    const particles = [];
    
    for (const key of neighborKeys) {
      if (this.grid[key]) {
        particles.push(...this.grid[key]);
      }
    }
    
    return particles;
  }
}

// Export for browser usage

export default SpatialGrid;