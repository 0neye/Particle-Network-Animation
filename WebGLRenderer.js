class WebGLRenderer {
    /**
     * Create a new WebGLRenderer.
     * @param {HTMLCanvasElement} canvas - The canvas element.
     * @param {Object} config - The configuration object.
     */
    constructor(canvas, config) {
      this.canvas = canvas;
      this.config = config;
      this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!this.gl) {
        console.error('WebGL not supported! Falling back to Canvas renderer.');
        return;
      }
      // Enable blending for transparency.
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    
      this.initShaders();
      this.initBuffers();
    
      // Preallocate arrays for particle drawing.
      // Each particle channel uses 8 floats: [x, y, z, pointSize, r, g, b, a]
      this._maxParticles = config.PARTICLE_COUNT;
      this._glowArray = new Float32Array(this._maxParticles * 8);
      this._redArray = new Float32Array(this._maxParticles * 8);
      this._blueArray = new Float32Array(this._maxParticles * 8);
      this._whiteArray = new Float32Array(this._maxParticles * 8);
    
      // Preallocate arrays for connection lines. We assume an initial maximum.
      this._maxConnections = 1024;
      // Each connection yields two vertices, with 7 floats per vertex: [x, y, z, r, g, b, a]
      this._redLineArray = new Float32Array(this._maxConnections * 14);
      this._blueLineArray = new Float32Array(this._maxConnections * 14);
      this._whiteLineArray = new Float32Array(this._maxConnections * 14);
    }
    
    initShaders() {
      const gl = this.gl;
    
      // Vertex shader for particles.
      const vsSourceParticles = `
        attribute vec3 aVertexPosition;
        attribute float aPointSize;
        attribute vec4 aColor;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform vec3 uCameraPosition;
        uniform float uFogStart;
        uniform float uFogEnd;
        varying vec4 vColor;
    
        void main(void) {
          gl_Position = uProjectionMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);
          gl_PointSize = aPointSize;
    
          // Calculate distance from camera to particle for fog effect
          float distanceToCamera = distance(aVertexPosition, uCameraPosition);
    
          // Calculate fog factor (0 = fully visible, 1 = fully hidden)
          float fogFactor = clamp(
            (distanceToCamera - uFogStart) / (uFogEnd - uFogStart),
            0.0, 1.0
          );
    
          // Apply fog to the alpha component
          vColor = vec4(aColor.rgb, aColor.a * (1.0 - fogFactor));
        }
      `;
      // Fragment shader for particles.
      const fsSourceParticles = `
        precision mediump float;
        varying vec4 vColor;
        void main(void) {
          // Create circular points with soft edge glow.
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          float alpha = vColor.a * exp(-dist * 3.5);
    
          if(dist > 0.5) {
            discard;
          }
    
          gl_FragColor = vec4(vColor.rgb, alpha);
        }
      `;
      this.particleShaderProgram = this.initShaderProgram(vsSourceParticles, fsSourceParticles);
      // Lookup attribute and uniform locations.
      this.particleShaderProgram.aVertexPosition = gl.getAttribLocation(this.particleShaderProgram, 'aVertexPosition');
      this.particleShaderProgram.aPointSize = gl.getAttribLocation(this.particleShaderProgram, 'aPointSize');
      this.particleShaderProgram.aColor = gl.getAttribLocation(this.particleShaderProgram, 'aColor');
      this.particleShaderProgram.uProjectionMatrix = gl.getUniformLocation(this.particleShaderProgram, 'uProjectionMatrix');
      this.particleShaderProgram.uViewMatrix = gl.getUniformLocation(this.particleShaderProgram, 'uViewMatrix');
      this.particleShaderProgram.uCameraPosition = gl.getUniformLocation(this.particleShaderProgram, 'uCameraPosition');
      this.particleShaderProgram.uFogStart = gl.getUniformLocation(this.particleShaderProgram, 'uFogStart');
      this.particleShaderProgram.uFogEnd = gl.getUniformLocation(this.particleShaderProgram, 'uFogEnd');
    
      // Vertex shader for connection lines.
      const vsSourceLines = `
        attribute vec3 aVertexPosition;
        attribute vec4 aColor;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform vec3 uCameraPosition;
        uniform float uFogStart;
        uniform float uFogEnd;
        varying vec4 vColor;
    
        void main(void) {
          gl_Position = uProjectionMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);
          float distanceToCamera = distance(aVertexPosition, uCameraPosition);
          float fogFactor = clamp(
            (distanceToCamera - uFogStart) / (uFogEnd - uFogStart),
            0.0, 1.0
          );
          vColor = vec4(aColor.rgb, aColor.a * (1.0 - fogFactor));
        }
      `;
      // Fragment shader for connection lines.
      const fsSourceLines = `
        precision mediump float;
        varying vec4 vColor;
        void main(void) {
          gl_FragColor = vColor;
        }
      `;
      this.lineShaderProgram = this.initShaderProgram(vsSourceLines, fsSourceLines);
      this.lineShaderProgram.aVertexPosition = gl.getAttribLocation(this.lineShaderProgram, 'aVertexPosition');
      this.lineShaderProgram.aColor = gl.getAttribLocation(this.lineShaderProgram, 'aColor');
      this.lineShaderProgram.uProjectionMatrix = gl.getUniformLocation(this.lineShaderProgram, 'uProjectionMatrix');
      this.lineShaderProgram.uViewMatrix = gl.getUniformLocation(this.lineShaderProgram, 'uViewMatrix');
      this.lineShaderProgram.uCameraPosition = gl.getUniformLocation(this.lineShaderProgram, 'uCameraPosition');
      this.lineShaderProgram.uFogStart = gl.getUniformLocation(this.lineShaderProgram, 'uFogStart');
      this.lineShaderProgram.uFogEnd = gl.getUniformLocation(this.lineShaderProgram, 'uFogEnd');
    }
    
    initShaderProgram(vsSource, fsSource) {
      const gl = this.gl;
      const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource);
      const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource);
    
      const shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);
    
      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Shader program failed to link: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
      }
      return shaderProgram;
    }
    
    loadShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
    
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
    
    initBuffers() {
      const gl = this.gl;
      // Allocate a static buffer for particle data (dynamic draw, maximum size based on particle count).
      this.particleBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this._maxParticles * 8 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
      // Allocate a buffer for connection lines. We start with an initial maximum.
      this.lineBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this._maxConnections * 14 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    }
    
    clear() {
      const gl = this.gl;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      // Use BACKGROUND_COLOR from config (e.g., "#111" → 0.07, 0.07, 0.07)
      gl.clearColor(0.07, 0.07, 0.07, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    
    /**
     * Draw the particles using preallocated arrays and bufferSubData.
     * @param {Array} particles - Array of Particle objects.
     * @param {Camera} camera - Camera object providing projection and view matrices.
     * @param {number} [velocityFactor=0] - Additional velocity factor for chromatic effects.
     */
    drawParticles(particles, camera, velocityFactor = 0) {
      const gl = this.gl;
      const projectionMatrix = camera.getProjectionMatrix();
      const viewMatrix = camera.getViewMatrix();
      const centerX = this.canvas.width * 0.5;
      const centerY = this.canvas.height * 0.5;
      const maxDimension = Math.max(this.canvas.width, this.canvas.height);
    
      const screenR = camera.getScreenRightVector();
    
      // Use our preallocated arrays.
      const glowArr = this._glowArray;
      const redArr = this._redArray;
      const blueArr = this._blueArray;
      const whiteArr = this._whiteArray;
    
      let glowCount = 0, redCount = 0, blueCount = 0, whiteCount = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.screen) continue;
    
        // Calculate offset without rounding for speed.
        const offset = this.calculateChromaticOffset(p, screenR, velocityFactor, centerX, centerY, maxDimension);
        const size = p.size * 1.15 * p.screen.scale;
    
        // Glow layer – 8 floats.
        glowArr[glowCount++] = p.x;
        glowArr[glowCount++] = p.y;
        glowArr[glowCount++] = p.z;
        glowArr[glowCount++] = size * 1.7;
        glowArr[glowCount++] = 1.0; // r
        glowArr[glowCount++] = 1.0; // g
        glowArr[glowCount++] = 1.0; // b
        glowArr[glowCount++] = p.opacity * 0.3;
    
        // Red channel (shifted left)
        redArr[redCount++] = p.x - offset.x;
        redArr[redCount++] = p.y - offset.y;
        redArr[redCount++] = p.z;
        redArr[redCount++] = size * 0.8;
        redArr[redCount++] = 1.0;
        redArr[redCount++] = 0.0;
        redArr[redCount++] = 0.0;
        redArr[redCount++] = p.opacity * this.config.CHROMATIC_STRENGTH;
    
        // Blue channel (shifted right)
        blueArr[blueCount++] = p.x + offset.x;
        blueArr[blueCount++] = p.y + offset.y;
        blueArr[blueCount++] = p.z;
        blueArr[blueCount++] = size * 0.8;
        blueArr[blueCount++] = 0.0;
        blueArr[blueCount++] = 1.0;
        blueArr[blueCount++] = 1.0;
        blueArr[blueCount++] = p.opacity * this.config.CHROMATIC_STRENGTH;
    
        // White center
        whiteArr[whiteCount++] = p.x;
        whiteArr[whiteCount++] = p.y;
        whiteArr[whiteCount++] = p.z;
        whiteArr[whiteCount++] = size;
        whiteArr[whiteCount++] = 1.0;
        whiteArr[whiteCount++] = 1.0;
        whiteArr[whiteCount++] = 1.0;
        whiteArr[whiteCount++] = p.opacity;
      }
    
      gl.useProgram(this.particleShaderProgram);
      gl.uniformMatrix4fv(this.particleShaderProgram.uProjectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(this.particleShaderProgram.uViewMatrix, false, viewMatrix);
      gl.uniform3fv(this.particleShaderProgram.uCameraPosition, new Float32Array([camera.position.x, camera.position.y, camera.position.z]));
      gl.uniform1f(this.particleShaderProgram.uFogStart, this.config.FOG_START);
      gl.uniform1f(this.particleShaderProgram.uFogEnd, this.config.FOG_END);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
      // Bind particle buffer and update via bufferSubData.
      // Glow layer
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, glowArr.subarray(0, glowCount));
      gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
      gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
      gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
      gl.drawArrays(gl.POINTS, 0, glowCount / 8);
    
      // Red channel
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, redArr.subarray(0, redCount));
      gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
      gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
      gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
      gl.drawArrays(gl.POINTS, 0, redCount / 8);
    
      // Blue channel
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, blueArr.subarray(0, blueCount));
      gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
      gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
      gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
      gl.drawArrays(gl.POINTS, 0, blueCount / 8);
    
      // White channel
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, whiteArr.subarray(0, whiteCount));
      gl.vertexAttribPointer(this.particleShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 32, 0);
      gl.vertexAttribPointer(this.particleShaderProgram.aPointSize, 1, gl.FLOAT, false, 32, 12);
      gl.vertexAttribPointer(this.particleShaderProgram.aColor, 4, gl.FLOAT, false, 32, 16);
      gl.enableVertexAttribArray(this.particleShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.particleShaderProgram.aPointSize);
      gl.enableVertexAttribArray(this.particleShaderProgram.aColor);
      gl.drawArrays(gl.POINTS, 0, whiteCount / 8);
    }
    
    /**
     * Draw connection lines between particles.
     * @param {Array} connections - Array of connection objects { p1, p2 }.
     * @param {Camera} camera - The camera object.
     * @param {number} [velocityFactor=0] - Additional velocity factor for chromatic effects.
     */
    drawConnections(connections, camera, velocityFactor = 0) {
      const gl = this.gl;
      if (connections.length === 0) return;
    
      const projectionMatrix = camera.getProjectionMatrix();
      const viewMatrix = camera.getViewMatrix();
      const centerX = this.canvas.width * 0.5;
      const centerY = this.canvas.height * 0.5;
      const maxDimension = Math.max(this.canvas.width, this.canvas.height);
      const screenR = camera.getScreenRightVector();
    
      // Reallocate connection arrays if necessary.
      if (connections.length > this._maxConnections) {
        this._maxConnections = connections.length;
        this._redLineArray = new Float32Array(this._maxConnections * 14);
        this._blueLineArray = new Float32Array(this._maxConnections * 14);
        this._whiteLineArray = new Float32Array(this._maxConnections * 14);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._maxConnections * 14 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
      }
    
      const redLineArr = this._redLineArray;
      const blueLineArr = this._blueLineArray;
      const whiteLineArr = this._whiteLineArray;
      let rIdx = 0, bIdx = 0, wIdx = 0;
    
      for (let conn of connections) {
        const p1 = conn.p1;
        const p2 = conn.p2;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const avgOpacity = (p1.opacity + p2.opacity) / 2 || 1.0;
        const connectionOpacity = (1 - distance / this.config.CONNECTION_DISTANCE) * avgOpacity;
    
        // Calculate chromatic offsets.
        const offset1 = this.calculateChromaticOffset(p1, screenR, velocityFactor, centerX, centerY, maxDimension);
        const offset2 = this.calculateChromaticOffset(p2, screenR, velocityFactor, centerX, centerY, maxDimension);
    
        // Red channel – first vertex.
        redLineArr[rIdx++] = p1.x - offset1.x;
        redLineArr[rIdx++] = p1.y - offset1.y;
        redLineArr[rIdx++] = p1.z;
        redLineArr[rIdx++] = 1.0; // r
        redLineArr[rIdx++] = 0.0; // g
        redLineArr[rIdx++] = 0.0; // b
        redLineArr[rIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
        // Second vertex.
        redLineArr[rIdx++] = p2.x - offset2.x;
        redLineArr[rIdx++] = p2.y - offset2.y;
        redLineArr[rIdx++] = p2.z;
        redLineArr[rIdx++] = 1.0;
        redLineArr[rIdx++] = 0.0;
        redLineArr[rIdx++] = 0.0;
        redLineArr[rIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
    
        // Blue channel – first vertex.
        blueLineArr[bIdx++] = p1.x + offset1.x;
        blueLineArr[bIdx++] = p1.y + offset1.y;
        blueLineArr[bIdx++] = p1.z;
        blueLineArr[bIdx++] = 0.0;
        blueLineArr[bIdx++] = 1.0;
        blueLineArr[bIdx++] = 1.0;
        blueLineArr[bIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
        // Second vertex.
        blueLineArr[bIdx++] = p2.x + offset2.x;
        blueLineArr[bIdx++] = p2.y + offset2.y;
        blueLineArr[bIdx++] = p2.z;
        blueLineArr[bIdx++] = 0.0;
        blueLineArr[bIdx++] = 1.0;
        blueLineArr[bIdx++] = 1.0;
        blueLineArr[bIdx++] = connectionOpacity * this.config.CHROMATIC_STRENGTH;
    
        // White channel – first vertex.
        whiteLineArr[wIdx++] = p1.x;
        whiteLineArr[wIdx++] = p1.y;
        whiteLineArr[wIdx++] = p1.z;
        whiteLineArr[wIdx++] = 1.0;
        whiteLineArr[wIdx++] = 1.0;
        whiteLineArr[wIdx++] = 1.0;
        whiteLineArr[wIdx++] = connectionOpacity;
        // Second vertex.
        whiteLineArr[wIdx++] = p2.x;
        whiteLineArr[wIdx++] = p2.y;
        whiteLineArr[wIdx++] = p2.z;
        whiteLineArr[wIdx++] = 1.0;
        whiteLineArr[wIdx++] = 1.0;
        whiteLineArr[wIdx++] = 1.0;
        whiteLineArr[wIdx++] = connectionOpacity;
      }
    
      gl.useProgram(this.lineShaderProgram);
      gl.uniformMatrix4fv(this.lineShaderProgram.uProjectionMatrix, false, projectionMatrix);
      gl.uniformMatrix4fv(this.lineShaderProgram.uViewMatrix, false, viewMatrix);
      gl.uniform3fv(this.lineShaderProgram.uCameraPosition, new Float32Array([camera.position.x, camera.position.y, camera.position.z]));
      gl.uniform1f(this.lineShaderProgram.uFogStart, this.config.FOG_START);
      gl.uniform1f(this.lineShaderProgram.uFogEnd, this.config.FOG_END);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
      // Draw red channel.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, redLineArr.subarray(0, rIdx));
      gl.vertexAttribPointer(this.lineShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(this.lineShaderProgram.aColor, 4, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(this.lineShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.lineShaderProgram.aColor);
      gl.drawArrays(gl.LINES, 0, rIdx / 7);
    
      // Draw blue channel.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, blueLineArr.subarray(0, bIdx));
      gl.vertexAttribPointer(this.lineShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(this.lineShaderProgram.aColor, 4, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(this.lineShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.lineShaderProgram.aColor);
      gl.drawArrays(gl.LINES, 0, bIdx / 7);
    
      // Draw white channel.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, whiteLineArr.subarray(0, wIdx));
      gl.vertexAttribPointer(this.lineShaderProgram.aVertexPosition, 3, gl.FLOAT, false, 28, 0);
      gl.vertexAttribPointer(this.lineShaderProgram.aColor, 4, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(this.lineShaderProgram.aVertexPosition);
      gl.enableVertexAttribArray(this.lineShaderProgram.aColor);
      gl.drawArrays(gl.LINES, 0, wIdx / 7);
    }
    
    /**
     * Calculate the chromatic aberration offset.
     * Uses fewer Math.round calls for performance.
     * @param {Object} particle - The particle (which must have a screen property).
     * @param {Object} screenR - Screen-space right vector.
     * @param {number} velocityFactor - Additional velocity factor.
     * @param {number} centerX - Cached canvas center X.
     * @param {number} centerY - Cached canvas center Y.
     * @param {number} maxDimension - Largest canvas dimension.
     * @returns {Object} - Object with offset { x, y }.
     */
    calculateChromaticOffset(particle, screenR, velocityFactor, centerX, centerY, maxDimension) {
      // Return default offset if particle.screen is null (particle behind camera)
      if (!particle.screen) {
        return { x: 0, y: 0 };
      }
      
      const x = particle.screen.x;
      const y = particle.screen.y;
      const dx = x - centerX;
      const dy = y - centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy) / maxDimension;
      const distanceOffset = distanceFromCenter * this.config.CHROMATIC_DISTANCE_FACTOR;
      const velocityOffset = velocityFactor * this.config.CHROMATIC_VELOCITY_FACTOR;
      const totalOffset = this.config.CHROMATIC_OFFSET * (1 + distanceOffset + velocityOffset);
      return { x: screenR.x * totalOffset, y: screenR.y * totalOffset };
    }
  }
    
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLRenderer;
  } else {
    window.WebGLRenderer = WebGLRenderer;
  }