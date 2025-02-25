# Particle3DMesh

A modular, reusable 3D particle animation system for creating interactive web backgrounds and visualizations.

## Features

- 3D particle system with dynamic connections
- Smooth transitions between different particle formations
- Customizable shapes with exclusion zones
- Interactive scrolling effects
- Chromatic aberration and other visual effects
- Fully modular architecture for easy customization

## Components

The system is divided into several modular components:

- **Particle3DMesh**: Main class that coordinates all components
- **Particle**: Represents individual particles with position, velocity, and state
- **Camera**: Handles camera positioning and 3D to 2D projection
- **Renderer**: Manages drawing operations and visual effects
- **ShapeManager**: Creates and manages particle formations
- **AnimationController**: Handles transitions between shapes
- **Config**: Manages configuration settings
- **ExclusionZone**: Defines regions where particles cannot form connections

## Built-in Shapes

The system comes with several built-in shapes:

- **Random**: Default random distribution
- **Sphere**: Evenly distributed sphere
- **Iris**: Eye iris with pupil exclusion zone
- **Torus**: Donut shape
- **Cube**: Cube shape (solid or hollow)
- **Plane**: Flat plane of particles
- **Spiral**: Spiral formation

## Usage

### Basic Usage

```html
<!-- Include the required scripts -->
<script src="particle_network/Config.js"></script>
<script src="particle_network/ExclusionZone.js"></script>
<script src="particle_network/Particle.js"></script>
<script src="particle_network/Camera.js"></script>
<script src="particle_network/Renderer.js"></script>
<script src="particle_network/ShapeManager.js"></script>
<script src="particle_network/AnimationController.js"></script>
<script src="particle_network/Particle3DMesh.js"></script>

<script>
  // Initialize the particle mesh
  const particleMesh = new Particle3DMesh('canvasId', {
    PARTICLE_COUNT: 300,
    PARTICLE_SIZE: 3
  });
  
  // Start with random distribution
  particleMesh.setShape('random').start();
  
  // Transition to a sphere after 2 seconds
  setTimeout(() => {
    particleMesh.transitionToShape('sphere', {
      radius: 400
    }, 2000, 'easeInOut');
  }, 2000);
</script>
```

### Creating Custom Shapes

You can register custom shapes with the shape manager:

```javascript
// Register a custom shape
particleMesh.registerShape('customShape', (particles, options) => {
  // Position particles as needed
  particles.forEach((particle, index) => {
    // Calculate position based on custom algorithm
    const x = /* custom calculation */;
    const y = /* custom calculation */;
    const z = /* custom calculation */;
    
    particle.setTarget(x, y, z);
  });
  
  // Return shape object
  return {
    name: 'customShape',
    hasExclusionZone: false,
    crossesExclusionZone: () => false
  };
});

// Use the custom shape
particleMesh.transitionToShape('customShape', {
  // Custom options
}, 1000);
```

### Creating Shapes with Exclusion Zones

Exclusion zones prevent connections from crossing through specific regions:

```javascript
// Register a shape with exclusion zone
particleMesh.registerShape('shapeWithHole', (particles, options) => {
  // Position particles...
  
  // Create exclusion zone
  const exclusionZone = new ExclusionZone('sphere', {
    x: 0,
    y: 0,
    z: 0,
    radius: 100
  });
  
  return {
    name: 'shapeWithHole',
    hasExclusionZone: true,
    exclusionZone: exclusionZone,
    crossesExclusionZone: (p1, p2) => {
      // Check if line between particles crosses the exclusion zone
      return exclusionZone.intersectsLine(p1, p2);
    }
  };
});
```

## Configuration Options

The system can be customized with many configuration options:

```javascript
const customConfig = {
  // Particle parameters
  PARTICLE_COUNT: 500,
  PARTICLE_SIZE: 2,
  PARTICLE_SPEED: 0.3,
  BOUND: 1000,
  CONNECTION_DISTANCE: 250,
  
  // Visual effects
  BACKGROUND_COLOR: '#000',
  PARTICLE_COLOR: '#fff',
  CHROMATIC_OFFSET: 1.5,
  CHROMATIC_STRENGTH: 0.8,
  
  // Camera settings
  CAMERA_DISTANCE: 600,
  AUTO_ROTATION_SPEED: 0.0003,
  
  // And many more...
};

const particleMesh = new Particle3DMesh('canvasId', customConfig);
```

## Demo

Check out the included `demo.html` file for a complete demonstration of the system's capabilities.

## License

MIT
