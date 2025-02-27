class Matrix4 {
    // Return a 4x4 perspective projection matrix.
    // fov should be in radians.
    static perspective(fov, aspect, near, far) {
      const f = 1.0 / Math.tan(fov / 2);
      const nf = 1 / (near - far);
      return new Float32Array([
        f / aspect, 0,                          0,  0,
        0,          f,                          0,  0,
        0,          0,    (far + near) * nf,     -1,
        0,          0,  (2 * far * near) * nf,     0
      ]);
    }
  
    // Return a simple lookAt matrix given eye, center, and up vectors.
    static lookAt(eye, center, up) {
      const fx = center.x - eye.x,
            fy = center.y - eye.y,
            fz = center.z - eye.z;
      // normalize f
      const rlf = 1.0 / Math.hypot(fx, fy, fz);
      const f_n = { x: fx * rlf, y: fy * rlf, z: fz * rlf };
  
      // s = f x up (normalize later)
      const sx = f_n.y * up.z - f_n.z * up.y;
      const sy = f_n.z * up.x - f_n.x * up.z;
      const sz = f_n.x * up.y - f_n.y * up.x;
      const rls = 1.0 / Math.hypot(sx, sy, sz);
      const s = { x: sx * rls, y: sy * rls, z: sz * rls };
  
      // u = s x f
      const ux = s.y * f_n.z - s.z * f_n.y;
      const uy = s.z * f_n.x - s.x * f_n.z;
      const uz = s.x * f_n.y - s.y * f_n.x;
  
      return new Float32Array([
        s.x,  ux,  -f_n.x, 0,
        s.y,  uy,  -f_n.y, 0,
        s.z,  uz,  -f_n.z, 0,
        -(s.x * eye.x + s.y * eye.y + s.z * eye.z),
        -(ux * eye.x + uy * eye.y + uz * eye.z),
         f_n.x * eye.x + f_n.y * eye.y + f_n.z * eye.z,
        1
      ]);
    }
  }

export default Matrix4;